import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      console.log('useUsers: Fetching users...');
      
      // Fetch profiles with home and trust names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          homes:home_id (name),
          trusts:trust_id (name)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('useUsers: Profiles fetch error:', profilesError);
        throw profilesError;
      }
      
      console.log('useUsers: Profiles fetched:', profiles?.length);

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('useUsers: Roles fetch error:', rolesError);
        throw rolesError;
      }
      
      console.log('useUsers: Roles fetched:', roles?.length);

      // Map roles to profiles
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        status: profile.status,
        trust_id: profile.trust_id,
        home_id: profile.home_id,
        created_at: profile.created_at,
        role: roleMap.get(profile.id) || 'donor',
        home_name: (profile.homes as any)?.name || null,
        trust_name: (profile.trusts as any)?.name || null,
      })) as UserWithRole[];
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
        body: { userId, newPassword },
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
