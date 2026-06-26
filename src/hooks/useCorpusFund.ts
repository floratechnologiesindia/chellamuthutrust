import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CorpusFundContribution {
  id: string;
  trust_id: string;
  donor_id: string | null;
  donor_name: string | null;
  amount: number;
  contribution_date: string;
  purpose: string | null;
  notes: string | null;
  created_at: string | null;
  donor_address: string | null;
  donor_pan: string | null;
  contribution_mode: string | null;
  reference_number: string | null;
  declaration_agreed: boolean | null;
  declaration_agreed_at: string | null;
}

export interface CorpusFundWithRelations extends CorpusFundContribution {
  trusts?: { name: string } | null;
  profiles?: { name: string; email: string } | null;
}

export function useCorpusFundContributions(trustId?: string | null) {
  return useQuery({
    queryKey: ['corpus-fund', trustId],
    queryFn: async () => {
      let query = supabase
        .from('corpus_fund_contributions')
        .select(`
          *,
          trusts:trust_id(name),
          profiles:donor_id(name, email)
        `)
        .order('contribution_date', { ascending: false });

      if (trustId) {
        query = query.eq('trust_id', trustId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CorpusFundWithRelations[];
    },
  });
}

export interface CreateCorpusFundParams {
  trust_id: string;
  donor_id?: string | null;
  donor_name?: string | null;
  amount: number;
  contribution_date: string;
  purpose?: string | null;
  notes?: string | null;
  donor_address?: string | null;
  donor_pan?: string | null;
  contribution_mode?: string | null;
  reference_number?: string | null;
  declaration_agreed?: boolean | null;
  declaration_agreed_at?: string | null;
}

export function useCreateCorpusFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCorpusFundParams) => {
      const { data, error } = await supabase
        .from('corpus_fund_contributions')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corpus-fund'] });
    },
  });
}

export function useDeleteCorpusFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('corpus_fund_contributions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corpus-fund'] });
    },
  });
}

export function useCorpusFundStats(trustId?: string | null) {
  return useQuery({
    queryKey: ['corpus-fund-stats', trustId],
    queryFn: async () => {
      let query = supabase
        .from('corpus_fund_contributions')
        .select('amount, contribution_date');

      if (trustId) {
        query = query.eq('trust_id', trustId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const thisYear = data?.filter(c => 
        new Date(c.contribution_date).getFullYear() === new Date().getFullYear()
      ).reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const count = data?.length || 0;

      return { total, thisYear, count };
    },
  });
}
