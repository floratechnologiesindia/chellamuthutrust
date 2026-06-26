import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentParams {
  amount: number; // in rupees
  donationId?: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const initiatePayment = async ({
    amount,
    donationId,
    donorName,
    donorEmail,
    donorPhone,
    description,
    onSuccess,
    onFailure,
  }: PaymentParams) => {
    setIsProcessing(true);

    try {
      // Step 1: Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount,
            donation_id: donationId,
            donor_name: donorName,
            donor_email: donorEmail,
            donor_phone: donorPhone,
          },
        }
      );

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || orderData?.error || 'Failed to create order');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MS Chellamuthu Trust',
        description: description || 'Donation Payment',
        order_id: orderData.order_id,
        prefill: {
          name: donorName,
          email: donorEmail,
          contact: donorPhone || '',
        },
        theme: {
          color: '#E67E22',
        },
        handler: async (response: any) => {
          try {
            // Step 3: Verify payment
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
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || verifyData?.error || 'Verification failed');
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            queryClient.invalidateQueries({ queryKey: ['donation-payments'] });

            onSuccess?.(response.razorpay_payment_id);
          } catch (err: any) {
            onFailure?.(err.message || 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            onFailure?.('Payment cancelled by user');
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        setIsProcessing(false);
        onFailure?.(response.error?.description || 'Payment failed');
      });
      razorpay.open();
    } catch (err: any) {
      setIsProcessing(false);
      onFailure?.(err.message || 'Something went wrong');
    }
  };

  return { initiatePayment, isProcessing };
}
