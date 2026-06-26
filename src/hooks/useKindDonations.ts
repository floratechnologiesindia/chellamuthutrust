import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KindDonation {
  id: string;
  trust_id: string;
  home_id: string;
  donor_id: string | null;
  donor_name: string | null;
  item_type: string;
  item_description: string | null;
  quantity: number | null;
  estimated_value: number | null;
  received_date: string;
  notes: string | null;
  created_at: string | null;
  delivery_mode: string | null;
  status: string | null;
  need_id: string | null;
}

export interface KindDonationWithRelations extends KindDonation {
  trusts?: { name: string } | null;
  homes?: { name: string } | null;
  profiles?: { name: string; email: string; phone?: string | null } | null;
  completion_notes?: string | null;
  completion_photos?: string[] | null;
}

export function useKindDonations(trustId?: string | null, homeId?: string | null, statusFilter?: string[] | null) {
  return useQuery({
    queryKey: ['kind-donations', trustId, homeId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('kind_donations')
        .select(`
          *,
          trusts:trust_id(name),
          homes:home_id(name),
          profiles:donor_id(name, email)
        `)
        .order('received_date', { ascending: false });

      if (trustId) {
        query = query.eq('trust_id', trustId);
      }
      if (homeId) {
        query = query.eq('home_id', homeId);
      }
      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KindDonationWithRelations[];
    },
  });
}

// Fetch pending kind donations for a home (for warden help management)
export function usePendingKindDonations(homeId: string | null) {
  return useQuery({
    queryKey: ['pending-kind-donations', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      
      const { data, error } = await supabase
        .from('kind_donations')
        .select(`
          *,
          trusts:trust_id(name),
          homes:home_id(name),
          profiles:donor_id(name, email, phone)
        `)
        .eq('home_id', homeId)
        .in('status', ['PLEDGED', 'DELIVERED'])
        .order('received_date', { ascending: true });

      if (error) throw error;
      return data as KindDonationWithRelations[];
    },
    enabled: !!homeId,
  });
}

export interface CreateKindDonationParams {
  trust_id: string;
  home_id: string;
  need_id?: string | null;
  donor_id?: string | null;
  donor_name?: string | null;
  item_type: string;
  item_description?: string | null;
  quantity?: number | null;
  estimated_value?: number | null;
  received_date: string;
  notes?: string | null;
  delivery_mode?: 'SELF_DELIVERY' | 'COURIER' | 'TRUST_PICKUP';
  status?: 'PLEDGED' | 'DELIVERED' | 'RECEIVED' | 'VERIFIED';
}

export function useCreateKindDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateKindDonationParams) => {
      const { data, error } = await supabase
        .from('kind_donations')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kind-donations'] });
    },
  });
}

export function useDeleteKindDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kind_donations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kind-donations'] });
    },
  });
}

// Hook to complete a kind donation with report
export function useCompleteKindDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      donationId, 
      notes, 
      photoUrls 
    }: { 
      donationId: string; 
      notes: string; 
      photoUrls: string[] 
    }) => {
      const { data, error } = await supabase
        .from('kind_donations')
        .update({
          status: 'RECEIVED',
          completion_notes: notes,
          completion_photos: photoUrls,
        })
        .eq('id', donationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kind-donations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-kind-donations'] });
    },
  });
}

export function useKindDonationStats(trustId?: string | null) {
  return useQuery({
    queryKey: ['kind-donation-stats', trustId],
    queryFn: async () => {
      let query = supabase
        .from('kind_donations')
        .select('estimated_value, received_date, item_type');

      if (trustId) {
        query = query.eq('trust_id', trustId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalValue = data?.reduce((sum, d) => sum + Number(d.estimated_value || 0), 0) || 0;
      const thisMonth = data?.filter(d => {
        const date = new Date(d.received_date);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length || 0;
      const count = data?.length || 0;
      const itemTypes = [...new Set(data?.map(d => d.item_type) || [])].length;

      return { totalValue, thisMonth, count, itemTypes };
    },
  });
}
