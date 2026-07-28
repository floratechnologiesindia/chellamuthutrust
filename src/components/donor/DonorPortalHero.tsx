import { WEBSITE_CONTACT } from '@/config/website';
import { DonorPortalTabs, type DonorPortalTab } from '@/components/donor/DonorPortalTabs';

export type { DonorPortalTab };

interface DonorPortalHeroProps {
  activeTab: DonorPortalTab;
  onTabChange: (tab: DonorPortalTab) => void;
}

export const DonorPortalHero = ({ activeTab, onTabChange }: DonorPortalHeroProps) => (
  <section className="donor-hero">
    <div className="donor-container py-14 md:py-20 text-center">
      <div className="max-w-3xl mx-auto">
        <p
          className="donor-label mb-4"
          style={{ color: '#ff6633', fontFamily: 'Rubik, sans-serif', letterSpacing: '0.2em' }}
        >
          Donor Portal
        </p>
        <h1
          className="text-4xl md:text-5xl lg:text-[3.25rem] leading-tight mb-6"
          style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 300, color: '#333' }}
        >
          Make a <span className="donor-hero-accent">DIFFERENCE</span>
        </h1>
        <p
          className="text-base md:text-lg leading-relaxed mx-auto max-w-2xl"
          style={{ color: '#666', fontFamily: 'Rubik, sans-serif', fontWeight: 300 }}
        >
          {WEBSITE_CONTACT.orgName} strives to make quality mental health care affordable and
          accessible to all. Choose how you would like to give today.
        </p>
      </div>

      <div className="mt-8">
        <DonorPortalTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  </section>
);
