import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { useBulkImportTransactions } from '@/hooks/useBankTransactions';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

interface ParsedRow {
  transaction_date: string;
  amount: number;
  reference_number: string;
  narration: string;
  payment_mode: string;
}

export const BankStatementUpload = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkMutation = useBulkImportTransactions();

  const handleDownloadTemplate = () => {
    const sampleData = [
      { Date: '2026-03-01', Amount: 25000, Reference: 'NEFT/CR/123456789', Narration: 'Donation from Ramesh Kumar', Mode: 'NEFT' },
      { Date: '2026-03-02', Amount: 5000, Reference: 'UPI/987654321', Narration: 'UPI payment Suresh M', Mode: 'UPI' },
      { Date: '2026-03-03', Amount: 100000, Reference: 'RTGS/2026030300112', Narration: 'CSR contribution ABC Corp', Mode: 'RTGS' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 35 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement');
    XLSX.writeFile(wb, 'bank_statement_template.xlsx');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          toast({ title: 'No data found in file', variant: 'destructive' });
          return;
        }

        // Build flexible column mapping from first row keys
        const firstRowKeys = Object.keys(data[0]);
        const findCol = (patterns: string[]) => 
          firstRowKeys.find(k => patterns.some(p => k.toLowerCase().includes(p))) || '';

        const dateCol = findCol(['date', 'transaction date', 'txn date', 'value date']);
        const amountCol = findCol(['amount', 'credit', 'deposit', 'cr']);
        const refCol = findCol(['reference', 'ref', 'utr', 'transaction id', 'txn id']);
        const narrCol = findCol(['narration', 'description', 'particulars', 'remarks', 'detail']);
        const modeCol = findCol(['mode', 'payment mode', 'type', 'channel']);

        if (!dateCol && !amountCol) {
          toast({ title: 'Could not detect columns', description: `Found columns: ${firstRowKeys.join(', ')}. Need at least Date and Amount columns.`, variant: 'destructive' });
          return;
        }

        const parsed: ParsedRow[] = data
          .filter((r: any) => {
            const amt = parseFloat(r[amountCol] || '0');
            return amt > 0;
          })
          .map((r: any) => {
            let dateVal = r[dateCol] || '';
            if (typeof dateVal === 'number') {
              const d = XLSX.SSF.parse_date_code(dateVal);
              dateVal = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
            } else if (typeof dateVal === 'string') {
              // Try to normalize common date formats (DD-MM-YYYY, DD/MM/YYYY)
              const dmyMatch = dateVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (dmyMatch) {
                dateVal = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
              }
            }
            return {
              transaction_date: dateVal,
              amount: parseFloat(r[amountCol] || '0'),
              reference_number: String(r[refCol] || r['Reference'] || ''),
              narration: String(r[narrCol] || r['Narration'] || ''),
              payment_mode: String(r[modeCol] || 'NEFT'),
            };
          })
          .filter((r: ParsedRow) => r.amount > 0 && r.transaction_date);

        setRows(parsed);
        if (parsed.length === 0) {
          toast({ title: 'No valid transactions found', description: `Detected columns: ${[dateCol, amountCol, refCol, narrCol, modeCol].filter(Boolean).join(', ')}. Check that Amount > 0 and Date is present.`, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Failed to parse file', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    if (rows.length === 0) return;
    bulkMutation.mutate(rows, {
      onSuccess: () => {
        setOpen(false);
        setRows([]);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setRows([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Upload Statement</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Select CSV / Excel File
            </Button>
            <Button variant="ghost" size="sm" className="mt-2" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-1" />Download Sample Template
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Expected columns: Date, Amount, Reference, Narration, Mode</p>
          </div>

          {rows.length > 0 && (
            <>
              <p className="text-sm font-medium">{rows.length} transactions found</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.transaction_date}</TableCell>
                      <TableCell>₹{r.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="max-w-[100px] truncate">{r.reference_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.narration}</TableCell>
                      <TableCell>{r.payment_mode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && <p className="text-xs text-muted-foreground">...and {rows.length - 10} more</p>}
              <Button className="w-full" onClick={handleImport} disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? 'Importing...' : `Import ${rows.length} Transactions`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
