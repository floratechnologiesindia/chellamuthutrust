import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/integrations/supabase/client';

export type RecurringDonationStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

export function useDonationPaymentHistory(donationId: string | null) {
  return useQuery({
    queryKey: ['donation-payment-history', donationId],
    enabled: Boolean(donationId),
    queryFn: async () => {
      const res = await apiFetch(`/api/donations/${donationId}/payment-history`);
      if (!res.ok) throw new Error('Failed to load payment history');
      return res.json();
    },
  });
}

export function useUpdateRecurringDonationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      donationId,
      status,
    }: {
      donationId: string;
      status: RecurringDonationStatus;
    }) => {
      const res = await apiFetch(`/api/donations/${donationId}/recurring-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update recurring donation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-donations'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
    },
  });
}

export function useSendKindDonationThankYou() {
  return useMutation({
    mutationFn: async ({ kindDonationId, force }: { kindDonationId: string; force?: boolean }) => {
      const res = await apiFetch(`/api/kind-donations/${kindDonationId}/send-thank-you`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: force === true }),
      });
      if (!res.ok) throw new Error('Failed to send thank-you letter');
      return res.json();
    },
  });
}

export function useSendOccasionReminder() {
  return useMutation({
    mutationFn: async ({ slotId, force }: { slotId: string; force?: boolean }) => {
      const res = await apiFetch(`/api/food-slots/${slotId}/send-occasion-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: force === true }),
      });
      if (!res.ok) throw new Error('Failed to send occasion reminder');
      return res.json();
    },
  });
}
