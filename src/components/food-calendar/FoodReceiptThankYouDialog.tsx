import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Printer } from 'lucide-react';
import { fetchFoodReceiptThankYouDocuments, type FoodReceiptThankYouDocuments } from '@/lib/sendFoodReceiptThankYou';
import { printReceiptElement } from '@/lib/printReceipt';

interface FoodReceiptThankYouDialogProps {
  slotId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FoodReceiptThankYouDialog({ slotId, open, onOpenChange }: FoodReceiptThankYouDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<FoodReceiptThankYouDocuments | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const thankYouRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !slotId) {
      setDocuments(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFoodReceiptThankYouDocuments(slotId)
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load documents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slotId]);

  const handlePrint = (kind: 'receipt' | 'thankyou') => {
    const target = kind === 'receipt' ? receiptRef.current : thankYouRef.current;
    if (!target || !documents) return;
    printReceiptElement(
      target,
      kind === 'receipt' ? documents.receiptNumber : `Thank-you-${documents.receiptNumber}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt &amp; Thank-you Letter</DialogTitle>
          <DialogDescription>
            Print or save as PDF from your browser. Soft copies are emailed/WhatsApped to the donor when payment is confirmed.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Preparing documents…
          </div>
        )}

        {error && <p className="text-sm text-destructive py-4">{error}</p>}

        {documents && !loading && (
          <>
            <p className="text-sm text-muted-foreground">
              Receipt No. {documents.receiptNumber}
              {documents.sentAt ? ' · Sent to donor' : ' · Not yet sent electronically'}
            </p>

            <Tabs defaultValue="receipt">
              <TabsList>
                <TabsTrigger value="receipt">Receipt</TabsTrigger>
                <TabsTrigger value="thankyou">Thank-you Letter</TabsTrigger>
              </TabsList>
              <TabsContent value="receipt" className="mt-4">
                <div
                  ref={receiptRef}
                  className="border rounded-md p-4 bg-white text-black"
                  dangerouslySetInnerHTML={{ __html: documents.receiptHtml }}
                />
              </TabsContent>
              <TabsContent value="thankyou" className="mt-4">
                <div
                  ref={thankYouRef}
                  className="border rounded-md p-4 bg-white text-black"
                  dangerouslySetInnerHTML={{ __html: documents.thankYouHtml }}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => handlePrint('thankyou')}>
                <Printer className="h-4 w-4 mr-2" />
                Print thank-you
              </Button>
              <Button type="button" onClick={() => handlePrint('receipt')}>
                <Printer className="h-4 w-4 mr-2" />
                Print receipt
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
