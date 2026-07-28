import { WEBSITE_URL } from '@/lib/portal';

/** Official assets from msctrust.org */
export const WEBSITE_LOGO = '/msctrust-logo.jpg';
export const WEBSITE_LOGO_WIDE =
  'https://msctrust.org/wp-content/uploads/2023/08/MSCLOGO-LIGHTBACKGROUNDS-FOR-PPTS-480x225.png';
export const WEBSITE_DONATE_URL = `${WEBSITE_URL}/donate-now/`;

/** Primary navigation — exact labels from msctrust.org */
export const WEBSITE_NAV = [
  { label: 'Home', href: `${WEBSITE_URL}/` },
  { label: 'About Us', href: `${WEBSITE_URL}/about-us/` },
  { label: 'Projects', href: `${WEBSITE_URL}/projects/` },
  { label: 'Impact', href: `${WEBSITE_URL}/impact/` },
  { label: 'Corporate Partnership', href: `${WEBSITE_URL}/corporate-partnership/` },
  { label: 'Contact', href: `${WEBSITE_URL}/contact/` },
  { label: 'FAQ', href: `${WEBSITE_URL}/faq/` },
] as const;

export const WEBSITE_SOCIAL = [
  { label: 'Follow on Facebook', href: 'https://www.facebook.com/ChellamuthuTrust', network: 'facebook' },
  { label: 'Follow on Instagram', href: 'https://www.instagram.com/chellamuthutrust/', network: 'instagram' },
  { label: 'Follow on LinkedIn', href: 'https://www.linkedin.com/company/chellamuthutrust/', network: 'linkedin' },
] as const;

/** In-panel flows — single-page donor portal tabs */
export const DONOR_PANEL_NAV = [
  { label: 'Donate Food', path: '/?tab=food' },
  { label: 'Sponsor a Need', path: '/?tab=sponsor' },
  { label: 'My Donations', path: '/?tab=donations', auth: true },
  { label: 'My Account', path: '/?tab=account', auth: true },
] as const;

export const WEBSITE_CONTACT = {
  phone: '+91-7305003041',
  email: 'info@msctrust.org',
  tagline: 'Mental Health for All',
  orgName: 'M.S. Chellamuthu Trust & Research Foundation',
};

/** Brand tokens extracted from msctrust.org CSS */
export const WEBSITE_BRAND = {
  yellow: '#FFCA0F',
  yellowHover: '#FFCC10',
  orange: '#FF6633',
  buttonText: '#3C3B3B',
  navText: '#000000',
  navHover: '#FFCA0F',
  teal: '#7EBEC5',
  black: '#000000',
  white: '#FFFFFF',
  body: '#666666',
  heading: '#333333',
  maxWidth: '1366px',
  rowPadding: '50px',
} as const;
