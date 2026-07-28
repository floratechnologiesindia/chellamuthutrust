import { useState } from 'react';
import { apiFetch } from '@/integrations/supabase/client';

export function useDonorEmailVerify() {
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestEmailOtp = async (email: string) => {
    setIsLoading(true);
    setError(null);
    setDevOtp(null);
    try {
      const res = await apiFetch('/api/auth/email-otp/request', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      if (data.devOtp) setDevOtp(data.devOtp);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send verification code';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/email-otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      return data as { user: Record<string, unknown>; receipts_emailed?: number };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Verification failed';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { requestEmailOtp, verifyEmailOtp, isLoading, devOtp, error, setError };
}
