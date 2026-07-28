import { useState } from 'react';
import { apiFetch } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDonorOtp() {
  const { verifyDonorOtp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async (phone: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    setDevOtp(null);
    try {
      const res = await apiFetch('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ name: name?.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      if (data.devOtp) setDevOtp(data.devOtp);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send OTP';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await verifyDonorOtp(phone.trim(), otp.trim());
      if (!result.success) throw new Error(result.error || 'Invalid OTP');
      return result as typeof result & { isNewUser?: boolean };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Verification failed';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { requestOtp, verifyOtp, isLoading, devOtp, error, setError };
}
