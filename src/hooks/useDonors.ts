import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Donor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  donor_category: 'monthly' | 'yearly' | 'public' | 'csr' | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  requires_80g: boolean | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  working_sector: 'private' | 'govt' | 'others' | null;
  designation: string | null;
  donor_type: 'indian' | 'nri' | 'foreigner' | null;
  religion: string | null;
  referred_by: string | null;
}

export interface DonorWithStats extends Donor {
  total_donations_amount: number;
  total_donations_count: number;
  total_food_slots_amount: number;
  total_food_slots_count: number;
  last_interaction: string | null;
}

export interface CreateDonorData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  organization?: string;
  donor_category?: 'monthly' | 'yearly' | 'public' | 'csr';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan_number?: string;
  aadhar_number?: string;
  requires_80g?: boolean;
  notes?: string;
  working_sector?: 'private' | 'govt' | 'others';
  designation?: string;
  donor_type?: 'indian' | 'nri' | 'foreigner';
  religion?: string;
  referred_by?: string;
}

const CHUNK_SIZE = 100;

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const useDonors = () => {
  return useQuery({
    queryKey: ['donors'],
    queryFn: async () => {
      // Step 1: explicit donor IDs from user_roles (no embedded join — schema cache lacks FK)
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'donor');

      if (rolesError) throw rolesError;

      const donorIds = Array.from(new Set((roles || []).map((r: any) => r.user_id).filter(Boolean)));
      if (donorIds.length === 0) return [];

      const idChunks = chunk(donorIds, CHUNK_SIZE);

      // Step 2: chunked profiles fetch
      const profileChunks = await Promise.all(
        idChunks.map(ids => supabase.from('profiles').select('*').in('id', ids))
      );
      const profiles: any[] = [];
      for (const r of profileChunks) {
        if (r.error) throw r.error;
        if (r.data) profiles.push(...r.data);
      }

      // Step 3: chunked donations + food_slots stats (filtered by donor IDs to avoid 1000-row truncation)
      const donationChunks = await Promise.all(
        idChunks.map(ids =>
          supabase.from('donations').select('donor_id, amount_pledged, created_at').in('donor_id', ids)
        )
      );
      const donations: any[] = [];
      for (const r of donationChunks) {
        if (r.error) throw r.error;
        if (r.data) donations.push(...r.data);
      }

      const foodSlotChunks = await Promise.all(
        idChunks.map(ids =>
          supabase.from('food_slots').select('donor_id, amount, created_at').in('donor_id', ids)
        )
      );
      const foodSlots: any[] = [];
      for (const r of foodSlotChunks) {
        if (r.error) throw r.error;
        if (r.data) foodSlots.push(...r.data);
      }

      // Aggregate stats per donor
      const statsMap: Record<string, { total_donations_amount: number; total_donations_count: number; total_food_slots_amount: number; total_food_slots_count: number; last_interaction: string | null }> = {};
      for (const id of donorIds) {
        statsMap[id] = { total_donations_amount: 0, total_donations_count: 0, total_food_slots_amount: 0, total_food_slots_count: 0, last_interaction: null };
      }
      const lastTimes: Record<string, number> = {};
      for (const d of donations) {
        const s = statsMap[d.donor_id]; if (!s) continue;
        s.total_donations_amount += Number(d.amount_pledged) || 0;
        s.total_donations_count += 1;
        const t = d.created_at ? new Date(d.created_at).getTime() : 0;
        if (t > (lastTimes[d.donor_id] || 0)) lastTimes[d.donor_id] = t;
      }
      for (const f of foodSlots) {
        const s = statsMap[f.donor_id]; if (!s) continue;
        s.total_food_slots_amount += Number(f.amount) || 0;
        s.total_food_slots_count += 1;
        const t = f.created_at ? new Date(f.created_at).getTime() : 0;
        if (t > (lastTimes[f.donor_id] || 0)) lastTimes[f.donor_id] = t;
      }
      for (const id of Object.keys(lastTimes)) {
        if (statsMap[id] && lastTimes[id] > 0) statsMap[id].last_interaction = new Date(lastTimes[id]).toISOString();
      }

      const donorsWithStats: DonorWithStats[] = profiles.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        organization: profile.organization || null,
        donor_category: profile.donor_category || null,
        address: profile.address || null,
        city: profile.city || null,
        state: profile.state || null,
        pincode: profile.pincode || null,
        pan_number: profile.pan_number || null,
        aadhar_number: profile.aadhar_number || null,
        requires_80g: profile.requires_80g || null,
        notes: profile.notes || null,
        status: profile.status,
        created_at: profile.created_at,
        working_sector: profile.working_sector || null,
        designation: profile.designation || null,
        donor_type: profile.donor_type || null,
        religion: profile.religion || null,
        referred_by: profile.referred_by || null,
        ...(statsMap[profile.id] || { total_donations_amount: 0, total_donations_count: 0, total_food_slots_amount: 0, total_food_slots_count: 0, last_interaction: null }),
      }));

      return donorsWithStats;
    },
  });
};

export const useCreateDonor = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDonorData) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone,
          role: 'donor',
          organization: data.organization,
          donor_category: data.donor_category,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          pan_number: data.pan_number,
          aadhar_number: data.aadhar_number,
          requires_80g: data.requires_80g,
          notes: data.notes,
          working_sector: data.working_sector,
          designation: data.designation,
          donor_type: data.donor_type,
          religion: data.religion,
          referred_by: data.referred_by
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      toast.success('Donor created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create donor');
    }
  });
};

export const useUpdateDonorStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      toast.success('Donor status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    }
  });
};

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  organization?: string;
  donor_category?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan_number?: string;
  aadhar_number?: string;
  requires_80g?: boolean;
  notes?: string;
  working_sector?: string;
  designation?: string;
  donor_type?: string;
  religion?: string;
  referred_by?: string;
}

export const useUpdateDonorProfile = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', session.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });
};

export const useDonor = (id: string | undefined) => {
  return useQuery({
    queryKey: ['donor', id],
    queryFn: async () => {
      if (!id) throw new Error('Donor ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Donor;
    },
    enabled: !!id
  });
};

export const useUpdateDonor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProfileUpdateData }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      queryClient.invalidateQueries({ queryKey: ['donor'] });
      toast.success('Donor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update donor');
    }
  });
};

export const useDeleteDonor = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (donorId: string) => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('delete-donor', {
        body: { donorId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      toast.success('Donor deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete donor');
    }
  });
};
