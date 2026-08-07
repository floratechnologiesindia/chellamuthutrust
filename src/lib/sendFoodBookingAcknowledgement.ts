import { apiFetch } from '@/integrations/supabase/client';

export async function sendFoodBookingAcknowledgement(slotIds: string[]) {
  if (!slotIds.length) return null;

  const res = await apiFetch('/api/food-slots/send-booking-acknowledgement', {
    method: 'POST',
    body: JSON.stringify({ slot_ids: slotIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to send acknowledgement');
  }

  return res.json() as Promise<{
    sent: boolean;
    emailSent: boolean;
    whatsappSent: boolean;
    slotIds: string[];
  }>;
}
