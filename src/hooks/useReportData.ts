import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface ReportFilters {
  trustFilter?: string;
  homeFilter?: string;
  dateRange?: number; // days
}

function applyFilters(query: any, filters: ReportFilters, dateField = 'created_at') {
  if (filters.trustFilter && filters.trustFilter !== 'all') {
    query = query.eq('trust_id', filters.trustFilter);
  }
  if (filters.homeFilter && filters.homeFilter !== 'all') {
    query = query.eq('home_id', filters.homeFilter);
  }
  if (filters.dateRange) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filters.dateRange);
    query = query.gte(dateField, startDate.toISOString());
  }
  return query;
}

export interface DonationSummary {
  totalAmount: number;
  oneTimeAmount: number;
  recurringAmount: number;
  oneTimeCount: number;
  recurringCount: number;
  donorCount: number;
}

export interface NeedsSummary {
  total: number;
  open: number;
  partial: number;
  fullySponsored: number;
  completed: number;
  cancelled: number;
}

export interface TasksSummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  onTimeCompleted: number;
  delayedCompleted: number;
}

export interface CategoryDonation {
  name: string;
  amount: number;
  count: number;
}

export interface HomeNeedStats {
  name: string;
  open: number;
  partial: number;
  sponsored: number;
}

export interface TopDonor {
  id: string;
  name: string;
  totalAmount: number;
  donationCount: number;
}

export interface TaskByAssignee {
  name: string;
  assigned: number;
  completed: number;
  overdue: number;
}

export interface RecurringSummary {
  activeCount: number;
  monthlyCommitment: number;
  upcomingDue: number;
  overdueCount: number;
  donations: {
    id: string;
    donorName: string;
    homeName: string;
    amount: number;
    startDate: string;
    nextDueDate: string | null;
    status: string | null;
  }[];
}

export interface CorpusKindSummary {
  corpusTotal: number;
  corpusCount: number;
  corpusByMode: { name: string; value: number; count: number }[];
  recentCorpus: { id: string; donorName: string; amount: number; date: string; mode: string | null }[];
  kindTotal: number;
  kindCount: number;
  kindTotalValue: number;
  kindByType: { name: string; quantity: number; value: number }[];
  recentKind: { id: string; donorName: string; itemType: string; quantity: number; value: number; date: string }[];
}

export interface MonthlyTrendData {
  month: string;
  donations: number;
  needs: number;
}

export function useDonationSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-donation-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select('id, amount_pledged, sponsorship_type, donor_id, trust_id, home_id, created_at');

      query = applyFilters(query, filters);

      const { data: donations, error } = await query;
      if (error) throw error;

      const oneTime = donations?.filter(d => d.sponsorship_type === 'ONE_TIME') || [];
      const recurring = donations?.filter(d => d.sponsorship_type === 'RECURRING') || [];
      const uniqueDonors = new Set(donations?.map(d => d.donor_id) || []);

      return {
        totalAmount: donations?.reduce((sum, d) => sum + d.amount_pledged, 0) || 0,
        oneTimeAmount: oneTime.reduce((sum, d) => sum + d.amount_pledged, 0),
        recurringAmount: recurring.reduce((sum, d) => sum + d.amount_pledged, 0),
        oneTimeCount: oneTime.length,
        recurringCount: recurring.length,
        donorCount: uniqueDonors.size,
      } as DonationSummary;
    },
  });
}

export function useNeedsSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-needs-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('needs')
        .select('id, status, trust_id, home_id, created_at');

      query = applyFilters(query, filters);

      const { data: needs, error } = await query;
      if (error) throw error;

      return {
        total: needs?.length || 0,
        open: needs?.filter(n => n.status === 'OPEN').length || 0,
        partial: needs?.filter(n => n.status === 'PARTIAL').length || 0,
        fullySponsored: needs?.filter(n => n.status === 'FULLY_SPONSORED').length || 0,
        completed: needs?.filter(n => n.status === 'COMPLETED').length || 0,
        cancelled: needs?.filter(n => n.status === 'CANCELLED').length || 0,
      } as NeedsSummary;
    },
  });
}

