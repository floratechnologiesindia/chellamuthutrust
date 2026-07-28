import { useLayoutEffect } from 'react';
import { getPortal } from '@/lib/portal';

/** Apply portal-scoped body class so portaled Radix overlays inherit MSC theme tokens. */
export function usePortalBodyClass() {
  useLayoutEffect(() => {
    const portal = getPortal();
    const { body } = document;
    body.classList.remove('portal-donor', 'portal-app');
    if (portal === 'donor') body.classList.add('portal-donor');
    else if (portal === 'app') body.classList.add('portal-app');
    return () => {
      body.classList.remove('portal-donor', 'portal-app');
    };
  }, []);
}
