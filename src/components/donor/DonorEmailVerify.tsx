import { useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from '@/components/ui/input-otp';
import { useDonorEmailVerify } from '@/hooks/useDonorEmailVerify';
import { useAuth } from '@/contexts/AuthContext';
import { hasVerifiedDonorEmail } from '@/lib/donorEmail';
import { isDevOtpVisible } from '@/lib/manualPayments';
import { toast } from 'sonner';

export function DonorEmailVerify() {
  const { user, refreshUser } = useAuth();
  const { requestEmailOtp, verifyEmailOtp, isLoading, devOtp, error, setError } = useDonorEmailVerify();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  if (!user || user.role !== 'donor' || hasVerifiedDonorEmail(user)) {
    return null;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const data = await requestEmailOtp(email);
      setStep('otp');
      toast.success(data.message || 'Verification code sent to your email');
    } catch {
      /* error shown inline */
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    try {
      const result = await verifyEmailOtp(email, otp);
      await refreshUser();
      if (result.receipts_emailed && result.receipts_emailed > 0) {
        toast.success(
          `Email verified. ${result.receipts_emailed} pending receipt(s) were emailed to you.`,
        );
      } else {
        toast.success('Email verified successfully');
      }
      setStep('email');
      setOtp('');
    } catch {
      /* error shown inline */
    }
  };

  return (
    <section
      className="mb-6 p-5 rounded-xl border-2 border-[#ff6633]/30 bg-[#fff8f5]"
      aria-labelledby="donor-email-verify-title"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-[#ff6633]/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-[#ff6633]" />
        </div>
        <div>
          <h2 id="donor-email-verify-title" className="donor-profile-dialog-title text-lg">
            Add your email address
          </h2>
          <p className="donor-profile-dialog-hint text-sm mt-1">
            A verified email is required to receive donation receipts and updates. Please add and verify your email to continue using your account fully.
          </p>
        </div>
      </div>

      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email address</Label>
            <Input
              id="verify-email"
              type="email"
              className="donor-input h-11"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="donor-btn donor-btn-primary px-6 py-2.5 inline-flex items-center gap-2 disabled:opacity-60"
            disabled={isLoading || !email.trim()}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send verification code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
          {isDevOtpVisible() && devOtp && (
            <div className="donor-card p-4 text-center border-dashed" style={{ borderColor: '#ffca0f' }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#ff6633' }}>
                Development verification code
              </p>
              <p
                className="text-2xl font-semibold tracking-[0.3em]"
                style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}
              >
                {devOtp}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Verification code</Label>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="donor-btn donor-btn-primary px-6 py-2.5 inline-flex items-center gap-2 disabled:opacity-60"
              disabled={isLoading || otp.length < 6}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <ShieldCheck className="h-4 w-4" />
              Verify email
            </button>
            <button
              type="button"
              className="donor-btn donor-btn-outline px-4 py-2.5 text-sm"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError(null);
              }}
            >
              Change email
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
