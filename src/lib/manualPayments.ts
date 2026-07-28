/** Razorpay checkout when the public key is configured */
export function isRazorpayEnabled(): boolean {
  return Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);
}

/** Manual simulate buttons — fallback when Razorpay is not configured */
export function isManualPaymentsEnabled(): boolean {
  if (isRazorpayEnabled()) return false;
  return import.meta.env.VITE_MANUAL_PAYMENTS === 'true' || import.meta.env.DEV;
}

export function isOnlinePaymentEnabled(): boolean {
  return isRazorpayEnabled() || isManualPaymentsEnabled();
}

export function isDevOtpVisible(): boolean {
  return import.meta.env.VITE_SHOW_DEV_OTP === 'true' || import.meta.env.DEV;
}

/** One-click demo staff logins on the app portal sign-in page */
export function isDevLoginVisible(): boolean {
  return import.meta.env.VITE_SHOW_DEV_OTP === 'true' || import.meta.env.DEV;
}
