import { Sparkles } from 'lucide-react';

export const DonorImpactsSection = () => (
  <section className="donor-section border-t border-[var(--msc-border)]">
    <div className="donor-container py-14 md:py-20 max-w-lg mx-auto text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ff6633]/10 mb-5">
        <Sparkles className="h-7 w-7 text-[#ff6633]" />
      </div>
      <h2 className="donor-section-title text-2xl mb-3">My Impacts</h2>
      <p
        className="text-base leading-relaxed"
        style={{ color: '#666', fontFamily: 'Rubik, sans-serif', fontWeight: 300 }}
      >
        See the difference your generosity makes — stories, photos, and outcomes from the projects you support.
      </p>
      <p
        className="mt-6 inline-block rounded-full border border-[#ff6633]/30 bg-[#fff8f5] px-5 py-2 text-sm font-medium text-[#ff6633]"
        style={{ fontFamily: 'Rubik, sans-serif' }}
      >
        Coming soon
      </p>
    </div>
  </section>
);
