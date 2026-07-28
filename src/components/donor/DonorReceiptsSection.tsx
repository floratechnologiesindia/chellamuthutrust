import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Loader2 } from 'lucide-react';
import { DonorReceiptDialog } from '@/components/donor/DonorReceiptDialog';
import type { InvoiceData } from '@/components/homes/InvoicePreview';
import { useDonorReceipts } from '@/hooks/useDonorReceipts';
import { isDonorPortal } from '@/lib/portal';

interface DonorReceiptsSectionProps {
  embedded?: boolean;
}

export function DonorReceiptsSection({ embedded = false }: DonorReceiptsSectionProps) {
  const donorStyled = embedded || isDonorPortal();
  const { data: receipts = [], isLoading } = useDonorReceipts();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<Omit<InvoiceData, 'receiptNumber'> | null>(null);
  const [receiptReference, setReceiptReference] = useState('');
  const [storedReceiptNumber, setStoredReceiptNumber] = useState<string | undefined>();
  const [activeReceiptId, setActiveReceiptId] = useState<string | undefined>();
  const [activeReceiptEmailedAt, setActiveReceiptEmailedAt] = useState<string | null | undefined>();

  const recentReceipts = useMemo(() => receipts.slice(0, 8), [receipts]);

  const openReceipt = (receipt: (typeof receipts)[number]) => {
    if (!receipt.invoice_data) return;
    const { receiptNumber: _ignored, ...invoiceFields } = receipt.invoice_data;
    setReceiptData(invoiceFields);
    setReceiptReference(receipt.reference_key);
    setStoredReceiptNumber(receipt.receipt_number);
    setActiveReceiptId(receipt.id);
    setActiveReceiptEmailedAt(receipt.receipt_emailed_at);
    setReceiptOpen(true);
  };

  if (!donorStyled) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="donor-profile-section-title flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#ff6633]" />
          Tax Receipts
        </h3>
        {receipts.length > 0 && (
          <Link to="/?tab=donations" className="text-sm text-[#ff6633] hover:underline">
            View in My Donations
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading receipts…
        </div>
      ) : recentReceipts.length === 0 ? (
        <p className="donor-profile-dialog-hint text-sm">
          Official receipts appear here after your payments are confirmed.
        </p>
      ) : (
        <ul className="space-y-3">
          {recentReceipts.map((receipt) => (
            <li
              key={receipt.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg border"
              style={{ borderColor: 'var(--msc-border)' }}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{receipt.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {receipt.receipt_number} · {format(new Date(receipt.payment_date), 'dd MMM yyyy')}
                  {receipt.home_name ? ` · ${receipt.home_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold text-[#ff6633]">
                  ₹{receipt.amount.toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  className="donor-btn donor-btn-outline px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                  onClick={() => openReceipt(receipt)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DonorReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        invoiceData={receiptData}
        receiptReference={receiptReference}
        storedReceiptNumber={storedReceiptNumber}
        receiptId={activeReceiptId}
        receiptEmailedAt={activeReceiptEmailedAt}
      />
    </section>
  );
}
