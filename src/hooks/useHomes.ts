import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import type { Database } from '@/integrations/supabase/types';

type HomeType = Database['public']['Enums']['home_type'];

export interface Home {
  id: string;
  trust_id: string;
  name: string;
  type: HomeType;
  description: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  capacity_children_male: number | null;
  capacity_children_female: number | null;
  capacity_elderly_male: number | null;
  capacity_elderly_female: number | null;
  primary_warden_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  year_established: number | null;
  supported_by: string | null;
  contact_details: string | null;
  facilities?: string | null;
}

export interface HomeWithTrust extends Home {
  primary_social_worker?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  trusts?: {
    id: string;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    registration_number?: string;
  } | null;
}

export function useHomes(trustId?: string | null) {
  return useQuery({
    queryKey: ['homes', trustId],
    queryFn: async () => {
      let query = supabase
        .from('homes')
        .select(`
          *,
          trusts (id, name)
        `)
        .order('name');

      if (trustId) {
        query = query.eq('trust_id', trustId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as HomeWithTrust[]).map((home) => ({
        ...home,
        image_url: normalizeMediaUrl(home.image_url),
      }));
    },
  });
}

export function useHome(homeId: string | null) {
  return useQuery({
    queryKey: ['home', homeId],
    queryFn: async () => {
      if (!homeId) return null;

      const { data, error } = await supabase
        .from('homes')
        .select(`
          *,
          trusts (id, name, contact_email, contact_phone, description, registration_number),
          primary_warden (id, name, email, phone)
        `)
        .eq('id', homeId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const home = data as HomeWithTrust & { primary_warden?: HomeWithTrust['primary_social_worker'] };
      const primarySocialWorker = home.primary_social_worker ?? home.primary_warden ?? null;
      return {
        ...home,
        image_url: normalizeMediaUrl(home.image_url),
        primary_social_worker: primarySocialWorker,
      };
    },
    enabled: !!homeId,
  });
}

export function useTrusts() {
  return useQuery({
    queryKey: ['trusts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusts')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}
