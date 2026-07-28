import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvoicePreview, type InvoiceData } from '@/components/homes/InvoicePreview';
import { receiptNumberFromReference } from '@/lib/donorReceipt';
import { printReceiptElement } from '@/lib/printReceipt';
import { cn } from '@/lib/utils';
import { Download, FileText, Loader2, Mail, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasVerifiedDonorEmail } from '@/lib/donorEmail';
import { emailDonorReceipt } from '@/hooks/useDonorReceipts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DonorReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: Omit<InvoiceData, 'receiptNumber'> | null;
  /** Stable key used to derive the receipt number (e.g. food-{id}). */
  receiptReference?: string;
  /** Official receipt number from the server when available. */
  storedReceiptNumber?: string;
  /** Stored receipt id for email resend. */
  receiptId?: string;
  receiptEmailedAt?: string | null;
}

export const DonorReceiptDialog = ({
  open,
  onOpenChange,
  invoiceData,
  receiptReference = '',
  storedReceiptNumber,
  receiptId,
  receiptEmailedAt,
}: DonorReceiptDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [emailing, setEmailing] = useState(false);
  const canEmail = Boolean(receiptId && hasVerifiedDonorEmail(user));

  const fullInvoiceData = useMemo<InvoiceData | null>(() => {
    if (!invoiceData) return null;
    const reference = receiptReference || invoiceData.referenceNumber || invoiceData.date;
    return {
      ...invoiceData,
      receiptNumber:
        storedReceiptNumber || receiptNumberFromReference(reference),
    };
  }, [invoiceData, receiptReference, storedReceiptNumber]);

  const handlePrint = () => {
    if (!printRef.current || !fullInvoiceData) return;
    printReceiptElement(printRef.current, fullInvoiceData.receiptNumber);
  };

  const handleEmailReceipt = async () => {
    if (!receiptId) return;
    setEmailing(true);
    try {
      await emailDonorReceipt(receiptId);
      await queryClient.invalidateQueries({ queryKey: ['donor-receipts'] });
      toast.success('Receipt emailed to your verified address');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to email receipt');
    } finally {
      setEmailing(false);
    }
  };

  if (!fullInvoiceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'portal-donor donor-profile-dialog gap-0 p-0 border-0 sm:max-w-3xl max-h-[90vh] overflow-y-auto',
        )}
      >
        <div className="p-6">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="donor-profile-dialog-title flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#ff6633]" />
              Donation Receipt
            </DialogTitle>
            <p className="donor-profile-dialog-hint mt-1">
              Receipt No. {fullInvoiceData.receiptNumber} — print or save as PDF from your browser.
              {receiptEmailedAt && (
                <span className="block mt-1 text-green-700">
                  Emailed on {new Date(receiptEmailedAt).toLocaleDateString('en-IN')}
                </span>
              )}
            </p>
          </DialogHeader>

          <div
            ref={printRef}
            className="border rounded overflow-hidden bg-white shadow-inner"
            style={{ borderColor: 'var(--msc-border)' }}
          >
            <InvoicePreview data={fullInvoiceData} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            <button
              type="button"
              className="donor-btn donor-btn-outline px-6 py-2.5"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
            {canEmail && (
              <button
                type="button"
                className="donor-btn donor-btn-outline px-6 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                onClick={handleEmailReceipt}
                disabled={emailing}
              >
                {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {receiptEmailedAt ? 'Email again' : 'Email receipt'}
              </button>
            )}
            <button
              type="button"
              className="donor-btn donor-btn-outline px-6 py-2.5 inline-flex items-center justify-center gap-2"
              onClick={handlePrint}
            >
              <Download className="h-4 w-4" />
              Save as PDF
            </button>
            <button
              type="button"
              className="donor-btn donor-btn-primary px-6 py-2.5 inline-flex items-center justify-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
