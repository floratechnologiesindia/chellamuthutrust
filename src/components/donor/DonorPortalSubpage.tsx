import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DonorPortalTabs, type DonorPortalTab } from '@/components/donor/DonorPortalTabs';

interface DonorPortalSubpageProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeTab?: DonorPortalTab;
}

export const DonorPortalSubpage = ({
  children,
  title,
  subtitle,
  activeTab,
}: DonorPortalSubpageProps) => {
  const navigate = useNavigate();

  const handleTabChange = (tab: DonorPortalTab) => {
    navigate(tab === 'food' ? '/' : `/?tab=${tab}`);
  };

  return (
    <>
      <section className="donor-hero donor-hero-compact">
        <div className="donor-container py-6 md:py-8">
          <DonorPortalTabs activeTab={activeTab} onTabChange={handleTabChange} />
          {(title || subtitle) && (
            <div className="text-center mt-6 max-w-2xl mx-auto">
              {title && <h1 className="donor-section-title">{title}</h1>}
              {subtitle && (
                <p
                  className="mt-2 text-base"
                  style={{ color: '#666', fontFamily: 'Rubik, sans-serif', fontWeight: 300 }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      {children}
    </>
  );
};
