import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateBankTransaction } from '@/hooks/useBankTransactions';

const PAYMENT_MODES = ['NEFT', 'UPI', 'IMPS', 'Cash Deposit', 'Cheque'];

export const ManualEntryDialog = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    reference_number: '',
    narration: '',
    payment_mode: 'NEFT',
    remarks: '',
  });

  const createMutation = useCreateBankTransaction();

  const handleSubmit = () => {
    if (!form.amount || !form.transaction_date) return;
    createMutation.mutate({
      transaction_date: form.transaction_date,
      amount: parseFloat(form.amount),
      reference_number: form.reference_number || undefined,
      narration: form.narration || undefined,
      payment_mode: form.payment_mode,
      remarks: form.remarks || undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({
          transaction_date: new Date().toISOString().split('T')[0],
          amount: '',
          reference_number: '',
          narration: '',
          payment_mode: 'NEFT',
          remarks: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Manual Entry</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Bank Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Transaction Reference</Label>
            <Input placeholder="Bank reference number" value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={form.payment_mode} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Narration / Description</Label>
            <Textarea placeholder="Bank narration" value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Input placeholder="Optional remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Recording...' : 'Record Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
