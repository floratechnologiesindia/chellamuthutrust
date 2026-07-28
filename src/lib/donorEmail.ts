/** Placeholder emails generated for phone-only donors (legacy or bulk import). */
export function isPlaceholderDonorEmail(email?: string | null): boolean {
  if (!email?.trim()) return true;
  const normalized = email.trim().toLowerCase();
  return (
    /@chellamuthu\.local$/i.test(normalized)
    || /@donor\.chellamuthu\.local$/i.test(normalized)
    || /^donor_\d+@/i.test(normalized)
  );
}

export function getDonorDisplayEmail(email?: string | null): string | null {
  if (!email || isPlaceholderDonorEmail(email)) return null;
  return email.trim();
}

export function hasVerifiedDonorEmail(user?: {
  email?: string | null;
  email_verified?: boolean | null;
}): boolean {
  return Boolean(user?.email_verified && getDonorDisplayEmail(user.email));
}

/** Email for Razorpay prefill — only a real, non-placeholder address. */
export function getRazorpayDonorEmail(email?: string | null): string {
  return getDonorDisplayEmail(email) || '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDonorEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase());
}
