import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryStat {
  count: number;
  amount: number;
}

export interface DonorCategoryStats {
  food_distribution: CategoryStat;
  trust_welfare: CategoryStat;
  impact_programs: CategoryStat;
  need_list: CategoryStat;
  corpus_fund: CategoryStat;
  kind_donation: CategoryStat;
  food_slots: CategoryStat;
  totalDonationsCount: number;
  totalAmount: number;
  lastInteraction: string | null;
}

export function useDonorCategoryStats(donorId: string | null) {
  return useQuery({
    queryKey: ['donor-category-stats', donorId],
    queryFn: async (): Promise<DonorCategoryStats | null> => {
      if (!donorId) return null;

      // Fetch donations with category info (for Trust Welfare, Impact Programs, Need List)
      const { data: donations } = await supabase
        .from('donations')
        .select(`
          id, 
          amount_pledged,
          start_date,
          needs(
            category_id,
            categories(key)
          )
        `)
        .eq('donor_id', donorId);

      // Fetch food slots
      const { data: foodSlots } = await supabase
        .from('food_slots')
        .select('id, amount, date')
        .eq('donor_id', donorId);

      // Fetch corpus fund contributions
      const { data: corpusFund } = await supabase
        .from('corpus_fund_contributions')
        .select('id, amount, contribution_date')
        .eq('donor_id', donorId);

      // Fetch kind donations
      const { data: kindDonations } = await supabase
        .from('kind_donations')
        .select('id, estimated_value, received_date')
        .eq('donor_id', donorId);

      // Initialize category stats
      const stats: DonorCategoryStats = {
        food_distribution: { count: 0, amount: 0 },
        trust_welfare: { count: 0, amount: 0 },
        impact_programs: { count: 0, amount: 0 },
        need_list: { count: 0, amount: 0 },
        corpus_fund: { count: 0, amount: 0 },
        kind_donation: { count: 0, amount: 0 },
        food_slots: { count: 0, amount: 0 },
        totalDonationsCount: 0,
        totalAmount: 0,
        lastInteraction: null,
      };

      // Track all dates for last interaction
      const allDates: string[] = [];

      // Process donations by category
      if (donations) {
        donations.forEach((d) => {
          const categoryKey = d.needs?.categories?.key;
          const amount = Number(d.amount_pledged) || 0;
          
          if (d.start_date) allDates.push(d.start_date);

          switch (categoryKey) {
            case 'food_distribution':
              stats.food_distribution.count++;
              stats.food_distribution.amount += amount;
              break;
            case 'trust_welfare':
              stats.trust_welfare.count++;
              stats.trust_welfare.amount += amount;
              break;
            case 'impact_programs':
              stats.impact_programs.count++;
              stats.impact_programs.amount += amount;
              break;
            case 'need_list':
              stats.need_list.count++;
              stats.need_list.amount += amount;
              break;
            default:
              // Donations without category or with unknown category
              // Still count them in total
              break;
          }
          stats.totalAmount += amount;
        });
        stats.totalDonationsCount += donations.length;
      }

      // Process food slots
      if (foodSlots) {
        foodSlots.forEach((fs) => {
          stats.food_slots.count++;
          stats.food_slots.amount += Number(fs.amount) || 0;
          stats.totalAmount += Number(fs.amount) || 0;
          if (fs.date) allDates.push(fs.date);
        });
        stats.totalDonationsCount += foodSlots.length;
      }

      // Process corpus fund
      if (corpusFund) {
        corpusFund.forEach((cf) => {
          stats.corpus_fund.count++;
          stats.corpus_fund.amount += Number(cf.amount) || 0;
          stats.totalAmount += Number(cf.amount) || 0;
          if (cf.contribution_date) allDates.push(cf.contribution_date);
        });
        stats.totalDonationsCount += corpusFund.length;
      }

      // Process kind donations
      if (kindDonations) {
        kindDonations.forEach((kd) => {
          stats.kind_donation.count++;
          stats.kind_donation.amount += Number(kd.estimated_value) || 0;
          stats.totalAmount += Number(kd.estimated_value) || 0;
          if (kd.received_date) allDates.push(kd.received_date);
        });
        stats.totalDonationsCount += kindDonations.length;
      }

      // Calculate last interaction date
      if (allDates.length > 0) {
        allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        stats.lastInteraction = allDates[0];
      }

      return stats;
    },
    enabled: !!donorId,
  });
}
