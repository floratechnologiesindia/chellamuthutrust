import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invalidateDonorNotifications } from '@/hooks/useNotifications';
import { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';

export interface FoodSlotBookingRequest {
  id: string;
  home_id: string;
  trust_id: string;
  food_slot_id?: string;
  date: string;
  time_slot: string;
  donor_id: string;
  donor_name?: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  home_name?: string;
  created_at: string;
}

export function useDonorFoodSlotBookingRequests(donorId: string | null | undefined) {
  return useQuery({
    queryKey: ['food-slot-booking-requests', 'donor', donorId],
    queryFn: async () => {
      const res = await apiFetch('/api/food-slot-booking-requests');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load booking requests');
      return data as FoodSlotBookingRequest[];
    },
    enabled: !!donorId,
  });
}

export function useFoodSlotBookingRequests(filters?: {
  home_id?: string;
  trust_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['food-slot-booking-requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.home_id) params.set('home_id', filters.home_id);
      if (filters?.trust_id) params.set('trust_id', filters.trust_id);
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      const res = await apiFetch(`/api/food-slot-booking-requests${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load booking requests');
      return data as FoodSlotBookingRequest[];
    },
    enabled: !!filters,
  });
}

export function useCreateFoodSlotBookingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      home_id: string;
      trust_id: string;
      date: string;
      time_slot: string;
      amount: number;
      food_slot_id?: string;
      notes?: string;
    }) => {
      const res = await apiFetch('/api/food-slot-booking-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit booking request');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slot-booking-requests'] });
      void invalidateDonorNotifications(queryClient);
      toast.success('Booking request sent to the home team');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useConfirmFoodSlotBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slotId,
      requestId,
      payment_status,
      amount_paid,
      payment_mode,
    }: {
      slotId?: string;
      requestId?: string;
      payment_status: FoodSlotPaymentStatus;
      amount_paid?: number;
      payment_mode?: string;
    }) => {
      const url = requestId
        ? `/api/food-slot-booking-requests/${requestId}/confirm`
        : `/api/food-slots/${slotId}/confirm-booking`;
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({ payment_status, amount_paid, payment_mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm booking');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slot-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['donor-food-slots'] });
      toast.success('Booking confirmed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
