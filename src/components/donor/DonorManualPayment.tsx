import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, IndianRupee, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface DonorPaymentStatusProps {
  status: 'success' | 'failure';
  title?: string;
  message?: string;
  amount?: number;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  /** Centered modal — close / retry callbacks instead of navigation links */
  variant?: 'page' | 'modal';
  onClose?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const DonorPaymentStatus = ({
  status,
  title,
  message,
  amount,
  primaryAction = { label: 'Back to Home', href: '/' },
  secondaryAction,
  variant = 'page',
  onClose,
  onRetry,
  className,
}: DonorPaymentStatusProps) => {
  const isSuccess = status === 'success';
  const isModal = variant === 'modal';

  return (
    <div className={cn('text-center py-8 px-4', className)}>
      <div
        className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: isSuccess ? 'rgba(255, 202, 15, 0.2)' : 'rgba(255, 102, 51, 0.12)' }}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-10 w-10" style={{ color: '#ff6633' }} />
        ) : (
          <XCircle className="h-10 w-10" style={{ color: '#ff6633' }} />
        )}
      </div>

      <h2
        className="text-2xl md:text-3xl mb-3"
        style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 500, color: '#333' }}
      >
        {title || (isSuccess ? 'Thank You!' : 'Payment Not Completed')}
      </h2>

      {amount !== undefined && amount > 0 && (
        <p className="text-lg mb-3 flex items-center justify-center gap-1" style={{ color: '#333' }}>
          <IndianRupee className="h-5 w-5" />
          {formatCurrency(amount)}
        </p>
      )}

      <p className="text-base max-w-md mx-auto mb-8" style={{ color: '#666' }}>
        {message || (isSuccess
          ? 'Your contribution has been recorded. Thank you for making a difference.'
          : 'Your sponsorship is saved but payment was not completed. You can try again from My Donations.')}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isModal ? (
          <>
            {!isSuccess && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="donor-btn donor-btn-primary px-8 py-3.5"
              >
                Try Again
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'donor-btn px-8 py-3.5',
                  isSuccess ? 'donor-btn-primary' : 'donor-btn-outline',
                )}
              >
                Close
              </button>
            )}
          </>
        ) : (
          <>
            <Link to={primaryAction.href} className="donor-btn donor-btn-primary px-8 py-3.5">
              {primaryAction.label}
            </Link>
            {secondaryAction && (
              <Link to={secondaryAction.href} className="donor-btn donor-btn-outline px-8 py-3.5">
                {secondaryAction.label}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface DonorManualPaymentProps {
  amount: number;
  summary?: string;
  onSuccess: () => void | Promise<void>;
  onFailure: () => void;
  isProcessing?: boolean;
  className?: string;
}

export const DonorManualPayment = ({
  amount,
  summary,
  onSuccess,
  onFailure,
  isProcessing = false,
  className,
}: DonorManualPaymentProps) => (
  <div className={cn('space-y-5', className)}>
    <div>
      <h3 className="donor-section-title text-xl mb-1">Complete Payment</h3>
      <p className="text-sm" style={{ color: '#666' }}>
        Online payment via Razorpay is coming soon. For now, use the buttons below to simulate payment.
      </p>
    </div>

    <div className="donor-card p-5 text-center">
      <p className="text-sm mb-1" style={{ color: '#666' }}>Amount</p>
      <p className="text-3xl font-semibold flex items-center justify-center gap-1" style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}>
        <IndianRupee className="h-7 w-7" />
        {amount.toLocaleString('en-IN')}
      </p>
      {summary && (
        <p className="text-sm mt-3 pt-3 border-t" style={{ color: '#666', borderColor: 'var(--msc-border)' }}>
          {summary}
        </p>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => void onSuccess()}
        disabled={isProcessing}
        className="donor-btn donor-btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
        Payment Successful
      </button>
      <button
        type="button"
        onClick={onFailure}
        disabled={isProcessing}
        className="donor-btn donor-btn-outline py-3.5 disabled:opacity-60"
        style={{ borderColor: '#ff6633', color: '#ff6633' }}
      >
        Payment Failed
      </button>
    </div>
  </div>
);
