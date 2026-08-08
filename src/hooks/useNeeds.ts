import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type NeedStatus = Database['public']['Enums']['need_status'];
type HelpMode = Database['public']['Enums']['help_mode'];
type RecurringFrequency = Database['public']['Enums']['recurring_frequency'];

export type DonationMode = 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Need {
  id: string;
  home_id: string;
  trust_id: string;
  category_id: string;
  subcategory_id?: string | null;
  sub_subcategory_id?: string | null;
  date: string;
  quantity: number;
  unit: string;
  help_mode: HelpMode;
  recurring_frequency?: RecurringFrequency | null;
  recurring_end_date?: string | null;
  description?: string | null;
  max_sponsors_allowed?: number;
  current_sponsors_count?: number;
  status?: NeedStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Monetary tracking
  donation_mode?: DonationMode;
  required_amount?: number;
  collected_amount?: number;
  // Product tracking
  required_product_qty?: number;
  fulfilled_product_qty?: number;
  product_name?: string | null;
  product_unit?: string | null;
  // Enhanced product details
  product_specification?: string | null;
  product_link?: string | null;
  estimated_unit_price?: number | null;
  // File attachments
  photo_urls?: string[] | null;
  quotation_urls?: string[] | null;
  // Staff & submitter info
  staff_name?: string | null;
  submitter_email?: string | null;
  // Approval tracking
  approval_status?: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  // Fulfillment
  fulfillment_details?: string | null;
}

export interface NeedWithRelations extends Need {
  homes?: {
    id: string;
    name: string;
    city: string;
    state?: string;
    description?: string | null;
    image_url: string | null;
  } | null;
  categories?: {
    id: string;
    key: string;
    label: string;
    icon: string | null;
  } | null;
  subcategories?: {
    id: string;
    label: string;
  } | null;
}

export interface NeedFilters {
  homeId?: string | null;
  trustId?: string | null;
  categoryId?: string | null;
  status?: NeedStatus | null;
  date?: string | null;
  helpMode?: HelpMode | null;
  donationMode?: DonationMode | null;
}

export function useNeeds(filters?: NeedFilters) {
  return useQuery({
    queryKey: ['needs', filters],
    queryFn: async () => {
      let query = supabase
        .from('needs')
        .select(`
          *,
          homes (id, name, city, image_url),
          categories (id, key, label, icon),
          subcategories (id, label)
        `)
        .order('date', { ascending: false });

      if (filters?.homeId) {
        query = query.eq('home_id', filters.homeId);
      }
      if (filters?.trustId) {
        query = query.eq('trust_id', filters.trustId);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        query = query.eq('date', filters.date);
      }
      if (filters?.helpMode) {
        query = query.eq('help_mode', filters.helpMode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NeedWithRelations[];
    },
  });
}

export function useNeed(needId: string | null) {
  return useQuery({
    queryKey: ['need', needId],
    queryFn: async () => {
      if (!needId) return null;

      const { data, error } = await supabase
        .from('needs')
        .select(`
          *,
          homes (id, name, city, state, description, image_url),
          categories (id, key, label, icon),
          subcategories (id, label)
        `)
        .eq('id', needId)
        .maybeSingle();

      if (error) throw error;
      return data as NeedWithRelations | null;
    },
    enabled: !!needId,
  });
}

export interface CreateNeedParams {
  home_id: string;
  trust_id: string;
  category_id: string;
  subcategory_id?: string | null;
  sub_subcategory_id?: string | null;
  date: string;
  quantity: number;
  unit: string;
  help_mode: HelpMode;
  recurring_frequency?: RecurringFrequency | null;
  recurring_end_date?: string | null;
  description?: string | null;
  max_sponsors_allowed?: number;
  // Donation mode fields
  donation_mode?: DonationMode;
  required_amount?: number;
  required_product_qty?: number;
  product_name?: string | null;
  product_unit?: string | null;
  // Enhanced product details
  product_specification?: string | null;
  product_link?: string | null;
  estimated_unit_price?: number | null;
  // File attachments
  photo_urls?: string[] | null;
  quotation_urls?: string[] | null;
  // Staff & submitter info
  staff_name?: string | null;
  submitter_email?: string | null;
}

export function useCreateNeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateNeedParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('needs')
        .insert({
          ...params,
          status: 'OPEN',
          current_sponsors_count: 0,
          approval_status: 'PENDING',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needs'] });
    },
  });
}

export interface UpdateNeedParams {
  id: string;
  quantity?: number;
  unit?: string;
  description?: string | null;
  max_sponsors_allowed?: number;
  status?: NeedStatus;
  donation_mode?: DonationMode;
  required_amount?: number;
  required_product_qty?: number;
  product_name?: string | null;
  product_unit?: string | null;
  product_specification?: string | null;
  product_link?: string | null;
  estimated_unit_price?: number | null;
  // File attachments
  photo_urls?: string[] | null;
  quotation_urls?: string[] | null;
  // Approval fields
  approval_status?: ApprovalStatus;
  approval_notes?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  fulfillment_details?: string | null;
}

export function useUpdateNeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...params }: UpdateNeedParams) => {
      const { data, error } = await supabase
        .from('needs')
        .update(params)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['needs'] });
      queryClient.invalidateQueries({ queryKey: ['need', variables.id] });
    },
  });
}

export function useDeleteNeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (needId: string) => {
      const { error } = await supabase
        .from('needs')
        .delete()
        .eq('id', needId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needs'] });
    },
  });
}
