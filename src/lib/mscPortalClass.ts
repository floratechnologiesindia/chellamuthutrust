import { cn } from '@/lib/utils';
import { getPortal } from '@/lib/portal';

/** Scope class for portaled overlays (dialog, select, dropdown, etc.). */
export function mscPortalClass(...classes: (string | undefined)[]) {
  const portal = typeof window !== 'undefined' ? getPortal() : null;
  const scope = portal === 'donor' ? 'portal-donor' : portal === 'app' ? 'portal-app' : '';
  return cn(scope, ...classes);
}
