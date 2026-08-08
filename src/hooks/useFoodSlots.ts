import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { mergeFoodSlotsByCell, normalizePaymentStatus } from '@/lib/foodSlotUtils';

export type FoodTimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'REFRESHMENTS' | 'OUTSIDE_FOOD';
export type FoodSlotStatus = 'NEED' | 'BOOKED' | 'PAID';
export type FoodSlotPaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULLY_PENDING';
export type PaymentStatus = 'PAID' | 'YET_TO_PAY' | 'PREPAID' | FoodSlotPaymentStatus;

export interface FoodSlot {
  id: string;
  home_id: string;
  trust_id: string;
  date: string;
  time_slot: FoodTimeSlot;
  status: FoodSlotStatus;
  note: string | null;
  max_sponsors_allowed: number;
  current_sponsors_count: number;
  donor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  reason: string | null;
  sponsor_for: string | null;
  amount: number | null;
  payment_status: string | null;
  amount_paid: number | null;
  payment_mode: string | null;
  donation_id?: string | null;
  cheque_number?: string | null;
  bank_name?: string | null;
  cheque_image_url?: string | null;
  cheque_status?: string | null;
  donate_on_behalf_of: string | null;
  meal_type?: string | null;
  report_sent_at?: string | null;
  acknowledgement_sent_at?: string | null;
  payment_reminder_sent_at?: string | null;
  receipt_thankyou_sent_at?: string | null;
  donor_name?: string | null;
  completion_status: string | null;
  completion_notes: string | null;
  completion_photos: string[] | null;
  completion_videos?: string[] | null;
  event_media_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  event_media_submitted_at?: string | null;
  event_media_rejection_notes?: string | null;
  photos_shared_at?: string | null;
}

interface CreateFoodSlotParams {
  home_id: string;
  trust_id: string;
  date: string;
  time_slot: FoodTimeSlot;
  note?: string;
  max_sponsors_allowed?: number;
}

interface UpdateFoodSlotParams {
  id: string;
  status?: FoodSlotStatus;
  note?: string;
  max_sponsors_allowed?: number;
}

// Extended type for food slots with donor info
export interface FoodSlotWithDonor extends FoodSlot {
  profiles?: { name: string; email: string; phone: string | null } | null;
}

function withDonorProfile(slot: FoodSlotWithDonor): FoodSlotWithDonor {
  return {
    ...slot,
    donor_name: slot.donor_name || slot.profiles?.name || null,
  };
}

// Fetch all future booked food slots for a home (for warden help management)
export function useFutureBookedFoodSlots(homeId: string | null) {
  return useQuery({
    queryKey: ['future-booked-food-slots', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('food_slots')
        .select(`
          *,
          profiles!food_slots_donor_id_fkey (name, email, phone)
        `)
        .eq('home_id', homeId)
        .eq('status', 'BOOKED')
        .neq('completion_status', 'COMPLETED')
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) throw error;
      return (data as FoodSlotWithDonor[]).map(withDonorProfile);
    },
    enabled: !!homeId,
  });
}

// Fetch completed food slots for a home (for Received tab)
export function useCompletedFoodSlots(homeId: string | null) {
  return useQuery({
    queryKey: ['completed-food-slots', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      
      const { data, error } = await supabase
        .from('food_slots')
        .select(`
          *,
          profiles!food_slots_donor_id_fkey (name, email, phone)
        `)
        .eq('home_id', homeId)
        .eq('completion_status', 'COMPLETED')
        .order('date', { ascending: false });

      if (error) throw error;
      return (data as FoodSlotWithDonor[]).map(withDonorProfile);
    },
    enabled: !!homeId,
  });
}

/** Past booked meals that still need event media uploaded. */
export function usePastFoodSlotsNeedingMedia(homeId: string | null) {
  return useQuery({
    queryKey: ['past-food-slots-needing-media', homeId],
    queryFn: async () => {
      if (!homeId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('food_slots')
        .select(`
          *,
          profiles!food_slots_donor_id_fkey (name, email, phone)
        `)
        .eq('home_id', homeId)
        .eq('status', 'BOOKED')
        .lt('date', today)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data as FoodSlotWithDonor[])
        .map(withDonorProfile)
        .filter((slot) => {
          if (slot.photos_shared_at) return false;
          if (slot.event_media_status === 'PENDING' || slot.event_media_status === 'APPROVED') {
            return false;
          }
          return true;
        });
    },
    enabled: !!homeId,
  });
}

