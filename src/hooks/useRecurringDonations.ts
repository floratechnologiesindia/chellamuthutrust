import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DonationStatus = Database['public']['Enums']['donation_status'];

export interface RecurringDonationWithPayments {
  id: string;
  donor_id: string;
  home_id: string;
  trust_id: string;
  amount_pledged: number;
  status: DonationStatus;
  start_date: string;
  next_due_date: string | null;
  last_paid_date: string | null;
  homes?: {
    id: string;
    name: string;
    city: string;
  } | null;
  profiles?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  payments?: {
    id: string;
    amount: number;
    payment_date: string;
  }[];
}

export function useRecurringDonationsWithPayments() {
  return useQuery({
    queryKey: ['recurring-donations-with-payments'],
    queryFn: async () => {
      // Fetch recurring donations with homes and donor profiles
      const { data: donations, error } = await supabase
        .from('donations')
        .select(`
          id,
          donor_id,
          home_id,
          trust_id,
          amount_pledged,
          status,
          start_date,
          next_due_date,
          last_paid_date,
          homes (id, name, city),
          profiles (id, name, email, phone)
        `)
        .eq('sponsorship_type', 'RECURRING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch payments for all donations
      const donationIds = donations?.map(d => d.id) || [];
      
      if (donationIds.length === 0) {
        return [];
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('donation_payments')
        .select('id, donation_id, amount, payment_date')
        .in('donation_id', donationIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Group payments by donation
      const paymentsByDonation = new Map<string, typeof payments>();
      payments?.forEach(payment => {
        const existing = paymentsByDonation.get(payment.donation_id) || [];
        existing.push(payment);
        paymentsByDonation.set(payment.donation_id, existing);
      });

      // Combine donations with their payments
      return donations?.map(donation => ({
        ...donation,
        payments: paymentsByDonation.get(donation.id) || [],
      })) as RecurringDonationWithPayments[];
    },
  });
}