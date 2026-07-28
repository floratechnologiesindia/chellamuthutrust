import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from '@/components/ui/input-otp';
import { useDonorOtp } from '@/hooks/useDonorOtp';
import { isDevOtpVisible } from '@/lib/manualPayments';
import { cn } from '@/lib/utils';

interface DonorOtpAuthProps {
  onVerified: (userId?: string, verifiedPhone?: string, isNewUser?: boolean) => void;
  submitLabel?: string;
  phoneOnly?: boolean;
  className?: string;
}

export const DonorOtpAuth = ({
  onVerified,
  submitLabel = 'Send OTP to WhatsApp',
  phoneOnly = false,
  className,
}: DonorOtpAuthProps) => {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const { requestOtp, verifyOtp, isLoading, devOtp, error, setError } = useDonorOtp();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!phoneOnly && !name.trim()) || !phone.trim()) return;
    try {
      await requestOtp(phone, phoneOnly ? undefined : name);
      setStep('otp');
    } catch {
      /* error state handled in hook */
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    try {
      const result = await verifyOtp(phone, otp);
      onVerified(result.userId, phone.trim(), result.isNewUser);
    } catch {
      /* error state handled in hook */
    }
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <h3 className="donor-section-title text-xl mb-1">Continue as Donor</h3>
        <p className="text-sm" style={{ color: '#666' }}>
          {phoneOnly
            ? 'Enter your WhatsApp number. We’ll send a one-time code to verify you.'
            : 'Enter your name and WhatsApp number. We’ll send a one-time code to verify you.'}
        </p>
      </div>

      {step === 'details' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {!phoneOnly && (
            <div className="space-y-2">
              <Label htmlFor="donor-name" className="text-sm font-medium" style={{ color: '#333' }}>
                Full Name
              </Label>
              <Input
                id="donor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="donor-input h-11"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="donor-phone" className="text-sm font-medium" style={{ color: '#333' }}>
              WhatsApp Number
            </Label>
            <Input
              id="donor-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              required
              className="donor-input h-11"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || (!phoneOnly && !name.trim()) || !phone.trim()}
            className="donor-btn donor-btn-primary w-full py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm" style={{ color: '#666' }}>
            Enter the 6-digit code sent to <strong style={{ color: '#333' }}>{phone}</strong>
          </p>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="donor-input donor-otp-slot h-12 w-11 text-lg font-medium"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {isDevOtpVisible() && devOtp && (
            <div className="donor-card p-4 text-center border-dashed" style={{ borderColor: '#ffca0f' }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#ff6633' }}>
                Development OTP
              </p>
              <p className="text-2xl font-semibold tracking-[0.3em]" style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}>
                {devOtp}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || otp.length < 6}
            className="donor-btn donor-btn-primary w-full py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify &amp; Continue
          </button>

          <button
            type="button"
            className="donor-btn donor-btn-outline w-full py-3"
            onClick={() => {
              setStep('details');
              setOtp('');
              setError(null);
            }}
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
};
