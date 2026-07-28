import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FoodRecurringPledgeStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type FoodRecurringFrequencyApi = 'monthly' | 'annual';

export interface FoodRecurringPledge {
  id: string;
  donor_id: string;
  donor_name?: string;
  home_id: string;
  trust_id: string;
  time_slot: string;
  amount: number;
  frequency: FoodRecurringFrequencyApi;
  day_of_month: number;
  start_date: string;
  next_due_date: string;
  last_paid_date?: string;
  status: FoodRecurringPledgeStatus;
  first_food_slot_id?: string;
  occasion_type?: string;
  occasion_note?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
  created_at?: string;
  homes?: { id: string; name: string; city?: string } | null;
}

export function useFoodRecurringPledges(donorId?: string | null) {
  return useQuery({
    queryKey: ['food-recurring-pledges', donorId || 'me'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (donorId) params.set('donor_id', donorId);
      const res = await apiFetch(`/api/food-recurring-pledges?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load food recurring pledges');
      return data as FoodRecurringPledge[];
    },
    enabled: donorId !== null,
  });
}

export function useStaffFoodRecurringPledges(homeId?: string | null) {
  return useQuery({
    queryKey: ['food-recurring-pledges-staff', homeId || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', homeId);
      const res = await apiFetch(`/api/food-recurring-pledges?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load food recurring pledges');
      return data as FoodRecurringPledge[];
    },
  });
}

export function useUpdateFoodRecurringPledgeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FoodRecurringPledgeStatus }) => {
      const res = await apiFetch(`/api/food-recurring-pledges/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pledge');
      return data as FoodRecurringPledge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-recurring-pledges'] });
      queryClient.invalidateQueries({ queryKey: ['food-recurring-pledges-staff'] });
      toast.success('Recurring food pledge updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