export function useFoodSlots(homeId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['food-slots', homeId, year, month],
    queryFn: async () => {
      if (!homeId) return [];

      // Match FoodCalendarGrid: include overflow days from adjacent months
      const monthStart = startOfMonth(new Date(year, month, 1));
      const monthEnd = endOfMonth(monthStart);
      const startDate = format(startOfWeek(monthStart), 'yyyy-MM-dd');
      const endDate = format(endOfWeek(monthEnd), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('food_slots')
        .select('*, profiles!food_slots_donor_id_fkey(name, email, phone)')
        .eq('home_id', homeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return mergeFoodSlotsByCell(data as FoodSlotWithDonor[]) as FoodSlotWithDonor[];
    },
    enabled: !!homeId,
  });
}

// New hook to fetch slots for ALL homes in a trust for a date range
export function useFoodSlotsAllHomes(trustId: string | null, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['food-slots-all-homes', trustId, startDate, endDate],
    queryFn: async () => {
      if (!trustId) return [];
      
      const { data, error } = await supabase
        .from('food_slots')
        .select('*')
        .eq('trust_id', trustId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('home_id', { ascending: true });

      if (error) throw error;
      return data as FoodSlot[];
    },
    enabled: !!trustId,
  });
}

export function useFoodSlot(slotId: string | null) {
  return useQuery({
    queryKey: ['food-slot', slotId],
    queryFn: async () => {
      if (!slotId) return null;
      
      const { data, error } = await supabase
        .from('food_slots')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();

      if (error) throw error;
      return data as FoodSlot | null;
    },
    enabled: !!slotId,
  });
}

export function useCreateFoodSlot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateFoodSlotParams) => {
      const { data, error } = await supabase
        .from('food_slots')
        .insert({
          ...params,
          status: 'NEED',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      toast.success('Food slot requirement created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create food slot');
    },
  });
}

export function useUpdateFoodSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...params }: UpdateFoodSlotParams) => {
      const { data, error } = await supabase
        .from('food_slots')
        .update(params)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slot'] });
      toast.success('Food slot updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update food slot');
    },
  });
}

export function useDeleteFoodSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('food_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      toast.success('Food slot deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete food slot');
    },
  });
}

export function useSponsorFoodSlot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ slotId, homeName, date, timeSlot }: { slotId: string; homeName?: string; date?: string; timeSlot?: string }) => {
      // Update the food slot to BOOKED status and assign donor
      const { data, error } = await supabase
        .from('food_slots')
        .update({
          status: 'BOOKED',
          donor_id: user?.id,
          current_sponsors_count: 1,
        })
        .eq('id', slotId)
        .select()
        .single();

      if (error) throw error;

      // Notify finance users about pending payment
      const { data: financeUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'finance');

      if (financeUsers && financeUsers.length > 0) {
        const slotLabel = timeSlot || data.time_slot;
        const slotDate = date || data.date;
        const notifications = financeUsers.map((u: any) => ({
          user_id: u.user_id,
          type: 'payment_awaiting_assignment' as const,
          title: 'Food Sponsorship Pending Payment',
          message: `A ${slotLabel} food slot on ${slotDate} at ${homeName || 'a project'} has been booked without payment. Please track the expected payment.`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      toast.success('Successfully sponsored this food slot!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sponsor food slot');
    },
  });
}

export function useCompleteFoodSlotPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      // Update the food slot to PAID status
      const { data, error } = await supabase
        .from('food_slots')
        .update({ status: 'PAID' })
        .eq('id', slotId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      toast.success('Payment completed! Thank you for your contribution.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete payment');
    },
  });
}

interface SlotIndividualDetails {
  reason: string;
  sponsor_for: string;
  note: string;
  donate_on_behalf_of: string | null;
  meal_type?: string | null;
}

export interface BulkBookFoodSlotsParams {
  slots: Array<{
    date: string;
    homeId: string;
    timeSlot: FoodTimeSlot;
    existingSlotId: string | null;
    slotAmount?: number;
    individualDetails?: SlotIndividualDetails;
  }>;
  bookingData: {
    donor_id: string | null;
    reason: string;
    sponsor_for: string;
    note: string;
    amount: number;
    payment_status: string;
    payment_mode?: string | null;
    amount_paid?: number | null;
    donation_id?: string | null;
    cheque_number?: string | null;
    bank_name?: string | null;
    cheque_image_url?: string | null;
    cheque_status?: string | null;
    donate_on_behalf_of?: string | null;
    meal_type?: string | null;
  };
  trustId: string;
  useIndividualDetails?: boolean;
}

