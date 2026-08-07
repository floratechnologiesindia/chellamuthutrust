import { IndianRupee, Upload, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import type { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';
import {
  CASH_PAYMENT_STATUSES,
  FOOD_BOOKING_PAYMENT_MODES,
  FOOD_BOOKING_PAYMENT_MODE_LABELS,
  type FoodBookingPaymentMode,
} from '@/lib/foodPaymentConstants';
import { computeBalanceDue } from '@/lib/foodPaymentUtils';

export interface FoodBookingPaymentState {
  paymentMode: FoodBookingPaymentMode;
  cashStatus: FoodSlotPaymentStatus;
  amountReceived: string;
  chequeNumber: string;
  bankName: string;
  chequeImageUrl: string;
}

interface FoodBookingPaymentSectionProps {
  effectiveAmount: number;
  state: FoodBookingPaymentState;
  onChange: (patch: Partial<FoodBookingPaymentState>) => void;
  onChequeFileSelect?: (file: File) => void;
  chequeUploading?: boolean;
  idPrefix?: string;
}

export function FoodBookingPaymentSection({
  effectiveAmount,
  state,
  onChange,
  onChequeFileSelect,
  chequeUploading = false,
  idPrefix = '',
}: FoodBookingPaymentSectionProps) {
  const prefix = idPrefix ? `${idPrefix}-` : '';
  const amountReceivedNum = parseFloat(state.amountReceived) || 0;
  const balanceDue =
    state.paymentMode === 'Cash' && state.cashStatus === 'PARTIALLY_PAID'
      ? computeBalanceDue(effectiveAmount, amountReceivedNum)
      : state.paymentMode === 'NEFT' || state.paymentMode === 'Cheque'
        ? effectiveAmount
        : state.cashStatus === 'FULLY_PENDING'
          ? effectiveAmount
          : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sponsorship Amount</span>
          <span className="flex items-center text-xl font-semibold text-primary">
            <IndianRupee className="h-5 w-5" />
            {effectiveAmount.toLocaleString('en-IN')}
          </span>
        </div>
        {balanceDue > 0 && state.paymentMode !== 'NEFT' && (
          <p className="text-xs text-muted-foreground mt-2">
            Balance due: ₹{balanceDue.toLocaleString('en-IN')}
          </p>
        )}
        {state.paymentMode === 'NEFT' && effectiveAmount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Payment link will be sent to the donor via WhatsApp and email after booking.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Payment Mode *</Label>
        <RadioGroup
          value={state.paymentMode}
          onValueChange={(v) => onChange({ paymentMode: v as FoodBookingPaymentMode })}
          className="flex flex-wrap gap-4"
        >
          {FOOD_BOOKING_PAYMENT_MODES.map((mode) => (
            <div key={mode} className="flex items-center space-x-2">
              <RadioGroupItem value={mode} id={`${prefix}mode-${mode}`} />
              <Label htmlFor={`${prefix}mode-${mode}`} className="font-normal cursor-pointer">
                {FOOD_BOOKING_PAYMENT_MODE_LABELS[mode]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {state.paymentMode === 'Cash' && (
        <div className="space-y-3">
          <Label>Payment Status *</Label>
          <RadioGroup
            value={state.cashStatus}
            onValueChange={(v) => onChange({ cashStatus: v as FoodSlotPaymentStatus })}
            className="flex flex-wrap gap-4"
          >
            {CASH_PAYMENT_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={`${prefix}cash-${status}`} />
                <Label htmlFor={`${prefix}cash-${status}`} className="font-normal cursor-pointer">
                  {status === 'FULLY_PAID'
                    ? 'Fully Paid'
                    : status === 'PARTIALLY_PAID'
                      ? 'Partially Paid'
                      : 'Pending'}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {state.cashStatus === 'PARTIALLY_PAID' && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor={`${prefix}amount-received`}>Amount Received (₹) *</Label>
                <Input
                  id={`${prefix}amount-received`}
                  type="number"
                  min={1}
                  max={effectiveAmount}
                  placeholder="Enter amount received"
                  value={state.amountReceived}
                  onChange={(e) => onChange({ amountReceived: e.target.value })}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance amount</span>
                <span className="font-medium flex items-center">
                  <IndianRupee className="h-3 w-3" />
                  {computeBalanceDue(effectiveAmount, amountReceivedNum).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {state.paymentMode === 'Cheque' && (
        <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Cheque payments remain pending until the admin marks the cheque as realized.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}cheque-number`}>Cheque Number *</Label>
            <Input
              id={`${prefix}cheque-number`}
              value={state.chequeNumber}
              onChange={(e) => onChange({ chequeNumber: e.target.value })}
              placeholder="Enter cheque number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}bank-name`}>Bank Name *</Label>
            <Input
              id={`${prefix}bank-name`}
              value={state.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
              placeholder="Enter bank name"
            />
          </div>
          <div className="space-y-2">
            <Label>Cheque Image *</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={chequeUploading} asChild>
                <label className="cursor-pointer">
                  {chequeUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {state.chequeImageUrl ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onChequeFileSelect?.(file);
                    }}
                  />
                </label>
              </Button>
              {state.chequeImageUrl && (
                <span className="text-xs text-success truncate max-w-[200px]">Uploaded</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
