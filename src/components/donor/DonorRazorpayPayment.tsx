import { IndianRupee, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface DonorRazorpayPaymentProps {
  amount: number;
  summary?: string;
  onPay: () => void | Promise<void>;
  isProcessing?: boolean;
  className?: string;
}

export const DonorRazorpayPayment = ({
  amount,
  summary,
  onPay,
  isProcessing = false,
  className,
}: DonorRazorpayPaymentProps) => (
  <div className={cn('space-y-5', className)}>
    <div>
      <h3 className="donor-section-title text-xl mb-1">Complete Payment</h3>
      <p className="text-sm" style={{ color: '#666' }}>
        Pay securely via Razorpay using UPI, debit/credit card, or net banking (test mode).
      </p>
    </div>

    <div className="donor-card p-5 text-center">
      <p className="text-sm mb-1" style={{ color: '#666' }}>Amount</p>
      <p
        className="text-3xl font-semibold flex items-center justify-center gap-1"
        style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}
      >
        <IndianRupee className="h-7 w-7" />
        {amount.toLocaleString('en-IN')}
      </p>
      {summary && (
        <p
          className="text-sm mt-3 pt-3 border-t"
          style={{ color: '#666', borderColor: 'var(--msc-border)' }}
        >
          {summary}
        </p>
      )}
    </div>

    <button
      type="button"
      onClick={() => void onPay()}
      disabled={isProcessing}
      className="donor-btn donor-btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
      Pay {formatCurrency(amount)} with Razorpay
    </button>

    <p className="text-xs text-center" style={{ color: '#999' }}>
      Test card: 4111 1111 1111 1111 · any future expiry · any CVV
    </p>
  </div>
);
