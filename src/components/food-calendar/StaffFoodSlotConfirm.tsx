import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirmFoodSlotBooking } from '@/hooks/useFoodSlotBookingRequests';
import { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';
import { computeBalanceDue } from '@/lib/foodPaymentUtils';
import {
  FOOD_BOOKING_PAYMENT_MODES,
  FOOD_BOOKING_PAYMENT_MODE_LABELS,
  CASH_PAYMENT_STATUSES,
  type FoodBookingPaymentMode,
} from '@/lib/foodPaymentConstants';

interface StaffFoodSlotConfirmProps {
  slotId?: string;
  requestId?: string;
  amount?: number;
  onConfirmed?: () => void;
}

export function StaffFoodSlotConfirm({ slotId, requestId, amount, onConfirmed }: StaffFoodSlotConfirmProps) {
  const confirm = useConfirmFoodSlotBooking();
  const [paymentMode, setPaymentMode] = useState<FoodBookingPaymentMode>('Cash');
  const [cashStatus, setCashStatus] = useState<FoodSlotPaymentStatus>('FULLY_PAID');
  const [amountPaid, setAmountPaid] = useState(amount?.toString() ?? '');

  const totalAmount = amount ?? 0;
  const amountReceived = parseFloat(amountPaid) || 0;
  const balanceDue =
    paymentMode === 'Cash' && cashStatus === 'PARTIALLY_PAID'
      ? computeBalanceDue(totalAmount, amountReceived)
      : 0;

  const resolvedStatus: FoodSlotPaymentStatus =
    paymentMode === 'NEFT' || paymentMode === 'Cheque'
      ? 'FULLY_PENDING'
      : cashStatus;

  const handleConfirm = () => {
    confirm.mutate(
      {
        slotId,
        requestId,
        payment_status: resolvedStatus,
        amount_paid:
          resolvedStatus === 'PARTIALLY_PAID'
            ? amountReceived
            : resolvedStatus === 'FULLY_PAID'
              ? totalAmount
              : 0,
        payment_mode: paymentMode,
      },
      { onSuccess: () => onConfirmed?.() },
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
      <h4 className="text-sm font-semibold">Confirm Booking</h4>

      <div className="space-y-2">
        <Label>Payment mode</Label>
        <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as FoodBookingPaymentMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FOOD_BOOKING_PAYMENT_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {FOOD_BOOKING_PAYMENT_MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {paymentMode === 'Cash' && (
        <>
          <div className="space-y-2">
            <Label>Payment status</Label>
            <Select value={cashStatus} onValueChange={(v) => setCashStatus(v as FoodSlotPaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_PAYMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'FULLY_PAID'
                      ? 'Fully Paid'
                      : status === 'PARTIALLY_PAID'
                        ? 'Partially Paid'
                        : 'Pending'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cashStatus === 'PARTIALLY_PAID' && (
            <div className="space-y-2 rounded-lg border p-3 bg-background">
              <Label htmlFor="amount-paid">Amount received (₹)</Label>
              <Input
                id="amount-paid"
                type="number"
                min={1}
                max={totalAmount}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Balance: ₹{balanceDue.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </>
      )}

      {(paymentMode === 'NEFT' || paymentMode === 'Cheque') && (
        <p className="text-xs text-muted-foreground">
          Payment will remain pending until {paymentMode === 'NEFT' ? 'NEFT is received' : 'the cheque is realized'}.
        </p>
      )}

      <Button onClick={handleConfirm} disabled={confirm.isPending} className="w-full">
        {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Booking
      </Button>
    </div>
  );
}
