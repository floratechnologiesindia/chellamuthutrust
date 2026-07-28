import { Heart } from 'lucide-react';
import { SponsorNeedsBrowser } from '@/components/sponsor/SponsorNeedsBrowser';

export const DonorNeedsSection = () => (
  <section className="donor-section border-t border-[var(--msc-border)]">
    <div className="donor-container py-10 md:py-14">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-[#ffca0f]/20">
          <Heart className="h-6 w-6 text-[#ff6633]" />
        </div>
        <div>
          <h2 className="donor-section-title">Sponsor a Need</h2>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            Filter by category or project, and sponsor a requirement
          </p>
        </div>
      </div>

      <SponsorNeedsBrowser embedded excludeFoodCategory />
    </div>
  </section>
);
