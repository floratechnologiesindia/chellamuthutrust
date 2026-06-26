import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type DonationType = Database['public']['Enums']['donation_type'];
type DonationStatus = Database['public']['Enums']['donation_status'];
type PaymentMode = Database['public']['Enums']['payment_mode'];
type OccasionType = Database['public']['Enums']['occasion_type'];

export interface Donation {
  id: string;
  donor_id: string;
  need_id: string | null;
  trust_id: string;
  home_id: string;
  sponsorship_type: DonationType;
  amount_pledged: number;
  payment_mode: PaymentMode;
  in_kind_details: string | null;
  start_date: string;
  next_due_date: string | null;
  last_paid_date: string | null;
  status: DonationStatus;
  occasion_type: OccasionType | null;
  occasion_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationWithRelations extends Donation {
  homes?: {
    id: string;
    name: string;
    city: string;
    image_url: string | null;
  } | null;
  needs?: {
    id: string;
    category_id: string;
    quantity: number;
    unit: string;
    description?: string | null;
    categories?: {
      id: string;
      label: string;
      icon: string | null;
    } | null;
  } | null;
  profiles?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

export interface DonationPayment {
  id: string;
  donation_id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

export function useDonations(donorId?: string | null) {
  return useQuery({
    queryKey: ['donations', donorId],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(`
          *,
          homes (id, name, city, image_url),
          needs (
            id, category_id, quantity, unit,
            categories (id, label, icon)
          ),
          profiles (id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (donorId) {
        query = query.eq('donor_id', donorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DonationWithRelations[];
    },
  });
}

// Fetch active donations for a specific home (for warden help management)
export function useDonationsForHome(homeId: string | null) {
  return useQuery({
    queryKey: ['donations-for-home', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          homes (id, name, city, image_url),
          needs (
            id, category_id, quantity, unit, description,
            categories (id, label, icon)
          ),
          profiles (id, name, email, phone)
        `)
        .eq('home_id', homeId)
        .in('status', ['PLEDGED', 'ACTIVE'])
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as DonationWithRelations[];
    },
    enabled: !!homeId,
  });
}

export function useDonation(donationId: string | null) {
  return useQuery({
    queryKey: ['donation', donationId],
    queryFn: async () => {
      if (!donationId) return null;

      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          homes (id, name, city, state, image_url),
          needs (
            id, category_id, quantity, unit, description,
            categories (id, label, icon, description)
          ),
          profiles (id, name, email, phone)
        `)
        .eq('id', donationId)
        .maybeSingle();

      if (error) throw error;
      return data as DonationWithRelations | null;
    },
    enabled: !!donationId,
  });
}

export interface CreateDonationParams {
  need_id?: string | null;
  trust_id: string;
  home_id: string;
  sponsorship_type: DonationType;
  amount_pledged: number;
  payment_mode: PaymentMode;
  in_kind_details?: string | null;
  start_date: string;
  next_due_date?: string | null;
  occasion_type?: OccasionType | null;
  occasion_note?: string | null;
}

export function useCreateDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateDonationParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('donations')
        .insert({
          ...params,
          donor_id: user.id,
          status: 'PLEDGED',
        })
        .select()
        .single();

      if (error) throw error;

      // Update need's current_sponsors_count if linked to a need
      if (params.need_id) {
        const { data: need } = await supabase
          .from('needs')
          .select('current_sponsors_count, max_sponsors_allowed')
          .eq('id', params.need_id)
          .single();

        if (need) {
          const newCount = (need.current_sponsors_count || 0) + 1;
          const newStatus = newCount >= need.max_sponsors_allowed ? 'FULLY_SPONSORED' : 
                           newCount > 0 ? 'PARTIAL' : 'OPEN';
          
          await supabase
            .from('needs')
            .update({ 
              current_sponsors_count: newCount,
              status: newStatus
            })
            .eq('id', params.need_id);
        }
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['needs'] });

      // Send donation confirmation email (fire-and-forget)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', user.id)
            .maybeSingle();

          const { data: home } = await supabase
            .from('homes')
            .select('name')
            .eq('id', variables.home_id)
            .maybeSingle();

          if (profile?.email && home?.name) {
            const freqLabel = variables.payment_mode === 'in_kind' ? 'In-Kind' :
              variables.sponsorship_type === 'RECURRING' ? 'Recurring' : 'One-Time';

            await supabase.functions.invoke('send-donor-report', {
              body: {
                donor_email: profile.email,
                donor_name: profile.name,
                subject: `Donation Commitment Confirmed - ${home.name}`,
                message_body: `Thank you for your generous commitment to ${home.name}!\n\nHere are your sponsorship details:\n• Type: ${freqLabel}\n• Amount: ₹${variables.amount_pledged.toLocaleString()}\n• Start Date: ${format(new Date(variables.start_date), 'MMMM dd, yyyy')}${variables.next_due_date ? `\n• Next Due Date: ${format(new Date(variables.next_due_date), 'MMMM dd, yyyy')}` : ''}\n\nYour support makes a real difference in the lives of those we serve.\n\nWarm regards,\nMS Chellamuthu Trust`,
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to send donation confirmation email:', error);
      }
    },
  });
}

export interface UpdateDonationParams {
  id: string;
  status?: DonationStatus;
  next_due_date?: string | null;
  last_paid_date?: string | null;
}

export function useUpdateDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...params }: UpdateDonationParams) => {
      const { data, error } = await supabase
        .from('donations')
        .update(params)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['donation', variables.id] });
    },
  });
}

export function useDonationPayments(donationId: string | null) {
  return useQuery({
    queryKey: ['donation-payments', donationId],
    queryFn: async () => {
      if (!donationId) return [];

      const { data, error } = await supabase
        .from('donation_payments')
        .select('*')
        .eq('donation_id', donationId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as DonationPayment[];
    },
    enabled: !!donationId,
  });
}

export interface RecordPaymentParams {
  donation_id: string;
  amount: number;
  payment_date: string;
  payment_reference?: string | null;
  notes?: string | null;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPaymentParams) => {
      const { data, error } = await supabase
        .from('donation_payments')
        .insert(params)
        .select()
        .single();

      if (error) throw error;

      // Update donation's last_paid_date
      await supabase
        .from('donations')
        .update({ last_paid_date: params.payment_date })
        .eq('id', params.donation_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['donation-payments', variables.donation_id] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
    },
  });
}
