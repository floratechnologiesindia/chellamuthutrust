import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkDoneSummary {
  homeId: string;
  homeName: string;
  completedFoodSlots: number;
  receivedKindDonations: number;
  completedNeeds: number;
  completedTasks: number;
  totalValue: number;
}

export interface CompletedFoodSlot {
  id: string;
  date: string;
  time_slot: string;
  amount: number | null;
  donor_id: string | null;
  donor_name: string | null;
  home_name: string;
  completion_notes: string | null;
  completion_photos: string[] | null;
  completed_at: string;
  report_sent_at: string | null;
}

export interface ReceivedKindDonation {
  id: string;
  item_type: string;
  item_description: string | null;
  quantity: number | null;
  estimated_value: number | null;
  donor_id: string | null;
  donor_name: string | null;
  home_name: string;
  received_date: string;
  completion_notes: string | null;
  completion_photos: string[] | null;
  report_sent_at: string | null;
}

export interface CompletedNeed {
  id: string;
  description: string | null;
  category_label: string | null;
  collected_amount: number | null;
  home_name: string;
  date: string;
  fulfillment_details: string | null;
  report_sent_at: string | null;
}

export interface CompletedTask {
  id: string;
  title: string;
  home_name: string | null;
  assignee_name: string | null;
  completed_at: string | null;
  report_sent_at: string | null;
}

export function useHomeWorkDoneSummary(trustId?: string, homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['home-work-done-summary', trustId, homeId, dateRange],
    queryFn: async () => {
      // Get date filter
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get all homes
      let homesQuery = supabase.from('homes').select('id, name, trust_id');
      if (trustId && trustId !== 'all') {
        homesQuery = homesQuery.eq('trust_id', trustId);
      }
      if (homeId && homeId !== 'all') {
        homesQuery = homesQuery.eq('id', homeId);
      }
      const { data: homes, error: homesError } = await homesQuery;
      if (homesError) throw homesError;

      // Get completed food slots
      let foodSlotsQuery = supabase
        .from('food_slots')
        .select('id, home_id, amount, date')
        .eq('completion_status', 'COMPLETED')
        .gte('date', startDateStr);
      if (homeId && homeId !== 'all') {
        foodSlotsQuery = foodSlotsQuery.eq('home_id', homeId);
      }
      const { data: foodSlots, error: foodSlotsError } = await foodSlotsQuery;
      if (foodSlotsError) throw foodSlotsError;

      // Get received kind donations
      let kindDonationsQuery = supabase
        .from('kind_donations')
        .select('id, home_id, estimated_value, received_date')
        .eq('status', 'RECEIVED')
        .gte('received_date', startDateStr);
      if (homeId && homeId !== 'all') {
        kindDonationsQuery = kindDonationsQuery.eq('home_id', homeId);
      }
      const { data: kindDonations, error: kindDonationsError } = await kindDonationsQuery;
      if (kindDonationsError) throw kindDonationsError;

      // Get completed needs
      let needsQuery = supabase
        .from('needs')
        .select('id, home_id, collected_amount, date')
        .eq('status', 'COMPLETED')
        .gte('date', startDateStr);
      if (homeId && homeId !== 'all') {
        needsQuery = needsQuery.eq('home_id', homeId);
      }
      const { data: needs, error: needsError } = await needsQuery;
      if (needsError) throw needsError;

      // Get completed tasks
      let tasksQuery = supabase
        .from('tasks')
        .select('id, home_id, completed_at')
        .eq('status', 'COMPLETED')
        .not('completed_at', 'is', null);
      if (homeId && homeId !== 'all') {
        tasksQuery = tasksQuery.eq('home_id', homeId);
      }
      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // Aggregate by project
      const homeIds = homes?.filter(h => 
        !trustId || trustId === 'all' || h.trust_id === trustId
      ).map(h => h.id) || [];

      return homes?.filter(h => homeIds.includes(h.id)).map(home => {
        const homeFoodSlots = foodSlots?.filter(fs => fs.home_id === home.id) || [];
        const homeKindDonations = kindDonations?.filter(kd => kd.home_id === home.id) || [];
        const homeNeeds = needs?.filter(n => n.home_id === home.id) || [];
        const homeTasks = tasks?.filter(t => t.home_id === home.id) || [];

        const foodSlotsValue = homeFoodSlots.reduce((sum, fs) => sum + (fs.amount || 0), 0);
        const kindDonationsValue = homeKindDonations.reduce((sum, kd) => sum + (kd.estimated_value || 0), 0);
        const needsValue = homeNeeds.reduce((sum, n) => sum + (n.collected_amount || 0), 0);

        return {
          homeId: home.id,
          homeName: home.name,
          completedFoodSlots: homeFoodSlots.length,
          receivedKindDonations: homeKindDonations.length,
          completedNeeds: homeNeeds.length,
          completedTasks: homeTasks.length,
          totalValue: foodSlotsValue + kindDonationsValue + needsValue,
        } as WorkDoneSummary;
      }) || [];
    },
  });
}

