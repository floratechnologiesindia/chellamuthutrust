import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearBlockingOverlays } from '@/lib/razorpayCheckout';
import { formatRazorpayContact } from '@/lib/razorpayContact';
import { getRazorpayDonorEmail } from '@/lib/donorEmail';
import { reportDonorPaymentFailed } from '@/lib/donorNotifications';
import { FoodTimeSlot } from '@/hooks/useFoodSlots';

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

export interface FoodSlotPaymentContext {
  food_slot_id?: string;
  home_id: string;
  trust_id: string;
  date: string;
  time_slot: FoodTimeSlot | string;
  occasion_type?: string;
  occasion_note?: string;
  recurring_frequency?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
  meal_type?: string;
  reason?: string;
  sponsor_for?: string;
  donate_on_behalf_of?: string;
  include_refreshment?: boolean;
}

interface PaymentParams {
  amount: number;
  donationId?: string;
  foodSlot?: FoodSlotPaymentContext;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const invalidateAfterPayment = (foodSlot?: FoodSlotPaymentContext) => {
    queryClient.invalidateQueries({ queryKey: ['donations'] });
    queryClient.invalidateQueries({ queryKey: ['donation-payments'] });
    if (foodSlot) {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['donor-food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slot-booking-requests'] });
    }
  };

  const initiatePayment = async ({
    amount,
    donationId,
    foodSlot,
    donorName,
    donorEmail,
    donorPhone,
    description,
    onSuccess,
    onFailure,
  }: PaymentParams) => {
    setIsProcessing(true);

    let checkoutOpened = false;
    let paymentResolved = false;

    const handlePaymentFailure = (message: string) => {
      void reportDonorPaymentFailed(description || message, amount);
      onFailure?.(message);
    };

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount,
            donation_id: donationId,
            donor_name: donorName,
            donor_email: donorEmail,
            donor_phone: donorPhone,
            food_slot_id: foodSlot?.food_slot_id,
            home_id: foodSlot?.home_id,
            trust_id: foodSlot?.trust_id,
            date: foodSlot?.date,
            time_slot: foodSlot?.time_slot,
            occasion_type: foodSlot?.occasion_type,
            occasion_note: foodSlot?.occasion_note,
            recurring_frequency: foodSlot?.recurring_frequency,
            donation_for: foodSlot?.donation_for,
            event_date: foodSlot?.event_date,
            donor_board_name: foodSlot?.donor_board_name,
            meal_type: foodSlot?.meal_type,
            reason: foodSlot?.reason,
            sponsor_for: foodSlot?.sponsor_for,
            donate_on_behalf_of: foodSlot?.donate_on_behalf_of,
            include_refreshment: foodSlot?.include_refreshment ? 'true' : '',
          },
        },
      );

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || orderData?.error || 'Failed to create order');
      }

      const checkoutName = orderData.donor_name || donorName;
      const checkoutEmail = getRazorpayDonorEmail(orderData.donor_email || donorEmail);
      const checkoutPhone = formatRazorpayContact(orderData.donor_phone || donorPhone);

      const Razorpay = window.Razorpay as RazorpayConstructor | undefined;
      if (!Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MS Chellamuthu Trust',
        description: description || (foodSlot ? 'Food Sponsorship' : 'Donation Payment'),
        order_id: orderData.order_id,
        prefill: {
          name: checkoutName,
          ...(checkoutEmail ? { email: checkoutEmail } : {}),
          ...(checkoutPhone ? { contact: checkoutPhone } : {}),
        },
        theme: {
          color: '#ff6633',
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          paymentResolved = true;
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  donation_id: donationId,
                  amount: orderData.amount,
                  payment_date: new Date().toISOString().split('T')[0],
                  food_slot_id: foodSlot?.food_slot_id,
                  home_id: foodSlot?.home_id,
                  trust_id: foodSlot?.trust_id,
                  date: foodSlot?.date,
                  time_slot: foodSlot?.time_slot,
                  food_slot_amount: amount,
                  occasion_type: foodSlot?.occasion_type,
                  occasion_note: foodSlot?.occasion_note,
                  recurring_frequency: foodSlot?.recurring_frequency,
                  donation_for: foodSlot?.donation_for,
                  event_date: foodSlot?.event_date,
                  donor_board_name: foodSlot?.donor_board_name,
                  meal_type: foodSlot?.meal_type,
                  reason: foodSlot?.reason,
                  sponsor_for: foodSlot?.sponsor_for,
                  donate_on_behalf_of: foodSlot?.donate_on_behalf_of,
                  include_refreshment: foodSlot?.include_refreshment ? 'true' : '',
                },
              },
            );

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || verifyData?.error || 'Verification failed');
            }

            invalidateAfterPayment(foodSlot);
            onSuccess?.(response.razorpay_payment_id);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Payment verification failed';
            handlePaymentFailure(message);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            if (!checkoutOpened || paymentResolved) return;
            handlePaymentFailure('Payment cancelled by user');
          },
          escape: true,
          backdropclose: false,
        },
      };

      clearBlockingOverlays();

      const razorpay = new Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        paymentResolved = true;
        setIsProcessing(false);
        handlePaymentFailure(response.error?.description || 'Payment failed');
      });
      razorpay.open();
      checkoutOpened = true;
    } catch (err: unknown) {
      setIsProcessing(false);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      handlePaymentFailure(message);
    }
  };

  return { initiatePayment, isProcessing };
}
