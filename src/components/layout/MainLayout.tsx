import { ReactNode } from 'react';
import { isDonorPortal } from '@/lib/portal';
import { DonorLayout } from './donor/DonorLayout';
import { AppLayout } from './app/AppLayout';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

/** Portal-aware shell — donor pages use website-matched layout; staff use CRM layout */
export const MainLayout = ({ children }: MainLayoutProps) => {
  if (isDonorPortal()) {
    return <DonorLayout>{children}</DonorLayout>;
  }
  // Legacy pages still on app host use AppLayout when authenticated flows need it
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};

/** @deprecated Use DonorLayout or AppLayout directly */
export const LegacyMainLayout = ({ children }: MainLayoutProps) => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1">{children}</main>
  </div>
);
