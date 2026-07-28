import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationType } from '@/types';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  dedupe_key?: string | null;
  created_at: string;
}

export const NOTIFICATION_POLL_MS = 8_000;

export function invalidateDonorNotifications(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useNotifications(userId?: string | null, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: options?.poll ? NOTIFICATION_POLL_MS : false,
    refetchIntervalInBackground: true,
  });
}

export function useUnreadNotificationCount(userId?: string | null, options?: { poll?: boolean }) {
  const { data } = useNotifications(userId, options);
  const notifications = Array.isArray(data) ? data : [];
  return {
    data: notifications.filter((n) => !n.is_read).length,
    isLoading: false,
    isError: false,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      const unread = (data as Notification[]) ?? [];
      await Promise.all(
        unread.map((notification) =>
          supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification.id),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...params,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.user_id] });
    },
  });
}
