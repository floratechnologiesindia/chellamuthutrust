import { apiFetch } from '@/integrations/supabase/client';

export async function sendAdminFoodBookingStaffNotify(slotIds: string[]) {
  if (!slotIds.length) return null;

  const res = await apiFetch('/api/food-slots/notify-admin-booking-staff', {
    method: 'POST',
    body: JSON.stringify({ slot_ids: slotIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to notify social workers');
  }

  return res.json() as Promise<{
    notifiedHomes: number;
    workersNotified: number;
    inAppSent: number;
    emailSent: number;
    whatsappSent: number;
    slotIds: string[];
    skipped?: string;
  }>;
}
