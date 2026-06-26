import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DonorKindDonation {
  id: string;
  trust_id: string;
  home_id: string;
  donor_id: string | null;
  item_type: string;
  item_description: string | null;
  quantity: number | null;
  estimated_value: number | null;
  received_date: string;
  delivery_mode: string | null;
  status: string | null;
  notes: string | null;
  need_id: string | null;
  created_at: string | null;
  homes?: {
    name: string;
  } | null;
  trusts?: {
    name: string;
  } | null;
}

export function useDonorKindDonations(donorId: string | null) {
  return useQuery({
    queryKey: ['donor-kind-donations', donorId],
    queryFn: async () => {
      if (!donorId) return [];
      
      const { data, error } = await supabase
        .from('kind_donations')
        .select(`
          *,
          homes:home_id(name),
          trusts:trust_id(name)
        `)
        .eq('donor_id', donorId)
        .order('received_date', { ascending: false });

      if (error) throw error;
      return data as DonorKindDonation[];
    },
    enabled: !!donorId,
  });
}
