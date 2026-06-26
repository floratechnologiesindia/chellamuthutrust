import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useResidents(homeId: string | null) {
  return useQuery({
    queryKey: ['residents', homeId],
    queryFn: async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('home_id', homeId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!homeId,
  });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      home_id: string;
      name: string;
      age: number;
      gender: string;
      category: 'child' | 'old_age' | 'others';
      status?: 'active' | 'moved_out' | 'deceased';
      special_needs?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('residents')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useUpdateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      age?: number;
      gender?: string;
      category?: 'child' | 'old_age' | 'others';
      status?: 'active' | 'moved_out' | 'deceased';
      special_needs?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('residents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}