export function useCompletedFoodSlots(homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['completed-food-slots', homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from('food_slots')
        .select(`
          id,
          date,
          time_slot,
          amount,
          completion_notes,
          completion_photos,
          updated_at,
          donor_id,
          report_sent_at,
          profiles:donor_id (name),
          homes:home_id (name)
        `)
        .eq('completion_status', 'COMPLETED')
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (homeId && homeId !== 'all') {
        query = query.eq('home_id', homeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(slot => ({
        id: slot.id,
        date: slot.date,
        time_slot: slot.time_slot,
        amount: slot.amount,
        donor_id: slot.donor_id,
        donor_name: (slot.profiles as any)?.name || 'Anonymous',
        home_name: (slot.homes as any)?.name || 'Unknown',
        completion_notes: slot.completion_notes,
        completion_photos: slot.completion_photos,
        completed_at: slot.updated_at,
        report_sent_at: (slot as any).report_sent_at,
      })) as CompletedFoodSlot[] || [];
    },
  });
}

export function useReceivedKindDonations(homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['received-kind-donations', homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from('kind_donations')
        .select(`
          id,
          item_type,
          item_description,
          quantity,
          estimated_value,
          donor_name,
          received_date,
          completion_notes,
          completion_photos,
          donor_id,
          report_sent_at,
          profiles:donor_id (name),
          homes:home_id (name)
        `)
        .eq('status', 'RECEIVED')
        .gte('received_date', startDateStr)
        .order('received_date', { ascending: false });

      if (homeId && homeId !== 'all') {
        query = query.eq('home_id', homeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(donation => ({
        id: donation.id,
        item_type: donation.item_type,
        item_description: donation.item_description,
        quantity: donation.quantity,
        estimated_value: donation.estimated_value,
        donor_id: donation.donor_id,
        donor_name: (donation.profiles as any)?.name || donation.donor_name || 'Anonymous',
        home_name: (donation.homes as any)?.name || 'Unknown',
        received_date: donation.received_date,
        completion_notes: donation.completion_notes,
        completion_photos: donation.completion_photos,
        report_sent_at: (donation as any).report_sent_at,
      })) as ReceivedKindDonation[] || [];
    },
  });
}

export function useCompletedNeeds(homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['completed-needs', homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      let query = supabase
        .from('needs')
        .select(`
          id,
          description,
          collected_amount,
          date,
          fulfillment_details,
          report_sent_at,
          categories:category_id (label),
          homes:home_id (name)
        `)
        .eq('status', 'COMPLETED')
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (homeId && homeId !== 'all') {
        query = query.eq('home_id', homeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(need => ({
        id: need.id,
        description: need.description,
        category_label: (need.categories as any)?.label || null,
        collected_amount: need.collected_amount,
        home_name: (need.homes as any)?.name || 'Unknown',
        date: need.date,
        fulfillment_details: need.fulfillment_details,
        report_sent_at: (need as any).report_sent_at,
      })) as CompletedNeed[] || [];
    },
  });
}

