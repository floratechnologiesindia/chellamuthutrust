import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DonorCorpusFundContribution {
  id: string;
  trust_id: string;
  donor_id: string | null;
  amount: number;
  contribution_date: string;
  contribution_mode: string | null;
  purpose: string | null;
  notes: string | null;
  reference_number: string | null;
  created_at: string | null;
  trusts?: {
    name: string;
  } | null;
}

export function useDonorCorpusFund(donorId: string | null) {
  return useQuery({
    queryKey: ['donor-corpus-fund', donorId],
    queryFn: async () => {
      if (!donorId) return [];
      
      const { data, error } = await supabase
        .from('corpus_fund_contributions')
        .select(`
          *,
          trusts:trust_id(name)
        `)
        .eq('donor_id', donorId)
        .order('contribution_date', { ascending: false });

      if (error) throw error;
      return data as DonorCorpusFundContribution[];
    },
    enabled: !!donorId,
  });
}
