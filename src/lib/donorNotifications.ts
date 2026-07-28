import { apiFetch } from '@/integrations/supabase/client';

export async function reportDonorPaymentFailed(description: string, amount?: number) {
  try {
    await apiFetch('/api/donor-notifications/payment-failed', {
      method: 'POST',
      body: JSON.stringify({ description, amount }),
    });
  } catch {
    // Non-blocking — payment failure UX should not depend on notification logging
  }
}