export function useCompletedTasks(homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['completed-tasks', homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString();

      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          completed_at,
          report_sent_at,
          homes:home_id (name),
          profiles:assigned_to (name)
        `)
        .eq('status', 'COMPLETED')
        .not('completed_at', 'is', null)
        .gte('completed_at', startDateStr)
        .order('completed_at', { ascending: false });

      if (homeId && homeId !== 'all') {
        query = query.eq('home_id', homeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(task => ({
        id: task.id,
        title: task.title,
        home_name: (task.homes as any)?.name || null,
        assignee_name: (task.profiles as any)?.name || null,
        completed_at: task.completed_at,
        report_sent_at: (task as any).report_sent_at,
      })) as CompletedTask[] || [];
    },
  });
}

export function useWorkDoneTotals(trustId?: string, homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['work-done-totals', trustId, homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get completed food slots count
      let foodSlotsQuery = supabase
        .from('food_slots')
        .select('id, amount', { count: 'exact' })
        .eq('completion_status', 'COMPLETED')
        .gte('date', startDateStr);
      if (homeId && homeId !== 'all') {
        foodSlotsQuery = foodSlotsQuery.eq('home_id', homeId);
      }
      const { data: foodSlots, count: foodSlotsCount } = await foodSlotsQuery;

      // Get received kind donations count
      let kindDonationsQuery = supabase
        .from('kind_donations')
        .select('id, estimated_value', { count: 'exact' })
        .eq('status', 'RECEIVED')
        .gte('received_date', startDateStr);
      if (homeId && homeId !== 'all') {
        kindDonationsQuery = kindDonationsQuery.eq('home_id', homeId);
      }
      const { data: kindDonations, count: kindDonationsCount } = await kindDonationsQuery;

      // Get completed needs count
      let needsQuery = supabase
        .from('needs')
        .select('id', { count: 'exact' })
        .eq('status', 'COMPLETED')
        .gte('date', startDateStr);
      if (homeId && homeId !== 'all') {
        needsQuery = needsQuery.eq('home_id', homeId);
      }
      const { count: needsCount } = await needsQuery;

      // Get completed tasks count
      let tasksQuery = supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('status', 'COMPLETED')
        .not('completed_at', 'is', null);
      if (homeId && homeId !== 'all') {
        tasksQuery = tasksQuery.eq('home_id', homeId);
      }
      const { count: tasksCount } = await tasksQuery;

      // Calculate total value
      const foodSlotsValue = foodSlots?.reduce((sum, fs) => sum + (fs.amount || 0), 0) || 0;
      const kindDonationsValue = kindDonations?.reduce((sum, kd) => sum + (kd.estimated_value || 0), 0) || 0;

      return {
        completedFoodSlots: foodSlotsCount || 0,
        receivedKindDonations: kindDonationsCount || 0,
        completedNeeds: needsCount || 0,
        completedTasks: tasksCount || 0,
        totalValue: foodSlotsValue + kindDonationsValue,
      };
    },
  });
}

export function useAllCompletionPhotos(homeId?: string, dateRange?: number) {
  return useQuery({
    queryKey: ['all-completion-photos', homeId, dateRange],
    queryFn: async () => {
      const daysAgo = dateRange || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get food slots with photos
      let foodSlotsQuery = supabase
        .from('food_slots')
        .select('id, date, time_slot, completion_photos, homes:home_id (name)')
        .eq('completion_status', 'COMPLETED')
        .not('completion_photos', 'is', null)
        .gte('date', startDateStr);
      if (homeId && homeId !== 'all') {
        foodSlotsQuery = foodSlotsQuery.eq('home_id', homeId);
      }
      const { data: foodSlots } = await foodSlotsQuery;

      // Get kind donations with photos
      let kindDonationsQuery = supabase
        .from('kind_donations')
        .select('id, received_date, item_type, completion_photos, homes:home_id (name)')
        .eq('status', 'RECEIVED')
        .not('completion_photos', 'is', null)
        .gte('received_date', startDateStr);
      if (homeId && homeId !== 'all') {
        kindDonationsQuery = kindDonationsQuery.eq('home_id', homeId);
      }
      const { data: kindDonations } = await kindDonationsQuery;

      const photos: { url: string; type: string; label: string; date: string; home: string }[] = [];

      foodSlots?.forEach(slot => {
        slot.completion_photos?.forEach((url: string) => {
          photos.push({
            url,
            type: 'food_slot',
            label: `${slot.time_slot} Food`,
            date: slot.date,
            home: (slot.homes as any)?.name || 'Unknown',
          });
        });
      });

      kindDonations?.forEach(donation => {
        donation.completion_photos?.forEach((url: string) => {
          photos.push({
            url,
            type: 'kind_donation',
            label: donation.item_type,
            date: donation.received_date,
            home: (donation.homes as any)?.name || 'Unknown',
          });
        });
      });

      return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });
}
