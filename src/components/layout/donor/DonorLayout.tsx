import { ReactNode } from 'react';
import { DonorHeader } from './DonorHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useDonorNotificationAlerts } from '@/hooks/useDonorNotificationAlerts';
import { usePortalBodyClass } from '@/hooks/usePortalBodyClass';

interface DonorLayoutProps {
  children: ReactNode;
}

export const DonorLayout = ({ children }: DonorLayoutProps) => {
  const { user, isAuthenticated } = useAuth();
  useDonorNotificationAlerts(isAuthenticated ? user?.id : null);
  usePortalBodyClass();

  return (
    <div className="portal-donor min-h-screen flex flex-col">
      <DonorHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
};
