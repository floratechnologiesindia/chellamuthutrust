import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface BankTransaction {
  id: string;
  trust_id: string;
  transaction_date: string;
  amount: number;
  reference_number: string | null;
  narration: string | null;
  payment_mode: string;
  remarks: string | null;
  status: string;
  assigned_donor_id: string | null;
  assigned_category_id: string | null;
  assigned_need_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  reconciled_by: string | null;
  reconciled_at: string | null;
  source: string;
  created_by: string | null;
  created_at: string;
  // Joined fields
  donor_name?: string;
  category_label?: string;
}

export const useBankTransactions = (statusFilter?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bank-transactions', statusFilter, user?.trust_id],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*, profiles!bank_transactions_assigned_donor_id_fkey(name), categories!bank_transactions_assigned_category_id_fkey(label)')
        .order('transaction_date', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((t: any) => ({
        ...t,
        donor_name: t.profiles?.name || null,
        category_label: t.categories?.label || null,
      })) as BankTransaction[];
    },
    enabled: !!user,
  });
};

export const useBankTransactionStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bank-transaction-stats', user?.trust_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('status, amount, transaction_date');

      if (error) throw error;

      const stats = {
        totalToday: 0,
        awaitingIdentification: 0,
        assignedToDonors: 0,
        pendingVerification: 0,
      };

      (data || []).forEach((t: any) => {
        if (t.transaction_date === today) {
          stats.totalToday += Number(t.amount);
        }
        if (t.status === 'unidentified' || t.status === 'awaiting_assignment') {
          stats.awaitingIdentification += Number(t.amount);
        }
        if (t.status === 'assigned') {
          stats.assignedToDonors += Number(t.amount);
          stats.pendingVerification += Number(t.amount);
        }
      });

      return stats;
    },
    enabled: !!user,
  });
};

export const useCreateBankTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      transaction_date: string;
      amount: number;
      reference_number?: string;
      narration?: string;
      payment_mode: string;
      remarks?: string;
      source?: string;
    }) => {
      let trustId = user?.trust_id;
      
      // Fallback: if user has no trust_id, fetch the first available trust
      if (!trustId) {
        const { data: trusts } = await supabase.from('trusts').select('id').limit(1).single();
        trustId = trusts?.id;
      }
      
      if (!trustId) throw new Error('No trust assigned');
      
      const { error } = await supabase.from('bank_transactions').insert({
        trust_id: trustId,
        created_by: user!.id,
        ...data,
        source: data.source || 'manual',
        status: 'unidentified',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-stats'] });
      toast({ title: 'Transaction recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording transaction', description: error.message, variant: 'destructive' });
    },
  });
};

export const useBulkImportTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactions: Array<{
      transaction_date: string;
      amount: number;
      reference_number?: string;
      narration?: string;
      payment_mode: string;
      remarks?: string;
    }>) => {
      if (!user) throw new Error('Not authenticated');
      
      let trustId = user.trust_id;
      
      if (!trustId) {
        const { data: trusts } = await supabase.from('trusts').select('id').limit(1).single();
        trustId = trusts?.id;
      }
      
      if (!trustId) throw new Error('No trust found. Please contact admin.');

      const rows = transactions.map(t => ({
        trust_id: trustId!,
        created_by: user!.id,
        source: 'import',
        status: 'unidentified',
        ...t,
      }));

      const { error } = await supabase.from('bank_transactions').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-stats'] });
      toast({ title: 'Bank statement imported successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useNotifyAdminForAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, amount }: { transactionId: string; amount: number }) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ status: 'awaiting_assignment' })
        .eq('id', transactionId);
      if (error) throw error;

      // Notify all super_admin and admin users
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin']);

      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map((u: any) => ({
          user_id: u.user_id,
          type: 'payment_awaiting_assignment' as const,
          title: 'Payment Awaiting Assignment',
          message: `A payment of ₹${amount.toLocaleString('en-IN')} has been received and needs donor assignment.`,
        }));
        await supabase.from('notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-stats'] });
      toast({ title: 'Admin notified for payment assignment' });
    },
  });
};

export const useAssignTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      transactionId: string;
      donorId: string;
      categoryId?: string;
      needId?: string;
    }) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          status: 'assigned',
          assigned_donor_id: data.donorId,
          assigned_category_id: data.categoryId || null,
          assigned_need_id: data.needId || null,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', data.transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-stats'] });
      toast({ title: 'Payment assigned to donor successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Assignment failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useReconcileTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          status: 'reconciled',
          reconciled_by: user?.id,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transaction-stats'] });
      toast({ title: 'Payment reconciled successfully' });
    },
  });
};

export const useExpectedPayments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expected-payments', user?.trust_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*, profiles!donations_donor_id_fkey(name)')
        .eq('status', 'PLEDGED')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        donor_name: d.profiles?.name || 'Unknown',
        amount: d.amount_pledged,
        purpose: d.occasion_note || 'Donation',
        booking_date: d.start_date,
        status: d.status,
      }));
    },
    enabled: !!user,
  });
};
