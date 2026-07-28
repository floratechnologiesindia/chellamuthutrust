import { cn } from '@/lib/utils';

export type DonorPortalTab = 'food' | 'sponsor' | 'donations' | 'impacts' | 'account';

const TABS: { id: DonorPortalTab; label: string }[] = [
  { id: 'food', label: 'Donate Food' },
  { id: 'sponsor', label: 'Sponsor a Need' },
  { id: 'donations', label: 'My Donations' },
  { id: 'impacts', label: 'My Impacts' },
  { id: 'account', label: 'My Account' },
];

interface DonorPortalTabsProps {
  activeTab?: DonorPortalTab;
  onTabChange: (tab: DonorPortalTab) => void;
}

export const DonorPortalTabs = ({ activeTab, onTabChange }: DonorPortalTabsProps) => (
  <div className="donor-portal-tabs flex flex-nowrap justify-center gap-2 sm:gap-3 max-sm:overflow-x-auto max-sm:py-1">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onTabChange(tab.id)}
        className={cn(
          'donor-btn shrink-0 whitespace-nowrap px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[0.9375rem]',
          activeTab === tab.id ? 'donor-btn-primary donor-portal-tab-active' : 'donor-btn-outline',
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
