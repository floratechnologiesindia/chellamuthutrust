import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DonorLayout } from '@/components/layout/donor/DonorLayout';
import { DonorPortalHero, type DonorPortalTab } from '@/components/donor/DonorPortalHero';
import { DonorFoodCalendarSection } from '@/components/donor/DonorFoodCalendarSection';
import { DonorNeedsSection } from '@/components/donor/DonorNeedsSection';
import { DonorOtpAuth } from '@/components/donor/DonorOtpAuth';
import MyDonations from '@/pages/MyDonations';
import DonorProfile from '@/pages/DonorProfile';
import { DonorImpactsSection } from '@/components/donor/DonorImpactsSection';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const VALID_TABS = new Set<DonorPortalTab>(['food', 'sponsor', 'donations', 'impacts', 'account']);

const parseTab = (value: string | null): DonorPortalTab => {
  if (value && VALID_TABS.has(value as DonorPortalTab)) {
    return value as DonorPortalTab;
  }
  return 'food';
};

const DonorPortal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const activeTab = parseTab(searchParams.get('tab'));
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHighlight, setContentHighlight] = useState(false);
  const isFirstTabRender = useRef(true);

  const setActiveTab = useCallback((tab: DonorPortalTab) => {
    setSearchParams(tab === 'food' ? {} : { tab }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && !VALID_TABS.has(tabParam as DonorPortalTab)) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }

    const node = contentRef.current;
    if (!node) return;

    const headerOffset = 80;
    const top = node.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    setContentHighlight(true);
    const timer = window.setTimeout(() => setContentHighlight(false), 1200);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const renderAuthGate = (children: ReactNode) => {
    if (isAuthenticated) {
      return (
        <section className="donor-section border-t border-[var(--msc-border)]">
          {children}
        </section>
      );
    }
    return (
      <section className="donor-section border-t border-[var(--msc-border)]">
        <div className="donor-container py-10 md:py-14 max-w-md mx-auto">
          <DonorOtpAuth submitLabel="Sign in to continue" phoneOnly />
        </div>
      </section>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'food':
        return <DonorFoodCalendarSection />;
      case 'sponsor':
        return <DonorNeedsSection />;
      case 'donations':
        return renderAuthGate(<MyDonations embedded />);
      case 'impacts':
        return renderAuthGate(<DonorImpactsSection />);
      case 'account':
        return renderAuthGate(<DonorProfile embedded />);
      default:
        return <DonorFoodCalendarSection />;
    }
  };

  return (
    <DonorLayout>
      <DonorPortalHero activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        ref={contentRef}
        id="donor-portal-tab-content"
        className={cn(
          'donor-tab-content',
          contentHighlight && 'donor-tab-content-highlight',
        )}
      >
        {renderTabContent()}
      </div>
    </DonorLayout>
  );
};

export default DonorPortal;
