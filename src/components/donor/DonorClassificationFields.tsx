import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DONOR_FREQUENCY_OPTIONS,
  type DonorFrequency,
} from '@/lib/donorFrequencyConstants';

export interface DonorClassificationValues {
  donor_name: string;
  donor_address: string;
  donor_pan: string;
  donor_phone: string;
  donor_email: string;
  donor_frequency: DonorFrequency;
}

interface DonorClassificationFieldsProps {
  values: DonorClassificationValues;
  onChange: (patch: Partial<DonorClassificationValues>) => void;
  /** When true, name/phone may be read-only for logged-in donors */
  readOnlyContact?: boolean;
  className?: string;
}

export const emptyDonorClassification = (): DonorClassificationValues => ({
  donor_name: '',
  donor_address: '',
  donor_pan: '',
  donor_phone: '',
  donor_email: '',
  donor_frequency: 'ONE_TIME',
});

export function DonorClassificationFields({
  values,
  onChange,
  readOnlyContact = false,
  className,
}: DonorClassificationFieldsProps) {
  return (
    <div className={className}>
      <div className="mb-3">
        <h4 className="text-sm font-semibold">Donor Information</h4>
        <p className="text-xs text-muted-foreground">
          Contact details are stored with this donation record
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="donor_name">Donor Name</Label>
          <Input
            id="donor_name"
            value={values.donor_name}
            onChange={(e) => onChange({ donor_name: e.target.value })}
            placeholder="Full name"
            readOnly={readOnlyContact && Boolean(values.donor_name.trim())}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="donor_address">Address</Label>
          <Textarea
            id="donor_address"
            value={values.donor_address}
            onChange={(e) => onChange({ donor_address: e.target.value })}
            placeholder="Street, city, state, PIN"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="donor_pan">PAN Number (Optional)</Label>
          <Input
            id="donor_pan"
            value={values.donor_pan}
            onChange={(e) => onChange({ donor_pan: e.target.value.toUpperCase() })}
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="donor_frequency">Donor Type</Label>
          <Select
            value={values.donor_frequency}
            onValueChange={(value: DonorFrequency) => onChange({ donor_frequency: value })}
          >
            <SelectTrigger id="donor_frequency">
              <SelectValue placeholder="Select donor type" />
            </SelectTrigger>
            <SelectContent>
              {DONOR_FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="donor_phone">Contact Phone</Label>
          <Input
            id="donor_phone"
            value={values.donor_phone}
            onChange={(e) => onChange({ donor_phone: e.target.value })}
            placeholder="Mobile number"
            readOnly={readOnlyContact && Boolean(values.donor_phone.trim())}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="donor_email">Contact Email</Label>
          <Input
            id="donor_email"
            type="email"
            value={values.donor_email}
            onChange={(e) => onChange({ donor_email: e.target.value })}
            placeholder="Email address"
          />
        </div>
      </div>
    </div>
  );
}