export function useTasksSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-tasks-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('id, status, due_date, completed_at, trust_id, home_id, created_at');

      if (filters.trustFilter && filters.trustFilter !== 'all') {
        query = query.eq('trust_id', filters.trustFilter);
      }
      if (filters.homeFilter && filters.homeFilter !== 'all') {
        query = query.eq('home_id', filters.homeFilter);
      }
      if (filters.dateRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.dateRange);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const overdue = tasks?.filter(t => 
        (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.due_date < today
      ).length || 0;

      const completedItems = tasks?.filter(t => t.status === 'COMPLETED') || [];
      const onTimeCompleted = completedItems.filter(t => {
        if (!t.completed_at) return true;
        const completedDate = t.completed_at.split('T')[0];
        return completedDate <= t.due_date;
      }).length;
      const delayedCompleted = completedItems.length - onTimeCompleted;

      return {
        total: tasks?.length || 0,
        open: tasks?.filter(t => t.status === 'OPEN').length || 0,
        inProgress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
        completed: completedItems.length,
        cancelled: tasks?.filter(t => t.status === 'CANCELLED').length || 0,
        overdue,
        onTimeCompleted,
        delayedCompleted,
      } as TasksSummary;
    },
  });
}

export function useDonationsByCategory(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-donations-by-category', filters],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(`
          id, amount_pledged, need_id, trust_id, home_id, created_at,
          needs ( category_id, categories (label) )
        `);

      query = applyFilters(query, filters);

      const { data: donations, error } = await query;
      if (error) throw error;

      const categoryMap = new Map<string, { amount: number; count: number }>();
      
      donations?.forEach(d => {
        const categoryLabel = (d.needs as any)?.categories?.label || 'Uncategorized';
        const existing = categoryMap.get(categoryLabel) || { amount: 0, count: 0 };
        categoryMap.set(categoryLabel, {
          amount: existing.amount + d.amount_pledged,
          count: existing.count + 1,
        });
      });

      return Array.from(categoryMap.entries()).map(([name, data]) => ({
        name: name.split(' ')[0],
        amount: data.amount,
        count: data.count,
      })) as CategoryDonation[];
    },
  });
}

export function useNeedsByHome(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-needs-by-home', filters],
    queryFn: async () => {
      const { data: homes, error: homesError } = await supabase
        .from('homes')
        .select('id, name');
      if (homesError) throw homesError;

      let query = supabase
        .from('needs')
        .select('id, home_id, status, trust_id, created_at');

      query = applyFilters(query, filters);

      const { data: needs, error: needsError } = await query;
      if (needsError) throw needsError;

      return homes?.map(home => {
        const homeNeeds = needs?.filter(n => n.home_id === home.id) || [];
        return {
          name: home.name.split(' ')[0],
          open: homeNeeds.filter(n => n.status === 'OPEN').length,
          partial: homeNeeds.filter(n => n.status === 'PARTIAL').length,
          sponsored: homeNeeds.filter(n => n.status === 'FULLY_SPONSORED').length,
        };
      }) as HomeNeedStats[];
    },
  });
}

export function useTopDonors(limit = 5, filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-top-donors', limit, filters],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select('donor_id, amount_pledged, trust_id, home_id, created_at');

      query = applyFilters(query, filters);

      const { data: donations, error } = await query;
      if (error) throw error;

      const donorMap = new Map<string, { totalAmount: number; donationCount: number }>();
      donations?.forEach(d => {
        const existing = donorMap.get(d.donor_id) || { totalAmount: 0, donationCount: 0 };
        donorMap.set(d.donor_id, {
          totalAmount: existing.totalAmount + d.amount_pledged,
          donationCount: existing.donationCount + 1,
        });
      });

      const donorIds = Array.from(donorMap.keys());
      if (donorIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', donorIds);
      if (profilesError) throw profilesError;

      return donorIds
        .map(id => {
          const profile = profiles?.find(p => p.id === id);
          const stats = donorMap.get(id)!;
          return {
            id,
            name: profile?.name || 'Anonymous',
            totalAmount: stats.totalAmount,
            donationCount: stats.donationCount,
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit) as TopDonor[];
    },
  });
}

export function useTasksByAssignee(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-tasks-by-assignee', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('id, assigned_to, status, due_date, trust_id, home_id, created_at');

      if (filters.trustFilter && filters.trustFilter !== 'all') {
        query = query.eq('trust_id', filters.trustFilter);
      }
      if (filters.homeFilter && filters.homeFilter !== 'all') {
        query = query.eq('home_id', filters.homeFilter);
      }
      if (filters.dateRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.dateRange);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      const assigneeIds = [...new Set(tasks?.map(t => t.assigned_to) || [])];
      if (assigneeIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', assigneeIds);
      if (profilesError) throw profilesError;

      const today = new Date().toISOString().split('T')[0];

      return assigneeIds.map(id => {
        const profile = profiles?.find(p => p.id === id);
        const userTasks = tasks?.filter(t => t.assigned_to === id) || [];
        return {
          name: profile?.name?.split(' ')[0] || 'Unknown',
          assigned: userTasks.length,
          completed: userTasks.filter(t => t.status === 'COMPLETED').length,
          overdue: userTasks.filter(t => 
            (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.due_date < today
          ).length,
        };
      }) as TaskByAssignee[];
    },
  });
}

export function useHomesPerformance(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-homes-performance', filters],
    queryFn: async () => {
      const { data: homes, error: homesError } = await supabase
        .from('homes')
        .select('id, name');
      if (homesError) throw homesError;

      let query = supabase
        .from('needs')
        .select('id, home_id, status, trust_id, created_at');

      query = applyFilters(query, filters);

      const { data: needs, error: needsError } = await query;
      if (needsError) throw needsError;

      return homes?.map(home => {
        const homeNeeds = needs?.filter(n => n.home_id === home.id) || [];
        const sponsored = homeNeeds.filter(n => n.status === 'FULLY_SPONSORED' || n.status === 'COMPLETED').length;
        const rate = homeNeeds.length > 0 ? (sponsored / homeNeeds.length * 100) : 0;
        return {
          id: home.id,
          name: home.name,
          needsCount: homeNeeds.length,
          sponsoredCount: sponsored,
          coverageRate: rate,
        };
      }).slice(0, 4) || [];
    },
  });
}

export function useTrusts() {
  return useQuery({
    queryKey: ['report-trusts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusts')
        .select('id, name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useReportHomes(trustId?: string) {
  return useQuery({
    queryKey: ['report-homes', trustId],
    queryFn: async () => {
      let query = supabase.from('homes').select('id, name, trust_id');
      if (trustId && trustId !== 'all') {
        query = query.eq('trust_id', trustId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRecentDonations(limit = 3) {
  return useQuery({
    queryKey: ['report-recent-donations', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select(`id, amount_pledged, created_at, profiles:donor_id (name)`)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

// Recurring Sponsorship Summary
export function useRecurringSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-recurring-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('donations')
        .select(`
          id, donor_id, home_id, trust_id, amount_pledged, status, 
          start_date, next_due_date, sponsorship_type, created_at,
          profiles:donor_id (name),
          homes (name)
        `)
        .eq('sponsorship_type', 'RECURRING');

      if (filters.trustFilter && filters.trustFilter !== 'all') {
        query = query.eq('trust_id', filters.trustFilter);
      }
      if (filters.homeFilter && filters.homeFilter !== 'all') {
        query = query.eq('home_id', filters.homeFilter);
      }

      const { data: donations, error } = await query;
      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0];

      const active = donations?.filter(d => d.status === 'ACTIVE') || [];
      const monthlyCommitment = active.reduce((sum, d) => sum + d.amount_pledged, 0);

      const upcomingDue = active.filter(d => 
        d.next_due_date && d.next_due_date >= today && d.next_due_date <= thirtyDaysStr
      ).length;

      const overdueCount = active.filter(d => 
        d.next_due_date && d.next_due_date < today
      ).length;

      const donationsList = (donations || []).map(d => ({
        id: d.id,
        donorName: (d.profiles as any)?.name || 'Anonymous',
        homeName: (d.homes as any)?.name || 'Unknown',
        amount: d.amount_pledged,
        startDate: d.start_date,
        nextDueDate: d.next_due_date,
        status: d.status,
      }));

      return {
        activeCount: active.length,
        monthlyCommitment,
        upcomingDue,
        overdueCount,
        donations: donationsList,
      } as RecurringSummary;
    },
  });
}

// Corpus & Kind Donations Summary
export function useCorpusKindSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['report-corpus-kind-summary', filters],
    queryFn: async () => {
      // Corpus fund contributions
      let corpusQuery = supabase
        .from('corpus_fund_contributions')
        .select('id, amount, contribution_mode, contribution_date, donor_name, donor_id, trust_id');

      if (filters.trustFilter && filters.trustFilter !== 'all') {
        corpusQuery = corpusQuery.eq('trust_id', filters.trustFilter);
      }
      if (filters.dateRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.dateRange);
        corpusQuery = corpusQuery.gte('contribution_date', startDate.toISOString().split('T')[0]);
      }

      const { data: corpus, error: corpusError } = await corpusQuery;
      if (corpusError) throw corpusError;

      // Kind donations
      let kindQuery = supabase
        .from('kind_donations')
        .select('id, item_type, quantity, estimated_value, received_date, donor_name, donor_id, home_id, trust_id');

      if (filters.trustFilter && filters.trustFilter !== 'all') {
        kindQuery = kindQuery.eq('trust_id', filters.trustFilter);
      }
      if (filters.homeFilter && filters.homeFilter !== 'all') {
        kindQuery = kindQuery.eq('home_id', filters.homeFilter);
      }
      if (filters.dateRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.dateRange);
        kindQuery = kindQuery.gte('received_date', startDate.toISOString().split('T')[0]);
      }

      const { data: kind, error: kindError } = await kindQuery;
      if (kindError) throw kindError;

      // Aggregate corpus by mode
      const corpusModeMap = new Map<string, { value: number; count: number }>();
      (corpus || []).forEach(c => {
        const mode = c.contribution_mode || 'Unknown';
        const existing = corpusModeMap.get(mode) || { value: 0, count: 0 };
        corpusModeMap.set(mode, { value: existing.value + c.amount, count: existing.count + 1 });
      });

      // Aggregate kind by type
      const kindTypeMap = new Map<string, { quantity: number; value: number }>();
      (kind || []).forEach(k => {
        const existing = kindTypeMap.get(k.item_type) || { quantity: 0, value: 0 };
        kindTypeMap.set(k.item_type, {
          quantity: existing.quantity + (k.quantity || 1),
          value: existing.value + (k.estimated_value || 0),
        });
      });

      return {
        corpusTotal: (corpus || []).reduce((sum, c) => sum + c.amount, 0),
        corpusCount: (corpus || []).length,
        corpusByMode: Array.from(corpusModeMap.entries()).map(([name, d]) => ({ name, value: d.value, count: d.count })),
        recentCorpus: (corpus || [])
          .sort((a, b) => new Date(b.contribution_date).getTime() - new Date(a.contribution_date).getTime())
          .slice(0, 5)
          .map(c => ({
            id: c.id,
            donorName: c.donor_name || 'Anonymous',
            amount: c.amount,
            date: c.contribution_date,
            mode: c.contribution_mode,
          })),
        kindTotal: (kind || []).reduce((sum, k) => sum + (k.quantity || 1), 0),
        kindCount: (kind || []).length,
        kindTotalValue: (kind || []).reduce((sum, k) => sum + (k.estimated_value || 0), 0),
        kindByType: Array.from(kindTypeMap.entries()).map(([name, d]) => ({ name, quantity: d.quantity, value: d.value })),
        recentKind: (kind || [])
          .sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime())
          .slice(0, 5)
          .map(k => ({
            id: k.id,
            donorName: k.donor_name || 'Anonymous',
            itemType: k.item_type,
            quantity: k.quantity || 1,
            value: k.estimated_value || 0,
            date: k.received_date,
          })),
      } as CorpusKindSummary;
    },
  });
}

// Monthly Trend (real data)
export function useMonthlyTrend(months = 6) {
  return useQuery({
    queryKey: ['report-monthly-trend', months],
    queryFn: async () => {
      const now = new Date();
      const startDate = subMonths(startOfMonth(now), months - 1);

      const [donationsRes, needsRes] = await Promise.all([
        supabase
          .from('donations')
          .select('id, amount_pledged, created_at')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('needs')
          .select('id, created_at')
          .gte('created_at', startDate.toISOString()),
      ]);

      if (donationsRes.error) throw donationsRes.error;
      if (needsRes.error) throw needsRes.error;

      const result: MonthlyTrendData[] = [];
      for (let i = 0; i < months; i++) {
        const monthDate = subMonths(now, months - 1 - i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const label = format(monthDate, 'MMM');

        const monthDonations = (donationsRes.data || []).filter(d => {
          const date = new Date(d.created_at!);
          return date >= monthStart && date <= monthEnd;
        });

        const monthNeeds = (needsRes.data || []).filter(n => {
          const date = new Date(n.created_at!);
          return date >= monthStart && date <= monthEnd;
        });

        result.push({
          month: label,
          donations: monthDonations.reduce((sum, d) => sum + d.amount_pledged, 0),
          needs: monthNeeds.length,
        });
      }

      return result;
    },
  });
}

// Export hooks (kept for backward compat)
export function useExportDonations() {
  return useQuery({
    queryKey: ['export-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select(`id, amount_pledged, sponsorship_type, status, start_date, profiles:donor_id (name), homes (name)`);
      if (error) throw error;
      return data || [];
    },
    enabled: false,
  });
}

export function useExportNeeds() {
  return useQuery({
    queryKey: ['export-needs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('needs')
        .select(`id, description, status, current_sponsors_count, max_sponsors_allowed, date, homes (name)`);
      if (error) throw error;
      return data || [];
    },
    enabled: false,
  });
}

export function useExportTasks() {
  return useQuery({
    queryKey: ['export-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`id, title, status, priority, due_date, profiles:assigned_to (name)`);
      if (error) throw error;
      return data || [];
    },
    enabled: false,
  });
}
