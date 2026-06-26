import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useCreateCorpusFund } from '@/hooks/useCorpusFund';
import { useTrusts } from '@/hooks/useHomes';
import { amountToWords, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const CONTRIBUTION_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online Payment' },
];

interface CorpusFundFormProps {
  trustId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  showTrustSelector?: boolean;
}

export function CorpusFundForm({
  trustId: initialTrustId,
  onSuccess,
  onCancel,
  showTrustSelector = true,
}: CorpusFundFormProps) {
  const { toast } = useToast();
  const { data: trusts } = useTrusts();
  const createCorpusFund = useCreateCorpusFund();

  const [formData, setFormData] = useState({
    trust_id: initialTrustId || '',
    donor_name: '',
    amount: '',
    contribution_date: new Date(),
    purpose: '',
    notes: '',
    donor_address: '',
    donor_pan: '',
    contribution_mode: '',
    reference_number: '',
    declaration_agreed: false,
  });

  const amountInWords = useMemo(() => {
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) return '';
    return amountToWords(amt);
  }, [formData.amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trust_id) {
      toast({ title: 'Error', description: 'Please select a trust', variant: 'destructive' });
      return;
    }

    if (!formData.donor_name.trim()) {
      toast({ title: 'Error', description: 'Please enter donor name', variant: 'destructive' });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    if (!formData.declaration_agreed) {
      toast({ title: 'Error', description: 'Please agree to the declaration', variant: 'destructive' });
      return;
    }

    try {
      await createCorpusFund.mutateAsync({
        trust_id: formData.trust_id,
        donor_name: formData.donor_name,
        amount: parseFloat(formData.amount),
        contribution_date: format(formData.contribution_date, 'yyyy-MM-dd'),
        purpose: formData.purpose || null,
        notes: formData.notes || null,
        donor_address: formData.donor_address || null,
        donor_pan: formData.donor_pan || null,
        contribution_mode: formData.contribution_mode || null,
        reference_number: formData.reference_number || null,
        declaration_agreed: true,
        declaration_agreed_at: new Date().toISOString(),
      });

      toast({ title: 'Success', description: 'Corpus fund contribution added successfully' });
      
      // Reset form
      setFormData({
        trust_id: initialTrustId || '',
        donor_name: '',
        amount: '',
        contribution_date: new Date(),
        purpose: '',
        notes: '',
        donor_address: '',
        donor_pan: '',
        contribution_mode: '',
        reference_number: '',
        declaration_agreed: false,
      });

      onSuccess?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add contribution', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showTrustSelector && (
        <div className="space-y-2">
          <Label>Trust *</Label>
          <Select
            value={formData.trust_id}
            onValueChange={(value) => setFormData({ ...formData, trust_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select trust" />
            </SelectTrigger>
            <SelectContent>
              {trusts?.map((trust) => (
                <SelectItem key={trust.id} value={trust.id}>
                  {trust.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Donor Name *</Label>
          <Input
            value={formData.donor_name}
            onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
            placeholder="Enter donor name"
          />
        </div>

        <div className="space-y-2">
          <Label>Amount (₹) *</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="Enter amount"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label>Contribution Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.contribution_date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.contribution_date
                  ? format(formData.contribution_date, 'PPP')
                  : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.contribution_date}
                onSelect={(date) =>
                  setFormData({ ...formData, contribution_date: date || new Date() })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Mode of Contribution</Label>
          <Select
            value={formData.contribution_mode}
            onValueChange={(value) => setFormData({ ...formData, contribution_mode: value })}
          >
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
          <Label>Reference Number</Label>
          <Input
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Transaction/Cheque reference"
          />
        </div>

        <div className="space-y-2">
          <Label>Purpose</Label>
          <Input
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Purpose of contribution"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          rows={2}
        />
      </div>

      <Separator />

      {/* Donor Declaration Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Donor Declaration for Corpus Contribution</h3>
        
        <div className="bg-muted/50 p-4 rounded-lg border text-sm leading-relaxed">
          <p className="mb-4">
            I/We hereby confirm that the sum of{' '}
            <strong className="text-primary">
              Rs. {formData.amount || '___'} (Rupees {amountInWords || '______'} only)
            </strong>
            , contributed by me/us to M.S. Chellamuthu Trust and Research Foundation on{' '}
            <strong className="text-primary">
              {formatDate(formData.contribution_date)}
            </strong>
            , is made with specific direction that the said contribution shall form part of
            the Trust Development Corpus Fund of the Trust.
          </p>
          <p>
            I/We understand and agree that by designating this contribution to the Corpus
            Fund, it cannot be revoked or utilized for any other purpose, and the corpus
            amount shall not be withdrawn or reduced.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Donor Address</Label>
            <Textarea
              value={formData.donor_address}
              onChange={(e) => setFormData({ ...formData, donor_address: e.target.value })}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>PAN (if applicable)</Label>
            <Input
              value={formData.donor_pan}
              onChange={(e) => setFormData({ ...formData, donor_pan: e.target.value.toUpperCase() })}
              placeholder="PAN number"
              maxLength={10}
            />
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
          <p className="text-sm font-medium">Declaration Summary:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Name of Donor: {formData.donor_name || '___'}</li>
            <li>• Amount: Rs. {formData.amount || '___'} ({amountInWords || '___'})</li>
            <li>• Date: {formatDate(formData.contribution_date)}</li>
            <li>• Mode: {CONTRIBUTION_MODES.find(m => m.value === formData.contribution_mode)?.label || '___'}</li>
            {formData.reference_number && <li>• Reference: {formData.reference_number}</li>}
          </ul>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <Checkbox
            id="declaration"
            checked={formData.declaration_agreed}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, declaration_agreed: checked === true })
            }
          />
          <label htmlFor="declaration" className="text-sm font-medium cursor-pointer">
            I Agree - I hereby confirm that I have read and understood the above declaration
            and agree to contribute the mentioned amount to the Corpus Fund of the Trust.
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={createCorpusFund.isPending}>
          {createCorpusFund.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Contribution
        </Button>
      </div>
    </form>
  );
}
