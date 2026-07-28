import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, IndianRupee, Phone } from 'lucide-react';
import {
  OCCASION_LABELS,
  RECURRING_FREQUENCY_LABELS,
  type FoodDonationDetails,
} from '@/components/donor/DonorFoodDonationDetailsForm';
import { WEBSITE_CONTACT } from '@/config/website';
import { buildFoodDonationSummary, formatFoodPaymentBreakup } from '@/lib/foodDonationSummary';
import { formatCurrency } from '@/lib/formatters';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import { cn } from '@/lib/utils';

interface DonorFoodDonationPreviewProps {
  details: FoodDonationDetails;
  homeName: string;
  slotLabel: string;
  timeSlot: FoodTimeSlot;
  date: Date;
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

export const DonorFoodDonationPreview = ({
  details,
  homeName,
  slotLabel,
  timeSlot,
  date,
  amount,
  onBack,
  onConfirm,
  className,
}: DonorFoodDonationPreviewProps) => {
  const [showBreakup, setShowBreakup] = useState(false);
  const dateLabel = format(date, 'dd MMM yyyy');
  const summary = buildFoodDonationSummary({ homeName, timeSlot, slotLabel, details });
  const breakup = formatFoodPaymentBreakup({ amount, slotLabel, homeName, dateLabel });
  const showRemarks =
    Boolean(details.occasion_note) &&
    (details.occasion_type === 'special_day' || details.occasion_type === 'other');

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
        <DetailRow label="Meal Slot" value={`${slotLabel} · ${dateLabel}`} />
      </div>

      <div className="donor-card p-4 space-y-2" style={{ background: 'rgba(255, 202, 15, 0.08)' }}>
        <p className="text-xs uppercase tracking-wide font-medium" style={{ color: '#666' }}>
          Donation Summary
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#333' }}>
          {summary}
        </p>
        {details.recurring_frequency !== 'one_time' && (
          <p className="text-sm leading-relaxed pt-2 border-t" style={{ color: '#666', borderColor: 'var(--msc-border)' }}>
            First payment covers this meal. A {details.recurring_frequency} pledge will continue on the same
            date and time slot; future payments are collected when due (not auto-debited).
          </p>
        )}
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

        <button
          type="button"
          onClick={() => setShowBreakup((v) => !v)}
          className="text-sm inline-flex items-center gap-1 underline"
          style={{ color: '#ff6633' }}
        >
          {showBreakup ? 'Hide payment breakup' : 'View payment breakup'}
          {showBreakup ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showBreakup && (
          <ul className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--msc-border)' }}>
            {breakup.map((row) => (
              <li key={row.label} className="flex justify-between gap-3 text-sm">
                <span style={{ color: '#666' }}>{row.label}</span>
                <span className="font-medium shrink-0" style={{ color: '#333' }}>
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="donor-btn donor-btn-primary w-full py-3.5"
      >
        Confirm & Pay Now
      </button>

      <button
        type="button"
        onClick={onBack}
        className="donor-btn donor-btn-outline w-full py-3"
      >
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
};