export function useBulkBookFoodSlots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ slots, bookingData, trustId, useIndividualDetails }: BulkBookFoodSlotsParams) => {
      const results = [];
      const paymentStatus =
        normalizePaymentStatus(bookingData.payment_status) || bookingData.payment_status;
      
      for (const slot of slots) {
        const slotBookingData = useIndividualDetails && slot.individualDetails
          ? {
              reason: slot.individualDetails.reason,
              sponsor_for: slot.individualDetails.sponsor_for,
              note: slot.individualDetails.note,
              donate_on_behalf_of: slot.individualDetails.donate_on_behalf_of,
              meal_type: slot.individualDetails.meal_type,
            }
          : {
              reason: bookingData.reason,
              sponsor_for: bookingData.sponsor_for,
              note: bookingData.note,
              donate_on_behalf_of: bookingData.donate_on_behalf_of || null,
              meal_type: bookingData.meal_type,
            };

        const slotMealType =
          slot.timeSlot === 'OUTSIDE_FOOD' || slot.timeSlot === 'REFRESHMENTS'
            ? slotBookingData.meal_type || null
            : null;

        const slotAmount = slot.slotAmount ?? bookingData.amount / slots.length;
        const slotAmountPaid =
          bookingData.amount_paid != null
            ? bookingData.amount_paid / slots.length
            : null;

        const paymentPayload = {
          payment_status: paymentStatus,
          payment_mode: bookingData.payment_mode ?? null,
          amount_paid: slotAmountPaid,
          donation_id: bookingData.donation_id ?? null,
          cheque_number: bookingData.cheque_number ?? null,
          bank_name: bookingData.bank_name ?? null,
          cheque_image_url: bookingData.cheque_image_url ?? null,
          cheque_status: bookingData.cheque_status ?? null,
        };

        if (slot.existingSlotId) {
          // Update existing slot
          const { data, error } = await supabase
            .from('food_slots')
            .update({
              status: 'BOOKED',
              donor_id: bookingData.donor_id,
              reason: slotBookingData.reason,
              sponsor_for: slotBookingData.sponsor_for,
              note: slotBookingData.note,
              donate_on_behalf_of: slotBookingData.donate_on_behalf_of,
              meal_type: slotMealType,
              amount: slotAmount,
              current_sponsors_count: 1,
              ...paymentPayload,
            })
            .eq('id', slot.existingSlotId)
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } else {
          // Create new slot
          const { data, error } = await supabase
            .from('food_slots')
            .insert({
              date: slot.date,
              home_id: slot.homeId,
              time_slot: slot.timeSlot,
              trust_id: trustId,
              status: 'BOOKED',
              donor_id: bookingData.donor_id,
              reason: slotBookingData.reason,
              sponsor_for: slotBookingData.sponsor_for,
              note: slotBookingData.note,
              donate_on_behalf_of: slotBookingData.donate_on_behalf_of,
              meal_type: slotMealType,
              amount: slotAmount,
              current_sponsors_count: 1,
              created_by: user?.id,
              ...paymentPayload,
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        }
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['food-slots-all-homes'] });
      toast.success(`Successfully booked ${data.length} food slots!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to book food slots');
    },
  });
}

// Hook to fetch food slots for a specific donor
export function useDonorFoodSlots(donorId: string | null) {
  return useQuery({
    queryKey: ['donor-food-slots', donorId],
    queryFn: async () => {
      if (!donorId) return [];
      
      const { data, error } = await supabase
        .from('food_slots')
        .select('*, homes (name)')
        .eq('donor_id', donorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const slots = data as (FoodSlot & { homes: { name: string } | null })[];
      return mergeFoodSlotsByCell(slots) as (FoodSlot & { homes: { name: string } | null })[];
    },
    enabled: !!donorId,
  });
}

// Hook to complete a food slot with report — routes through event media approval workflow
export function useCompleteFoodSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slotId,
      notes,
      photoUrls,
      videoUrls = [],
    }: {
      slotId: string;
      notes: string;
      photoUrls: string[];
      videoUrls?: string[];
    }) => {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/food-slots/${slotId}/submit-event-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ photos: photoUrls, videos: videoUrls, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Request failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['completed-food-slots'] });
      queryClient.invalidateQueries({ queryKey: ['past-food-slots-needing-media'] });
      queryClient.invalidateQueries({ queryKey: ['pending-food-event-media'] });
      queryClient.invalidateQueries({ queryKey: ['warden-task-bar'] });
      toast.success('Event media submitted for admin review');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit event media');
    },
  });
}