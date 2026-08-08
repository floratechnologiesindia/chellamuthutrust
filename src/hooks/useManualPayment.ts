import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useManualDonationPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (donationId: string) => {
      const res = await apiFetch('/api/manual/complete-donation', {
        method: 'POST',
        body: JSON.stringify({ donation_id: donationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['donation-payments'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export interface ManualFoodSlotPaymentInput {
  food_slot_id?: string;
  home_id: string;
  trust_id: string;
  date: string;
  time_slot: string;
  amount: number;
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

export function useManualFoodSlotPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualFoodSlotPaymentInput) => {
      const res = await apiFetch('/api/manual/complete-food-slot', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slot'] });
      queryClient.invalidateQueries({ queryKey: ['donor-food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slot-booking-requests'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
