import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendFoodReceiptThankYou } from '@/lib/sendFoodReceiptThankYou';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function authFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

export interface WardenDashboardStats {
  period: { start: string; end: string };
  food: {
    total_sponsorships: number;
    total_value: number;
    breakfast: number;
    lunch: number;
    dinner: number;
    refreshments: number;
    outside_food: number;
  };
  payment: {
    total_bookings: number;
    paid: number;
    pending: number;
    partial: number;
    cancelled: number;
    upcoming: number;
    completed: number;
  };
  kind: {
    total_count: number;
    estimated_value: number;
    by_type: Record<string, number>;
  };
  requirements: {
    listed: number;
    listed_value: number;
    fully_sponsored: number;
    partially_sponsored: number;
    pending: number;
  };
  donations_count: number;
  chart: { date: string; amount: number }[];
}

export type DerivedTaskItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  href: string;
  due_date?: string;
};

export function useWardenDashboardStats(
  homeId: string | null,
  period: PeriodPreset,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ['warden-dashboard-stats', homeId, period, startDate, endDate],
    queryFn: async () => {
      if (!homeId) return null;
      const params = new URLSearchParams({ homeId, period });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return (await authFetch(`/warden/dashboard-stats?${params}`)) as WardenDashboardStats;
    },
    enabled: !!homeId,
  });
}

export function useWardenTaskBar(homeId: string | null) {
  return useQuery({
    queryKey: ['warden-task-bar', homeId],
    queryFn: async () => {
      if (!homeId) return [] as DerivedTaskItem[];
      const json = await authFetch(`/warden/task-bar?homeId=${homeId}`);
      return (json.items || []) as DerivedTaskItem[];
    },
    enabled: !!homeId,
    refetchInterval: 60_000,
  });
}

export function useUpdateWardenHomeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ homeId, updates }: { homeId: string; updates: Record<string, unknown> }) => {
      return authFetch(`/warden/homes/${homeId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['home', vars.homeId] });
      qc.invalidateQueries({ queryKey: ['homes'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
  });
}

export function useSendFoodReceiptThankYou() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotIds, force }: { slotIds: string[]; force?: boolean }) =>
      sendFoodReceiptThankYou(slotIds, { force }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
    },
  });
}

export function useSendFoodThankYou() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => authFetch(`/food-slots/${slotId}/thank-you`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
  });
}

export function useShareFoodPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => authFetch(`/food-slots/${slotId}/share-photos`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
  });
}

export function useMarkChequePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) =>
      authFetch(`/food-slots/${slotId}/mark-cheque-paid`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['food-slots-all-homes'] });
      qc.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
  });
}

export function useSendFoodPaymentReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, force }: { slotId: string; force?: boolean }) =>
      authFetch(`/food-slots/${slotId}/send-payment-reminder`, {
        method: 'POST',
        body: JSON.stringify({ force: force === true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
      qc.invalidateQueries({ queryKey: ['food-payment-reminder-eligible'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
  });
}

export function useFoodPaymentReminderEligible(homeId: string | null) {
  return useQuery({
    queryKey: ['food-payment-reminder-eligible', homeId],
    queryFn: async () => {
      if (!homeId) return { items: [], count: 0 };
      return authFetch(`/food-slots/payment-reminder-eligible?homeId=${homeId}`) as Promise<{
        items: Array<{ id: string; days_pending: number; balance_due: number }>;
        count: number;
      }>;
    },
    enabled: !!homeId,
  });
}
