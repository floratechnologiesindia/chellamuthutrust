import { format } from 'date-fns';
import { IndianRupee, Phone } from 'lucide-react';
import {
  OCCASION_LABELS,
  RECURRING_FREQUENCY_LABELS,
  type FoodDonationDetails,
} from '@/components/donor/DonorFoodDonationDetailsForm';
import { WEBSITE_CONTACT } from '@/config/website';
import { cn } from '@/lib/utils';

interface DonorNeedDonationPreviewProps {
  details: FoodDonationDetails;
  homeName: string;
  needLabel: string;
  needDateLabel: string;
  amount: number;
  onBack: () => void;
  onConfirm: () => void;
  className?: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--msc-border)' }}>
      <span className="text-xs sm:w-36 shrink-0 uppercase tracking-wide" style={{ color: '#999' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: '#333' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export function DonorNeedDonationPreview({
  details,
  homeName,
  needLabel,
  needDateLabel,
  amount,
  onBack,
  onConfirm,
  className,
}: DonorNeedDonationPreviewProps) {
  const showRemarks =
    Boolean(details.occasion_note) &&
    (details.occasion_type === 'special_day' || details.occasion_type === 'other');

  const summary = [
    `Towards ${needLabel} at ${homeName}`,
    details.donation_for ? `for ${details.donation_for}` : null,
    `on the occasion of ${OCCASION_LABELS[details.occasion_type]}`,
    details.event_date
      ? `(${format(new Date(`${details.event_date}T12:00:00`), 'dd MMM yyyy')})`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-5 py-2', className)}>
      <div>
        <h3 className="donor-section-title text-xl mb-1">Preview & Confirmation</h3>
        <p className="text-sm" style={{ color: '#666' }}>
          Please verify your details before proceeding to payment.
        </p>
      </div>

      <div className="donor-card p-4 space-y-0">
        <DetailRow label="Name" value={details.name} />
        <DetailRow label="Phone" value={details.phone} />
        <DetailRow label="Address" value={details.address} />
        <DetailRow label="PAN" value={details.pan_number} />
        <DetailRow label="Occasion" value={OCCASION_LABELS[details.occasion_type]} />
        {showRemarks && <DetailRow label="Remarks" value={details.occasion_note} />}
        <DetailRow label="Donation For" value={details.donation_for} />
        <DetailRow
          label="Date of Event"
          value={format(new Date(`${details.event_date}T12:00:00`), 'dd MMM yyyy')}
        />
        <DetailRow label="Sponsorship" value={RECURRING_FREQUENCY_LABELS[details.recurring_frequency]} />
        <DetailRow label="Project" value={homeName} />
        <DetailRow label="Need" value={`${needLabel} · ${needDateLabel}`} />
      </div>

      <div className="donor-card p-4 space-y-2" style={{ background: 'rgba(255, 202, 15, 0.08)' }}>
        <p className="text-xs uppercase tracking-wide font-medium" style={{ color: '#666' }}>
          Donation Summary
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#333' }}>
          {summary}.
        </p>
      </div>

      <div className="donor-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium" style={{ color: '#333' }}>
            Payment Summary
          </p>
          <p
            className="text-xl font-semibold flex items-center gap-0.5"
            style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}
          >
            <IndianRupee className="h-5 w-5" />
            {amount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <button type="button" onClick={onConfirm} className="donor-btn donor-btn-primary w-full py-3.5">
        Confirm & Pay Now
      </button>

      <button type="button" onClick={onBack} className="donor-btn donor-btn-outline w-full py-3">
        Edit Details
      </button>

      <div
        className="flex gap-3 items-start rounded-md p-3 text-sm"
        style={{ background: 'rgba(126, 190, 197, 0.12)', color: '#3d6b72' }}
      >
        <Phone className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          If you face any difficulties while making your donation, please call us at{' '}
          <a href={`tel:${WEBSITE_CONTACT.phone.replace(/\s/g, '')}`} className="font-semibold underline">
            {WEBSITE_CONTACT.phone}
          </a>
          . We will be happy to assist you.
        </p>
      </div>
    </div>
  );
}
