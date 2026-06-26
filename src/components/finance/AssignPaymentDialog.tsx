import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignTransaction, BankTransaction } from '@/hooks/useBankTransactions';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';

interface Props {
  transaction: BankTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DonorResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pan_number: string | null;
}

interface CategoryResult {
  id: string;
  label: string;
}

export const AssignPaymentDialog = ({ transaction, open, onOpenChange }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [donors, setDonors] = useState<DonorResult[]>([]);
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<DonorResult | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searching, setSearching] = useState(false);

  const assignMutation = useAssignTransaction();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const q = `%${searchQuery.trim()}%`;
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, phone, pan_number')
      .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q},pan_number.ilike.${q}`)
      .limit(10);
    setDonors(data || []);
    setSearching(false);
  };

  // Load categories on open
  useState(() => {
    supabase.from('categories').select('id, label').then(({ data }) => {
      setCategories(data || []);
    });
  });

  const handleAssign = () => {
    if (!transaction || !selectedDonor) return;
    assignMutation.mutate({
      transactionId: transaction.id,
      donorId: selectedDonor.id,
      categoryId: selectedCategoryId || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedDonor(null);
        setSelectedCategoryId('');
        setSearchQuery('');
        setDonors([]);
      },
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Payment to Donor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Transaction details */}
          <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
            <p><span className="font-medium">Amount:</span> ₹{Number(transaction.amount).toLocaleString('en-IN')}</p>
            <p><span className="font-medium">Date:</span> {transaction.transaction_date}</p>
            <p><span className="font-medium">Reference:</span> {transaction.reference_number || '-'}</p>
            <p><span className="font-medium">Narration:</span> {transaction.narration || '-'}</p>
          </div>

          {/* Donor search */}
          <div className="space-y-2">
            <Label>Search Donor</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name, phone, email, or PAN"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {donors.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {donors.map(d => (
                <div
                  key={d.id}
                  className={`p-2 cursor-pointer hover:bg-muted text-sm flex justify-between ${selectedDonor?.id === d.id ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedDonor(d)}
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.pan_number || d.phone || d.email}</span>
                </div>
              ))}
            </div>
          )}

          {selectedDonor && (
            <div className="bg-primary/5 p-2 rounded text-sm">
              Selected: <span className="font-medium">{selectedDonor.name}</span>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label>Category (optional)</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleAssign} disabled={!selectedDonor || assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
