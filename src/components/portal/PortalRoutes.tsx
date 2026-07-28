import { useLayoutEffect } from 'react';
import { getPortal, getCanonicalPortalUrl } from '@/lib/portal';
import { DonorRoutes } from '@/routes/DonorRoutes';
import { AppRoutes } from '@/routes/AppRoutes';

export const PortalRoutes = () => {
  const portal = getPortal();

  useLayoutEffect(() => {
    if (portal === null) {
      window.location.replace(getCanonicalPortalUrl());
    }
  }, [portal]);

  if (portal === null) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Redirecting to portal…
      </div>
    );
  }

  return portal === 'donor' ? <DonorRoutes /> : <AppRoutes />;
};
