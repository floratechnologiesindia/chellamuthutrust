import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type FoodDonationOccasion =
  | 'birthday'
  | 'ancestor_remembrance'
  | 'festival'
  | 'special_day'
  | 'other';

export type FoodRecurringFrequency = 'one_time' | 'monthly' | 'annual';

export const RECURRING_FREQUENCY_LABELS: Record<FoodRecurringFrequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly recurring',
  annual: 'Annual recurring',
};

export interface FoodDonationDetails {
  name: string;
  phone: string;
  pan_number: string;
  address: string;
  occasion_type: FoodDonationOccasion;
  occasion_note: string;
  donation_for: string;
  event_date: string;
  recurring_frequency: FoodRecurringFrequency;
}

interface DonorFoodDonationDetailsFormProps {
  initialValues?: Partial<FoodDonationDetails>;
  onSubmit: (details: FoodDonationDetails) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Existing logged-in donor — profile fields are prefilled and phone is read-only when set. */
  isExistingDonor?: boolean;
  className?: string;
}

export const OCCASION_LABELS: Record<FoodDonationOccasion, string> = {
  birthday: 'Birthday',
  ancestor_remembrance: 'In Memory of Loved One',
  festival: 'Festival / Celebration',
  special_day: 'Special Day',
  other: 'Other',
};

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export const DonorFoodDonationDetailsForm = ({
  initialValues,
  onSubmit,
  isSubmitting = false,
  isExistingDonor = false,
  className,
}: DonorFoodDonationDetailsFormProps) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [panNumber, setPanNumber] = useState(initialValues?.pan_number || '');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [occasionType, setOccasionType] = useState<FoodDonationOccasion>(
    initialValues?.occasion_type || 'birthday',
  );
  const [occasionNote, setOccasionNote] = useState(initialValues?.occasion_note || '');
  const [donationFor, setDonationFor] = useState(initialValues?.donation_for || '');
  const [eventDate, setEventDate] = useState(initialValues?.event_date || todayIso());
  const [recurringFrequency, setRecurringFrequency] = useState<FoodRecurringFrequency>(
    initialValues?.recurring_frequency || 'one_time',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialValues?.name) setName(initialValues.name);
    if (initialValues?.phone) setPhone(initialValues.phone);
    if (initialValues?.pan_number) setPanNumber(initialValues.pan_number);
    if (initialValues?.address) setAddress(initialValues.address);
  }, [initialValues?.name, initialValues?.phone, initialValues?.pan_number, initialValues?.address]);

  const showRemarks = occasionType === 'special_day' || occasionType === 'other';
  const phoneReadOnly = Boolean(isExistingDonor && phone.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const pan = panNumber.trim().toUpperCase();
    const addr = address.trim();

    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }
    if (!pan) {
      setError('PAN number is required');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
      setError('Enter a valid PAN (e.g. ABCDE1234F)');
      return;
    }
    if (!addr) {
      setError('Address is required');
      return;
    }
    if (occasionType === 'special_day' && !occasionNote.trim()) {
      setError('Please describe your Special Day in Remarks');
      return;
    }
    if (!donationFor.trim()) {
      setError('Please enter who this donation is for');
      return;
    }
    if (!eventDate) {
      setError('Date of Event is required');
      return;
    }

    setError('');
    await onSubmit({
      name: trimmedName,
      phone: trimmedPhone,
      pan_number: pan,
      address: addr,
      occasion_type: occasionType,
      occasion_note: occasionNote.trim(),
      donation_for: donationFor.trim(),
      event_date: eventDate,
      recurring_frequency: recurringFrequency,
    });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={cn('space-y-4 py-2', className)}>
      <div>
        <h3 className="donor-section-title text-xl mb-1">Donation Details</h3>
        <p className="text-sm" style={{ color: '#666' }}>
          {isExistingDonor
            ? 'Your profile details are filled in. Update the occasion details below, then continue.'
            : 'Please provide these details before payment. They will be used for your receipt.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-full-name" className="text-sm font-medium" style={{ color: '#333' }}>
          Name *
        </Label>
        <Input
          id="donor-full-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          required
          className="donor-input h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-phone" className="text-sm font-medium" style={{ color: '#333' }}>
          Phone Number *
        </Label>
        <Input
          id="donor-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp / mobile number"
          required
          readOnly={phoneReadOnly}
          className={cn('donor-input h-11', phoneReadOnly && 'opacity-80')}
        />
        {phoneReadOnly && (
          <p className="text-xs" style={{ color: '#999' }}>
            Auto-filled from your account
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-address" className="text-sm font-medium" style={{ color: '#333' }}>
          Address *
        </Label>
        <Textarea
          id="donor-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full postal address"
          rows={3}
          required
          className="donor-input min-h-[88px] p-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-pan" className="text-sm font-medium" style={{ color: '#333' }}>
          PAN Number *
        </Label>
        <Input
          id="donor-pan"
          value={panNumber}
          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
          placeholder="ABCDE1234F"
          maxLength={10}
          required
          className="donor-input h-11 uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#333' }}>
          Sponsorship Type *
        </Label>
        <Select
          value={recurringFrequency}
          onValueChange={(v) => setRecurringFrequency(v as FoodRecurringFrequency)}
        >
          <SelectTrigger className="donor-input h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="donor-select-menu portal-donor">
            {(Object.keys(RECURRING_FREQUENCY_LABELS) as FoodRecurringFrequency[]).map((key) => (
              <SelectItem key={key} value={key}>
                {RECURRING_FREQUENCY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {recurringFrequency !== 'one_time' && (
          <p className="text-xs" style={{ color: '#666' }}>
            You pay for this meal now. We will pledge the same date and time slot for future{' '}
            {recurringFrequency === 'annual' ? 'years' : 'months'} and notify you when the next payment is due.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#333' }}>
          Occasion *
        </Label>
        <Select value={occasionType} onValueChange={(v) => setOccasionType(v as FoodDonationOccasion)}>
          <SelectTrigger className="donor-input h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="donor-select-menu portal-donor">
            {(Object.keys(OCCASION_LABELS) as FoodDonationOccasion[]).map((key) => (
              <SelectItem key={key} value={key}>
                {OCCASION_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showRemarks && (
        <div className="space-y-2">
          <Label htmlFor="donor-remarks" className="text-sm font-medium" style={{ color: '#333' }}>
            Remarks {occasionType === 'special_day' ? '*' : '(optional)'}
          </Label>
          <Textarea
            id="donor-remarks"
            value={occasionNote}
            onChange={(e) => setOccasionNote(e.target.value)}
            placeholder="e.g. My son passed the 10th standard examination, Housewarming ceremony"
            rows={3}
            required={occasionType === 'special_day'}
            className="donor-input min-h-[88px] p-3 text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="donor-donation-for" className="text-sm font-medium" style={{ color: '#333' }}>
          Donation For *
        </Label>
        <Input
          id="donor-donation-for"
          value={donationFor}
          onChange={(e) => setDonationFor(e.target.value)}
          placeholder="Name of the person this donation is for"
          required
          className="donor-input h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-event-date" className="text-sm font-medium" style={{ color: '#333' }}>
          Date of Event *
        </Label>
        <Input
          id="donor-event-date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className="donor-input h-11"
        />
        <p className="text-xs" style={{ color: '#999' }}>
          Auto-filled as today — change if the occasion is on a different date
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="donor-btn donor-btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Review & Confirm
      </button>
    </form>
  );
};
