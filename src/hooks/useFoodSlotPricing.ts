import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FoodSlotPricing {
  id: string;
  time_slot: string;
  label: string;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useFoodSlotPricing() {
  return useQuery({
    queryKey: ['food-slot-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_slot_pricing')
        .select('*')
        .order('time_slot');
      
      if (error) throw error;
      return data as FoodSlotPricing[];
    },
  });
}

export function useFoodSlotPricingMap() {
  const { data: pricing, ...rest } = useFoodSlotPricing();
  
  const priceMap = pricing?.reduce((acc, item) => {
    acc[item.time_slot] = item.price;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return { priceMap, pricing, ...rest };
}

interface UpdateFoodSlotPricingParams {
  id: string;
  price: number;
  label?: string;
  description?: string;
}

export function useUpdateFoodSlotPricing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, price, label, description }: UpdateFoodSlotPricingParams) => {
      const updateData: Record<string, unknown> = { price };
      if (label !== undefined) updateData.label = label;
      if (description !== undefined) updateData.description = description;
      
      const { data, error } = await supabase
        .from('food_slot_pricing')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-slot-pricing'] });
    },
  });
}
