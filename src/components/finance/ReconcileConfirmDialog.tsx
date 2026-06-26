import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useReconcileTransaction, BankTransaction } from '@/hooks/useBankTransactions';
import { CheckCircle } from 'lucide-react';

interface Props {
  transaction: BankTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReconcileConfirmDialog = ({ transaction, open, onOpenChange }: Props) => {
  const reconcileMutation = useReconcileTransaction();

  const handleReconcile = () => {
    if (!transaction) return;
    reconcileMutation.mutate(transaction.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Reconciliation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
            <p><span className="font-medium">Amount:</span> ₹{Number(transaction.amount).toLocaleString('en-IN')}</p>
            <p><span className="font-medium">Date:</span> {transaction.transaction_date}</p>
            <p><span className="font-medium">Donor:</span> {transaction.donor_name || '-'}</p>
            <p><span className="font-medium">Category:</span> {transaction.category_label || '-'}</p>
            <p><span className="font-medium">Reference:</span> {transaction.reference_number || '-'}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Confirm that this payment matches the bank statement entry. This will mark the transaction as fully reconciled.
          </p>
          <Button className="w-full" onClick={handleReconcile} disabled={reconcileMutation.isPending}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {reconcileMutation.isPending ? 'Processing...' : 'Confirm Reconciliation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
