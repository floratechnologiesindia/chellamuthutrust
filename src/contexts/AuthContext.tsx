import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Session, apiFetch, setAuthSession } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { getDonorDisplayEmail } from '@/lib/donorEmail';
import { formatUserDisplayName } from '@/lib/roleLabels';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  email_verified?: boolean;
  phone?: string;
  avatar_url?: string;
  status: string;
  trust_id?: string;
  home_id?: string;
  assigned_project_ids?: string[];
  role: UserRole;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyDonorOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string; role?: UserRole; userId?: string; isNewUser?: boolean }>;
  refreshUser: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapApiProfile(profile: Record<string, unknown>): UserProfile {
  const displayEmail = getDonorDisplayEmail(profile.email as string | null | undefined);
  return {
    id: String(profile.id),
    name: formatUserDisplayName(String(profile.name || '')),
    email: displayEmail || '',
    email_verified: Boolean(profile.email_verified) && Boolean(displayEmail),
    phone: profile.phone as string | undefined,
    avatar_url: profile.avatar_url as string | undefined,
    status: String(profile.status || 'active'),
    trust_id: profile.trust_id as string | undefined,
    home_id: profile.home_id as string | undefined,
    assigned_project_ids: Array.isArray(profile.assigned_project_ids)
      ? (profile.assigned_project_ids as string[])
      : undefined,
    role: (profile.role as UserRole) || 'donor',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const meRes = await apiFetch('/api/auth/me');
      if (meRes.ok) {
        const profile = await meRes.json();
        if (profile?.id === userId) {
          return mapApiProfile(profile as Record<string, unknown>);
        }
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        console.error('No profile found for user:', userId);
        return null;
      }

      const userRole = ((profile as { role?: UserRole }).role) || 'donor';
      const p = profile as Record<string, unknown>;
      p.role = userRole;

      return mapApiProfile(p);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id).then(profile => {
              setUser(profile);
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id).then(profile => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      let role: UserRole | undefined;
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        setUser(profile);
        role = profile?.role;
      }

      return { success: true, role };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { 
          success: true, 
          error: 'Please check your email to confirm your account before signing in.' 
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  const verifyDonorOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string; role?: UserRole; userId?: string; isNewUser?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, otp });
      if (error) {
        return { success: false, error: error.message };
      }

      const session = data.session;
      if (session) {
        setSession(session);
      }

      if (data.user) {
        const apiUser = data.user as {
          id: string;
          name?: string;
          email?: string | null;
          phone?: string;
          role?: UserRole;
          status?: string;
          email_verified?: boolean;
          is_new_user?: boolean;
        };
        const normalizedPhone = phone.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '').slice(-10);

        setUser(mapApiProfile({
          ...apiUser,
          phone: apiUser.phone || normalizedPhone,
        } as Record<string, unknown>));

        const profile = await fetchUserProfile(apiUser.id);
        if (profile) {
          setUser(profile);
          return {
            success: true,
            role: profile.role,
            userId: apiUser.id,
            isNewUser: Boolean(apiUser.is_new_user),
          };
        }

        return {
          success: true,
          role: apiUser.role || 'donor',
          userId: apiUser.id,
          isNewUser: Boolean(apiUser.is_new_user),
        };
      }

      return { success: false, error: 'Verification failed' };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  };

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      const profile = await res.json();
      const mapped = mapApiProfile(profile as Record<string, unknown>);
      setUser(mapped);
      const token = localStorage.getItem('auth_token');
      if (token) {
        setAuthSession(token, { id: mapped.id, email: mapped.email || '' });
      }
      return mapped;
    } catch {
      return null;
    }
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user && !!session, 
      isLoading, 
      login, 
      register,
      verifyDonorOtp,
      refreshUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
