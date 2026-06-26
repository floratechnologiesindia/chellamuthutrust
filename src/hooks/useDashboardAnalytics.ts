import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';

export interface MonthlyDonation {
  month: string;
  oneTime: number;
  recurring: number;
  total: number;
}

export interface DailyTaskActivity {
  date: string;
  created: number;
  completed: number;
}

export interface TaskCompletionPerformance {
  onTime: number;
  delayed: number;
  onTimeRate: number;
}

export function useMonthlyDonationTrends(months = 6) {
  return useQuery({
    queryKey: ['monthly-donation-trends', months],
    queryFn: async () => {
      const results: MonthlyDonation[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('donations')
          .select('amount_pledged, sponsorship_type, created_at')
          .gte('created_at', start)
          .lte('created_at', end);
        
        if (error) throw error;
        
        const oneTime = data?.filter(d => d.sponsorship_type === 'ONE_TIME')
          .reduce((sum, d) => sum + d.amount_pledged, 0) || 0;
        const recurring = data?.filter(d => d.sponsorship_type === 'RECURRING')
          .reduce((sum, d) => sum + d.amount_pledged, 0) || 0;
        
        results.push({
          month: format(monthDate, 'MMM'),
          oneTime,
          recurring,
          total: oneTime + recurring,
        });
      }
      
      return results;
    },
  });
}

export function useDailyTaskActivity(days = 7) {
  return useQuery({
    queryKey: ['daily-task-activity', days],
    queryFn: async () => {
      const results: DailyTaskActivity[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get tasks created on this day
        const { data: created, error: createdError } = await supabase
          .from('tasks')
          .select('id')
          .gte('created_at', `${dateStr}T00:00:00`)
          .lt('created_at', `${dateStr}T23:59:59`);
        
        if (createdError) throw createdError;
        
        // Get tasks completed on this day
        const { data: completed, error: completedError } = await supabase
          .from('tasks')
          .select('id')
          .gte('completed_at', `${dateStr}T00:00:00`)
          .lt('completed_at', `${dateStr}T23:59:59`);
        
        if (completedError) throw completedError;
        
        results.push({
          date: format(date, 'EEE'),
          created: created?.length || 0,
          completed: completed?.length || 0,
        });
      }
      
      return results;
    },
  });
}

export function useTaskCompletionPerformance() {
  return useQuery({
    queryKey: ['task-completion-performance'],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('due_date, completed_at, status')
        .eq('status', 'COMPLETED');
      
      if (error) throw error;
      
      let onTime = 0;
      let delayed = 0;
      
      tasks?.forEach(task => {
        if (task.completed_at && task.due_date) {
          const completed = new Date(task.completed_at);
          const due = new Date(task.due_date);
          if (completed <= due) {
            onTime++;
          } else {
            delayed++;
          }
        }
      });
      
      const total = onTime + delayed;
      return {
        onTime,
        delayed,
        onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
      } as TaskCompletionPerformance;
    },
  });
}

export function useNeedsByCategory() {
  return useQuery({
    queryKey: ['needs-by-category'],
    queryFn: async () => {
      const { data: needs, error: needsError } = await supabase
        .from('needs')
        .select(`
          id,
          category_id,
          categories (label)
        `);
      
      if (needsError) throw needsError;
      
      const categoryMap = new Map<string, number>();
      
      needs?.forEach(need => {
        const label = (need.categories as any)?.label || 'Other';
        categoryMap.set(label, (categoryMap.get(label) || 0) + 1);
      });
      
      return Array.from(categoryMap.entries()).map(([name, value]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        value,
      }));
    },
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [trusts, homes, profiles, donations, needs, tasks] = await Promise.all([
        supabase.from('trusts').select('id', { count: 'exact' }),
        supabase.from('homes').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('donations').select('id, amount_pledged, sponsorship_type'),
        supabase.from('needs').select('id, status'),
        supabase.from('tasks').select('id, status, due_date'),
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const donationsData = donations.data || [];
      const needsData = needs.data || [];
      const tasksData = tasks.data || [];
      
      return {
        totalTrusts: trusts.count || 0,
        totalHomes: homes.count || 0,
        totalUsers: profiles.count || 0,
        totalDonations: donationsData.length,
        totalAmount: donationsData.reduce((sum, d) => sum + d.amount_pledged, 0),
        recurringDonations: donationsData.filter(d => d.sponsorship_type === 'RECURRING').length,
        openNeeds: needsData.filter(n => n.status === 'OPEN').length,
        partialNeeds: needsData.filter(n => n.status === 'PARTIAL').length,
        fullySponsored: needsData.filter(n => n.status === 'FULLY_SPONSORED').length,
        pendingTasks: tasksData.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        overdueTasks: tasksData.filter(t => 
          (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.due_date < today
        ).length,
      };
    },
  });
}

export function useRecentTrustsWithStats() {
  return useQuery({
    queryKey: ['recent-trusts-with-stats'],
    queryFn: async () => {
      const { data: trusts, error: trustsError } = await supabase
        .from('trusts')
        .select('id, name, city, state, image_url')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (trustsError) throw trustsError;
      
      const { data: homes } = await supabase.from('homes').select('id, trust_id');
      const { data: needs } = await supabase.from('needs').select('id, trust_id, status');
      
      return trusts?.map(trust => ({
        ...trust,
        homesCount: homes?.filter(h => h.trust_id === trust.id).length || 0,
        openNeedsCount: needs?.filter(n => n.trust_id === trust.id && n.status === 'OPEN').length || 0,
      })) || [];
    },
  });
}

export function useRecentNeedsWithHomes(limit = 5) {
  return useQuery({
    queryKey: ['recent-needs-with-homes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('needs')
        .select(`
          id,
          description,
          status,
          date,
          current_sponsors_count,
          max_sponsors_allowed,
          homes (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
  });
}
