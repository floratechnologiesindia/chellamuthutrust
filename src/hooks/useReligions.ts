import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Religion {
  id: string;
  label: string;
  key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// Fetch all religions (for admin management)
export const useAllReligions = () => {
  return useQuery({
    queryKey: ['religions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('religions')
        .select('*')
        .order('label');

      if (error) throw error;
      return data as Religion[];
    }
  });
};

// Fetch only active religions (for dropdowns)
export const useActiveReligions = () => {
  return useQuery({
    queryKey: ['religions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('religions')
        .select('*')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data as Religion[];
    }
  });
};

// Create a new religion
export const useCreateReligion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { label: string; key: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('religions')
        .insert({
          label: data.label,
          key: data.key,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions'] });
      toast.success('Religion created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create religion');
    }
  });
};

// Update an existing religion
export const useUpdateReligion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      label?: string; 
      key?: string; 
      description?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('religions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update religion');
    }
  });
};

// Delete a religion
export const useDeleteReligion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('religions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions'] });
      toast.success('Religion deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete religion');
    }
  });
};
