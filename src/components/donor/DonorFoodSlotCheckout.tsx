import { useState } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { DonorOtpAuth } from '@/components/donor/DonorOtpAuth';
import { DonorManualPayment, DonorPaymentStatus } from '@/components/donor/DonorManualPayment';
import { DonorRazorpayPayment } from '@/components/donor/DonorRazorpayPayment';
import {
  DonorFoodDonationDetailsForm,
  type FoodDonationDetails,
} from '@/components/donor/DonorFoodDonationDetailsForm';
import { DonorFoodDonationPreview } from '@/components/donor/DonorFoodDonationPreview';
import { useManualFoodSlotPayment } from '@/hooks/useManualPayment';
import { useFoodSlotPricingMap } from '@/hooks/useFoodSlotPricing';
import { useDonor } from '@/hooks/useDonors';
import { useAuth } from '@/contexts/AuthContext';
import { FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';
import { isSlotOpen } from '@/lib/foodSlotUtils';
import { isManualPaymentsEnabled, isRazorpayEnabled } from '@/lib/manualPayments';
import type { FoodSlotRazorpayPayRequest } from '@/lib/foodSlotRazorpay';
import { invalidateDonorNotifications } from '@/hooks/useNotifications';
import { getRazorpayDonorEmail } from '@/lib/donorEmail';
import { apiFetch } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CheckoutStep = 'otp' | 'details' | 'preview' | 'payment' | 'success' | 'failure';

interface DonorFoodSlotCheckoutProps {
  date: Date;
  timeSlot: FoodTimeSlot;
  existingSlot: FoodSlot | null;
  homeId: string;
  trustId: string;
  homeName: string;
  slotLabel: string;
  donorId?: string;
  onFinished?: () => void;
  /** Opens Razorpay from parent (outside dialog) to avoid overlay blocking clicks. */
  onRazorpayPay?: (request: FoodSlotRazorpayPayRequest) => void;
  razorpayProcessing?: boolean;
}

function buildOccasionNote(details: FoodDonationDetails): string {
  const parts: string[] = [];
  if (details.donation_for) parts.push(`For: ${details.donation_for}`);
  if (details.event_date) parts.push(`Event date: ${details.event_date}`);
  if (details.occasion_note) parts.push(details.occasion_note);
  return parts.join(' · ');
}

export const DonorFoodSlotCheckout = ({
  date,
  timeSlot,
  existingSlot,
  homeId,
  trustId,
  homeName,
  slotLabel,
  donorId,
  onFinished,
  onRazorpayPay,
  razorpayProcessing = false,
}: DonorFoodSlotCheckoutProps) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { priceMap } = useFoodSlotPricingMap();
  const manualPayment = useManualFoodSlotPayment();

  const [step, setStep] = useState<CheckoutStep>(() => (!donorId ? 'otp' : 'details'));
  const [activeDonorId, setActiveDonorId] = useState<string | undefined>(donorId);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [isNewDonor, setIsNewDonor] = useState(false);
  const [donationDetails, setDonationDetails] = useState<FoodDonationDetails | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const profileId = activeDonorId || user?.id;
  const { data: donorProfile } = useDonor(profileId);

  const amount = existingSlot?.amount ?? priceMap[timeSlot] ?? 75;
  const dateStr = format(date, 'yyyy-MM-dd');
  const summary = `${slotLabel} on ${format(date, 'dd MMM yyyy')} · ${homeName}`;
  const slotOpen = !existingSlot || isSlotOpen(existingSlot.status);

  const donorName = donationDetails?.name || user?.name || 'Donor';
  const donorEmail = getRazorpayDonorEmail(user?.email);
  const donorPhone = donationDetails?.phone || user?.phone || verifiedPhone;
  const isExistingDonor = Boolean(!isNewDonor && isAuthenticated && (donorProfile || user));

  const initialDonationDetails: Partial<FoodDonationDetails> = {
    name: isNewDonor ? '' : donorProfile?.name || user?.name || '',
    phone: donorProfile?.phone || user?.phone || verifiedPhone || '',
    pan_number: donorProfile?.pan_number || '',
    address: donorProfile?.address || '',
    occasion_type: 'birthday',
    occasion_note: '',
    donation_for: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    recurring_frequency: 'one_time',
  };

  const recurringFrequencyForApi =
    donationDetails?.recurring_frequency && donationDetails.recurring_frequency !== 'one_time'
      ? donationDetails.recurring_frequency
      : undefined;

  const paymentPayload = {
    food_slot_id: existingSlot?.id,
    home_id: homeId,
    trust_id: trustId,
    date: dateStr,
    time_slot: timeSlot,
    amount,
    occasion_type: donationDetails?.occasion_type,
    occasion_note: donationDetails ? buildOccasionNote(donationDetails) : undefined,
    recurring_frequency: recurringFrequencyForApi,
    donation_for: donationDetails?.donation_for,
    event_date: donationDetails?.event_date,
  };

  const refreshFoodSlots = async () => {
    await queryClient.invalidateQueries({ queryKey: ['food-slots'] });
    await queryClient.invalidateQueries({ queryKey: ['donor-food-slots'] });
    await queryClient.invalidateQueries({ queryKey: ['food-recurring-pledges'] });
    await queryClient.refetchQueries({ queryKey: ['food-slots'] });
    await invalidateDonorNotifications(queryClient);
  };

  const handleOtpVerified = (userId?: string, phone?: string, newUser?: boolean) => {
    if (!userId) return;
    if (phone) setVerifiedPhone(phone);
    setIsNewDonor(Boolean(newUser));
    setActiveDonorId(userId);
    setStep('details');
  };

  const saveDonationDetails = async (details: FoodDonationDetails) => {
    const donorUserId = activeDonorId || user?.id;
    if (!donorUserId) {
      toast.error('Please verify your phone number first');
      return;
    }

    setSavingDetails(true);
    try {
      const res = await apiFetch(`/api/profiles/${donorUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: details.name,
          pan_number: details.pan_number,
          address: details.address,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save donation details');
      }
      setDonationDetails(details);
      setStep('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save donation details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleManualPaymentSuccess = async () => {
    try {
      await manualPayment.mutateAsync(paymentPayload);
      await refreshFoodSlots();
      setStep('success');
    } catch {
      setStep('failure');
    }
  };

  const handleRazorpayPay = () => {
    if (!onRazorpayPay || !donationDetails) return;
    onRazorpayPay({
      amount,
      food_slot_id: existingSlot?.id,
      home_id: homeId,
      trust_id: trustId,
      date: dateStr,
      time_slot: timeSlot,
      donorName,
      donorEmail,
      donorPhone,
      slotLabel,
      homeName,
      occasion_type: donationDetails.occasion_type,
      occasion_note: buildOccasionNote(donationDetails),
      pan_number: donationDetails.pan_number,
      address: donationDetails.address,
      recurring_frequency: recurringFrequencyForApi,
      donation_for: donationDetails.donation_for,
      event_date: donationDetails.event_date,
    });
  };

  const handleClose = () => onFinished?.();

  if (!slotOpen) {
    return (
      <p className="text-sm text-center py-4" style={{ color: '#666' }}>
        This slot is already booked.
      </p>
    );
  }

  if (step === 'success') {
    return (
      <DonorPaymentStatus
        variant="modal"
        status="success"
        title="Meal Sponsored!"
        message={
          donationDetails?.recurring_frequency && donationDetails.recurring_frequency !== 'one_time'
            ? `Thank you! Your ${slotLabel.toLowerCase()} sponsorship for ${homeName} is confirmed, and a ${donationDetails.recurring_frequency} pledge is active.`
            : `Thank you! Your ${slotLabel.toLowerCase()} sponsorship for ${homeName} is confirmed.`
        }
        amount={amount}
        onClose={handleClose}
      />
    );
  }

  if (step === 'failure') {
    return (
      <DonorPaymentStatus
        variant="modal"
        status="failure"
        title="Payment Not Completed"
        message="Payment was not completed. The slot remains open — you can try again."
        amount={amount}
        onRetry={() => setStep('payment')}
        onClose={handleClose}
      />
    );
  }

  if (step === 'otp') {
    return (
      <DonorOtpAuth
        onVerified={handleOtpVerified}
        submitLabel="Send OTP & Continue"
        phoneOnly
      />
    );
  }

  if (step === 'details') {
    return (
      <DonorFoodDonationDetailsForm
        key={`${profileId || 'guest'}-${donorProfile ? 'ready' : 'pending'}-${verifiedPhone}-${isNewDonor}`}
        initialValues={initialDonationDetails}
        onSubmit={saveDonationDetails}
        isSubmitting={savingDetails}
        isExistingDonor={isExistingDonor}
      />
    );
  }

  if (step === 'preview' && donationDetails) {
    return (
      <DonorFoodDonationPreview
        details={donationDetails}
        homeName={homeName}
        slotLabel={slotLabel}
        timeSlot={timeSlot}
        date={date}
        amount={amount}
        onBack={() => setStep('details')}
        onConfirm={() => setStep('payment')}
      />
    );
  }

  if (step === 'payment') {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setStep('preview')}
          className="text-sm underline"
          style={{ color: '#666' }}
        >
          ← Back to preview
        </button>
        {isRazorpayEnabled() && onRazorpayPay ? (
          <DonorRazorpayPayment
            amount={amount}
            summary={summary}
            onPay={handleRazorpayPay}
            isProcessing={razorpayProcessing}
          />
        ) : isManualPaymentsEnabled() ? (
          <DonorManualPayment
            amount={amount}
            summary={summary}
            isProcessing={manualPayment.isPending}
            onSuccess={handleManualPaymentSuccess}
            onFailure={() => setStep('failure')}
          />
        ) : (
          <p className="text-sm text-center py-4" style={{ color: '#666' }}>
            Online payment is not configured. Please contact the trust office.
          </p>
        )}
      </div>
    );
  }

  return null;
};
