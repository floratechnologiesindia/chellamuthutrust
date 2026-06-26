import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpcomingOpportunity {
  donationId: string;
  donorId: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string;
  homeName: string;
  homeId: string;
  occasionType: string | null;
  occasionNote: string | null;
  originalAmount: number;
  startDate: string;
  anniversaryDate: string;
  daysUntil: number;
}

export function useUpcomingDonationOpportunities(daysAhead = 30) {
  return useQuery({
    queryKey: ['upcoming-donation-opportunities', daysAhead],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          id, donor_id, start_date, amount_pledged, occasion_type, occasion_note,
          home_id,
          profiles (id, name, email, phone),
          homes (id, name, city)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const opportunities: UpcomingOpportunity[] = [];

      for (const d of data) {
        const startDate = new Date(d.start_date);
        // Build anniversary for current year
        let anniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
        // If already passed this year, use next year
        if (anniversary < today) {
          anniversary = new Date(today.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        }
        const daysUntil = Math.ceil((anniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= daysAhead) {
          const profile = d.profiles as any;
          const home = d.homes as any;
          opportunities.push({
            donationId: d.id,
            donorId: d.donor_id,
            donorName: profile?.name || 'Unknown',
            donorPhone: profile?.phone || null,
            donorEmail: profile?.email || '',
            homeName: home?.name || 'Unknown',
            homeId: d.home_id,
            occasionType: d.occasion_type,
            occasionNote: d.occasion_note,
            originalAmount: d.amount_pledged,
            startDate: d.start_date,
            anniversaryDate: anniversary.toISOString().split('T')[0],
            daysUntil,
          });
        }
      }

      // Sort by nearest first
      opportunities.sort((a, b) => a.daysUntil - b.daysUntil);
      return opportunities;
    },
  });
}
