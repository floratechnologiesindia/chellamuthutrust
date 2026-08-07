import { apiFetch } from '@/integrations/supabase/client';

export async function sendFoodReceiptThankYou(slotIds: string[], options?: { force?: boolean }) {
  if (!slotIds.length) return null;

  const res = await apiFetch('/api/food-slots/send-receipt-thankyou', {
    method: 'POST',
    body: JSON.stringify({ slot_ids: slotIds, force: options?.force === true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to send receipt and thank-you letter');
  }

  return res.json() as Promise<{
    count: number;
    results: Array<{
      slotId: string;
      sent: boolean;
      skipped?: string;
      emailSent: boolean;
      whatsappSent: boolean;
      receiptNumber?: string;
      error?: string;
    }>;
  }>;
}

export interface FoodReceiptThankYouDocuments {
  slotId: string;
  referenceKey: string;
  receiptNumber: string;
  invoice: Record<string, unknown>;
  thankYouHtml: string;
  thankYouText: string;
  receiptHtml: string;
  sentAt: string | null;
}

export async function fetchFoodReceiptThankYouDocuments(slotId: string): Promise<FoodReceiptThankYouDocuments> {
  const res = await apiFetch(`/api/food-slots/${slotId}/receipt-thankyou-documents`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Could not load receipt documents');
  }
  return res.json();
}
