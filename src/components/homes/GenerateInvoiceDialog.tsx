import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InvoicePreview, type InvoiceData } from './InvoicePreview';
import { generateReceiptNumber } from '@/lib/formatters';
import { Printer, Download, FileText, Edit2, Check } from 'lucide-react';

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: Omit<InvoiceData, 'receiptNumber'>;
}

export function GenerateInvoiceDialog({ 
  open, 
  onOpenChange, 
  invoiceData 
}: GenerateInvoiceDialogProps) {
  const [receiptNumber, setReceiptNumber] = useState(() => generateReceiptNumber());
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fullInvoiceData: InvoiceData = {
    ...invoiceData,
    receiptNumber,
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Georgia, serif;
              padding: 20mm;
              background: white;
              color: black;
            }
            .invoice-preview { max-width: 170mm; margin: 0 auto; font-size: 14px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .text-center { text-align: center; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .h-20 { height: 5rem; }
            .w-20 { width: 5rem; }
            .object-contain { object-fit: contain; }
            hr { border: none; margin: 8px 0; }
            p { margin: 0; }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = () => handlePrint();

  const handleRegenerateReceipt = () => {
    setReceiptNumber(generateReceiptNumber());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Receipt
          </DialogTitle>
          <DialogDescription>
            Preview and print/download the receipt for the donor.
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Number Editor */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Label className="text-sm font-medium whitespace-nowrap">Receipt No:</Label>
          {isEditingReceipt ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="font-mono text-sm h-8"
              />
              <Button size="sm" variant="ghost" onClick={() => setIsEditingReceipt(false)}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                {receiptNumber}
              </code>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingReceipt(true)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleRegenerateReceipt}>
                Regenerate
              </Button>
            </div>
          )}
        </div>

        {/* Invoice Preview */}
        <div ref={printRef} className="border rounded-lg overflow-hidden bg-white shadow-inner">
          <InvoicePreview data={fullInvoiceData} />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
