import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Landmark, Loader2, Calendar, Building2 } from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useTrusts } from '@/hooks/useHomes';
import { useCorpusFundContributions, useCreateCorpusFund } from '@/hooks/useCorpusFund';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface CorpusFundBookingListProps {
  donor: DonorWithStats;
  onBookingComplete?: () => void;
}

const CONTRIBUTION_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
];

export const CorpusFundBookingList = ({ donor, onBookingComplete }: CorpusFundBookingListProps) => {
  const { data: trusts = [] } = useTrusts();
  const createCorpusFund = useCreateCorpusFund();

  // Form state
  const [selectedTrustId, setSelectedTrustId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [contributionMode, setContributionMode] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get donor's previous corpus fund contributions
  const { data: allContributions = [], isLoading } = useCorpusFundContributions();
  
  const donorContributions = useMemo(() => {
    return allContributions.filter(c => c.donor_id === donor.id);
  }, [allContributions, donor.id]);

  const handleSubmit = async () => {
    if (!selectedTrustId || !amount) {
      toast.error('Please select a trust and enter an amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCorpusFund.mutateAsync({
        trust_id: selectedTrustId,
        donor_id: donor.id,
        donor_name: donor.name,
        amount: parseFloat(amount),
        contribution_date: format(new Date(), 'yyyy-MM-dd'),
        purpose: purpose || null,
        contribution_mode: contributionMode || null,
        reference_number: referenceNumber || null,
        notes: notes || null,
        donor_address: donor.address || null,
        donor_pan: donor.pan_number || null,
        declaration_agreed: true,
        declaration_agreed_at: new Date().toISOString(),
      });

      toast.success(`Corpus Fund contribution of ${formatCurrency(parseFloat(amount))} recorded for ${donor.name}`);
      
      // Reset form
      setAmount('');
      setPurpose('');
      setContributionMode('');
      setReferenceNumber('');
      setNotes('');
      
      onBookingComplete?.();
    } catch (error) {
      console.error('Corpus fund error:', error);
      toast.error('Failed to record contribution. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contribution Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Record Corpus Fund Contribution for {donor.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trust">Trust *</Label>
              <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trust" />
                </SelectTrigger>
                <SelectContent>
                  {trusts.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter contribution amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Contribution Mode</Label>
              <Select value={contributionMode} onValueChange={setContributionMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRIBUTION_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Cheque/Transaction reference"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Purpose of contribution"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedTrustId || !amount}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Contribution
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous Contributions by {donor.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : donorContributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No previous corpus fund contributions</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trust</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donorContributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(contribution.contribution_date), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {contribution.trusts?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {contribution.contribution_mode?.replace('_', ' ') || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {contribution.purpose || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(contribution.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CorpusFundBookingList;
