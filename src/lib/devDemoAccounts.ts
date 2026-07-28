import type { UserRole } from '@/types';
import { formatUserRole } from '@/lib/roleLabels';

export const DEMO_PASSWORD = 'Chellamuthu@2026';

export interface StaffDemoAccount {
  role: UserRole;
  email: string;
}

/** Dev quick-login accounts for the staff app portal (app.localhost / app.msctrustcrm.com). */
export const STAFF_DEMO_ACCOUNTS: StaffDemoAccount[] = [
  { role: 'super_admin', email: 'superadmin@chellamuthu.local' },
  { role: 'admin', email: 'admin@chellamuthu.local' },
  { role: 'finance', email: 'finance@chellamuthu.local' },
  { role: 'employee', email: 'employee@chellamuthu.local' },
  { role: 'warden', email: 'warden@chellamuthu.local' },
];

export interface LegacyDemoAccount extends StaffDemoAccount {
  color: string;
}

/** Legacy combined login page demo list (includes donor). */
export const LEGACY_DEMO_ACCOUNTS: LegacyDemoAccount[] = [
  { role: 'super_admin', email: 'superadmin@chellamuthu.local', color: 'bg-destructive text-destructive-foreground' },
  { role: 'admin', email: 'admin@chellamuthu.local', color: 'bg-orange-500 text-white' },
  { role: 'finance', email: 'finance@chellamuthu.local', color: 'bg-accent text-accent-foreground' },
  { role: 'employee', email: 'employee@chellamuthu.local', color: 'bg-secondary text-secondary-foreground' },
  { role: 'warden', email: 'warden@chellamuthu.local', color: 'bg-muted text-muted-foreground' },
  { role: 'donor', email: 'donor@chellamuthu.local', color: 'bg-primary/20 text-primary' },
];

export function getDemoAccountLabel(role: UserRole): string {
  return formatUserRole(role);
}
