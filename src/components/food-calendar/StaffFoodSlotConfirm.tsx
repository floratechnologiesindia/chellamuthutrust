import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirmFoodSlotBooking } from '@/hooks/useFoodSlotBookingRequests';
import { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';

interface StaffFoodSlotConfirmProps {
  slotId?: string;
  requestId?: string;
  amount?: number;
  onConfirmed?: () => void;
}

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online', 'Other'];

export function StaffFoodSlotConfirm({ slotId, requestId, amount, onConfirmed }: StaffFoodSlotConfirmProps) {
  const confirm = useConfirmFoodSlotBooking();
  const [paymentStatus, setPaymentStatus] = useState<FoodSlotPaymentStatus>('FULLY_PAID');
  const [amountPaid, setAmountPaid] = useState(amount?.toString() ?? '');
  const [paymentMode, setPaymentMode] = useState('Cash');

  const handleConfirm = () => {
    confirm.mutate(
      {
        slotId,
        requestId,
        payment_status: paymentStatus,
        amount_paid: paymentStatus === 'PARTIALLY_PAID' ? Number(amountPaid) : paymentStatus === 'FULLY_PAID' ? amount : 0,
        payment_mode: paymentStatus === 'FULLY_PENDING' ? undefined : paymentMode,
      },
      { onSuccess: () => onConfirmed?.() },
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
      <h4 className="text-sm font-semibold">Confirm Booking</h4>
      <div className="space-y-2">
        <Label>Payment status</Label>
        <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as FoodSlotPaymentStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULLY_PAID">Paid</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
            <SelectItem value="FULLY_PENDING">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentStatus === 'PARTIALLY_PAID' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="amount-paid">Amount paid (₹)</Label>
            <Input
              id="amount-paid"
              type="number"
              min={1}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {paymentStatus === 'FULLY_PAID' && (
        <div className="space-y-2">
          <Label>Payment mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={handleConfirm} disabled={confirm.isPending} className="w-full">
        {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Booking
      </Button>
    </div>
  );
}
