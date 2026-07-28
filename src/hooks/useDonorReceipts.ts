import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/integrations/supabase/client';
import type { InvoiceData } from '@/components/homes/InvoicePreview';

export interface DonorReceiptSummary {
  id: string;
  donor_id: string;
  receipt_number: string;
  amount: number;
  payment_reference?: string;
  entity_type: 'food_slot' | 'donation' | 'need';
  entity_id: string;
  description: string;
  home_name?: string;
  payment_date: string;
  payment_mode: string;
  reference_key: string;
  issued_at: string;
  receipt_emailed_at?: string | null;
  created_at: string;
  invoice_data?: InvoiceData;
}

async function fetchDonorReceipts(): Promise<DonorReceiptSummary[]> {
  const res = await apiFetch('/api/donor/receipts');
  if (!res.ok) throw new Error('Failed to load receipts');
  return res.json();
}

async function fetchDonorReceiptById(id: string): Promise<DonorReceiptSummary> {
  const res = await apiFetch(`/api/donor/receipts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Receipt not found');
  return res.json();
}

async function fetchDonorReceiptByReference(referenceKey: string): Promise<DonorReceiptSummary> {
  const res = await apiFetch(
    `/api/donor/receipts/by-reference/${encodeURIComponent(referenceKey)}`,
  );
  if (!res.ok) throw new Error('Receipt not found');
  return res.json();
}

export function useDonorReceipts(enabled = true) {
  return useQuery({
    queryKey: ['donor-receipts'],
    queryFn: fetchDonorReceipts,
    enabled,
  });
}

export function useDonorReceipt(receiptId: string | null) {
  return useQuery({
    queryKey: ['donor-receipt', receiptId],
    queryFn: () => fetchDonorReceiptById(receiptId!),
    enabled: Boolean(receiptId),
  });
}

export async function emailDonorReceipt(receiptId: string): Promise<void> {
  const res = await apiFetch(`/api/donor/receipts/${encodeURIComponent(receiptId)}/email`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to email receipt');
}

export async function loadDonorReceiptByReference(referenceKey: string): Promise<DonorReceiptSummary | null> {
  try {
    return await fetchDonorReceiptByReference(referenceKey);
  } catch {
    return null;
  }
}
