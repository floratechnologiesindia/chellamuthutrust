import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplayName } from '@/lib/roleLabels';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
  trust_id: string | null;
  home_id: string | null;
  created_at: string | null;
  role: 'super_admin' | 'admin' | 'employee' | 'warden' | 'donor' | 'finance';
  home_name?: string | null;
  trust_name?: string | null;
  assigned_projects?: Array<{ home_id: string; is_primary: boolean; name: string | null; city: string | null }>;
  assigned_project_names?: string[];
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'employee' | 'warden' | 'donor' | 'finance';
  trust_id?: string;
  home_id?: string;
}

// Password generation utility
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return ((data || []) as UserWithRole[]).map((user) => ({
        ...user,
        name: formatUserDisplayName(user.name),
      }));
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session. Please log in again.');
      }

      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated. Please log in as a Super Admin to create users.');
      }

      console.log('Invoking create-user function with token');

      const response = await supabase.functions.invoke('create-user', {
        body: userData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Create user response:', response);

      if (response.error) {
        console.error('Function invoke error:', response.error);
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        console.error('Function returned error:', response.data.error);
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const newPassword = generatePassword();
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session. Please log in again.');
      }

      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated. Please log in as a Super Admin to reset passwords.');
      }

      const response = await supabase.functions.invoke('reset-user-password', {
        body: { userId, password: newPassword },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) {
        console.error('Function invoke error:', response.error);
        throw new Error(response.error.message || 'Failed to reset password');
      }

      if (response.data?.error) {
        console.error('Function returned error:', response.data.error);
        throw new Error(response.data.error);
      }

      return { ...response.data, password: newPassword };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { 
      userId: string; 
      updates: { 
        home_id?: string | null; 
        trust_id?: string | null; 
        phone?: string | null;
        name?: string;
      } 
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useTrusts = () => {
  return useQuery({
    queryKey: ['trusts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
};
