import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DonorCategory {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

// Fetch all donor categories
export function useAllDonorCategories() {
  return useQuery({
    queryKey: ['donor-categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donor_categories')
        .select('*')
        .order('label');

      if (error) throw error;
      return data as DonorCategory[];
    },
  });
}

// Fetch only active donor categories (for dropdowns)
export function useActiveDonorCategories() {
  return useQuery({
    queryKey: ['donor-categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donor_categories')
        .select('*')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data as DonorCategory[];
    },
  });
}

// Create donor category
export function useCreateDonorCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key: string; label: string; description?: string; color?: string }) => {
      const { data: newCategory, error } = await supabase
        .from('donor_categories')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return newCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-categories'] });
      toast.success('Donor category created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create donor category: ' + error.message);
    },
  });
}

// Update donor category
export function useUpdateDonorCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; key?: string; label?: string; description?: string; color?: string; is_active?: boolean }) => {
      const { id, ...updateData } = data;
      const { data: updated, error } = await supabase
        .from('donor_categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-categories'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update donor category: ' + error.message);
    },
  });
}

// Delete donor category
export function useDeleteDonorCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('donor_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-categories'] });
      toast.success('Donor category deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete donor category: ' + error.message);
    },
  });
}
