import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HomeType {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export function useHomeTypes() {
  return useQuery({
    queryKey: ['home-types', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_types')
        .select('*')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data as HomeType[];
    },
  });
}

export function useAllHomeTypes() {
  return useQuery({
    queryKey: ['home-types', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_types')
        .select('*')
        .order('label');

      if (error) throw error;
      return data as HomeType[];
    },
  });
}

export function useCreateHomeType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (homeType: { key: string; label: string; description?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('home_types')
        .insert(homeType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-types'] });
    },
  });
}

export function useUpdateHomeType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; key?: string; label?: string; description?: string; icon?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('home_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-types'] });
    },
  });
}

export function useDeleteHomeType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('home_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-types'] });
    },
  });
}
