export type Portal = 'donor' | 'app';

const DONOR_PATH_PREFIXES = [
  '/register',
  '/sponsor',
  '/food-calendar',
  '/pay',
  '/dashboard',
  '/donations',
  '/profile',
  '/notifications',
];

function isDonorPath(pathname: string): boolean {
  return DONOR_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Returns portal only when hostname has an explicit subdomain (donor.* or app.*). */
export function getPortal(): Portal | null {
  const host = window.location.hostname.toLowerCase();
  if (host.startsWith('donor.')) return 'donor';
  if (host.startsWith('app.')) return 'app';
  return null;
}

export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://msctrust.org';
export const DONOR_PORTAL_URL = import.meta.env.VITE_DONOR_PORTAL_URL || 'http://donor.localhost:8080';
export const APP_PORTAL_URL = import.meta.env.VITE_APP_PORTAL_URL || 'http://app.localhost:8080';

export function isDonorPortal() {
  return getPortal() === 'donor';
}

export function isAppPortal() {
  return getPortal() === 'app';
}

/** Donor or staff CRM — both use MSC brand (msctrust.org) styling. */
export function isMscBrandedPortal() {
  const portal = getPortal();
  return portal === 'donor' || portal === 'app';
}

export function getLoginPath() {
  return '/';
}

export function getDonorDashboardPath() {
  return '/?tab=account';
}

/** Canonical portal URL when accessed without a subdomain (e.g. plain localhost:8080). */
export function getCanonicalPortalUrl(): string {
  const { pathname, search, hash } = window.location;
  const base = isDonorPath(pathname) ? DONOR_PORTAL_URL : APP_PORTAL_URL;
  return `${base}${pathname}${search}${hash}`;
}
