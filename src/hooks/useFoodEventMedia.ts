import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function authFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

export interface PendingFoodEventMedia {
  id: string;
  date: string;
  time_slot: string;
  meal_type?: string | null;
  donor_id?: string | null;
  donor_name?: string | null;
  home_id: string;
  home_name: string;
  completion_photos: string[];
  completion_videos: string[];
  completion_notes?: string | null;
  event_media_submitted_at?: string | null;
}

export function usePendingFoodEventMedia() {
  return useQuery({
    queryKey: ['pending-food-event-media'],
    queryFn: async () => {
      const data = await authFetch('/food-slots/pending-event-media');
      return (data.items || []) as PendingFoodEventMedia[];
    },
  });
}

export function useApprovedFoodEventMediaAwaitingSend() {
  return useQuery({
    queryKey: ['approved-food-event-media'],
    queryFn: async () => {
      const data = await authFetch('/food-slots/approved-event-media-awaiting-send');
      return (data.items || []) as PendingFoodEventMedia[];
    },
  });
}

export function useSubmitFoodEventMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slotId,
      photos,
      videos,
      notes,
    }: {
      slotId: string;
      photos: string[];
      videos: string[];
      notes?: string;
    }) =>
      authFetch(`/food-slots/${slotId}/submit-event-media`, {
        method: 'POST',
        body: JSON.stringify({ photos, videos, notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
      qc.invalidateQueries({ queryKey: ['future-booked-food-slots'] });
      qc.invalidateQueries({ queryKey: ['pending-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveFoodEventMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) =>
      authFetch(`/food-slots/${slotId}/approve-event-media`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['approved-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
      qc.invalidateQueries({ queryKey: ['home-work-done'] });
      toast.success('Event media approved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectFoodEventMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, notes }: { slotId: string; notes?: string }) =>
      authFetch(`/food-slots/${slotId}/reject-event-media`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
      toast.success('Event media rejected — social worker notified to re-upload');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSendFoodEventMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, customMessage }: { slotId: string; customMessage?: string }) =>
      authFetch(`/food-slots/${slotId}/send-event-media`, {
        method: 'POST',
        body: JSON.stringify({ customMessage }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['approved-food-event-media'] });
      qc.invalidateQueries({ queryKey: ['completed-food-slots'] });
      qc.invalidateQueries({ queryKey: ['food-slots'] });
      qc.invalidateQueries({ queryKey: ['warden-task-bar'] });
      qc.invalidateQueries({ queryKey: ['home-work-done'] });
      toast.success('Event media sent to donor via email & WhatsApp');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
