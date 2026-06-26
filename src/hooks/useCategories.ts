import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface SubSubcategory {
  id: string;
  subcategory_id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('label');

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
        .order('label');

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCategory(categoryId: string | null) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .maybeSingle();

      if (error) throw error;
      return data as Category | null;
    },
    enabled: !!categoryId,
  });
}

export function useSubcategories(categoryId?: string | null) {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('label');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subcategory[];
    },
  });
}

export function useAllSubcategories(categoryId?: string | null) {
  return useQuery({
    queryKey: ['subcategories', 'all', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('subcategories')
        .select('*')
        .order('display_order')
        .order('label');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subcategory[];
    },
  });
}

// Category mutations
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { key: string; label: string; description?: string; icon?: string }) => {
      const { data: result, error } = await supabase
        .from('categories')
        .insert({
          key: data.key,
          label: data.label,
          description: data.description || null,
          icon: data.icon || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; key?: string; label?: string; description?: string | null; icon?: string | null; is_active?: boolean; display_order?: number }) => {
      const { data: result, error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategoryOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, display_order }: { id: string; display_order: number }) => {
      const { data: result, error } = await supabase
        .from('categories')
        .update({ display_order })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// Subcategory mutations
export function useCreateSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { category_id: string; label: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('subcategories')
        .insert({
          category_id: data.category_id,
          label: data.label,
          description: data.description || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; category_id?: string; label?: string; description?: string | null; is_active?: boolean; display_order?: number }) => {
      const { data: result, error } = await supabase
        .from('subcategories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
}

export function useUpdateSubcategoryOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, display_order }: { id: string; display_order: number }) => {
      const { data: result, error } = await supabase
        .from('subcategories')
        .update({ display_order })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
}

// Sub-subcategory queries
export function useSubSubcategories(subcategoryId?: string | null) {
  return useQuery({
    queryKey: ['sub_subcategories', subcategoryId],
    queryFn: async () => {
      let query = supabase
        .from('sub_subcategories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('label');

      if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubSubcategory[];
    },
  });
}

export function useAllSubSubcategories(subcategoryId?: string | null) {
  return useQuery({
    queryKey: ['sub_subcategories', 'all', subcategoryId],
    queryFn: async () => {
      let query = supabase
        .from('sub_subcategories')
        .select('*')
        .order('display_order')
        .order('label');

      if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubSubcategory[];
    },
  });
}

// Sub-subcategory mutations
export function useCreateSubSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { subcategory_id: string; label: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('sub_subcategories')
        .insert({
          subcategory_id: data.subcategory_id,
          label: data.label,
          description: data.description || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_subcategories'] });
    },
  });
}

export function useUpdateSubSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; subcategory_id?: string; label?: string; description?: string | null; is_active?: boolean; display_order?: number }) => {
      const { data: result, error } = await supabase
        .from('sub_subcategories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_subcategories'] });
    },
  });
}

export function useDeleteSubSubcategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sub_subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_subcategories'] });
    },
  });
}

export function useUpdateSubSubcategoryOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, display_order }: { id: string; display_order: number }) => {
      const { data: result, error } = await supabase
        .from('sub_subcategories')
        .update({ display_order })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_subcategories'] });
    },
  });
}
