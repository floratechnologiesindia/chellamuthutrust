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
  donor_frequency?: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME' | null;
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
  donor_frequency?: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  religion?: string;
  referred_by?: string;
}

export const useDonors = () => {
  return useQuery({
    queryKey: ['donors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('donors').select('*');
      if (error) throw new Error(error.message);
      return (data || []) as DonorWithStats[];
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
          donor_frequency: data.donor_frequency,
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
