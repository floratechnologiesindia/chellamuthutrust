import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2, Calendar, Home, IndianRupee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRazorpay } from '@/hooks/useRazorpay';
import { DonorManualPayment, DonorPaymentStatus } from '@/components/donor/DonorManualPayment';
import { useManualDonationPayment } from '@/hooks/useManualPayment';
import { isManualPaymentsEnabled } from '@/lib/manualPayments';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface DonationDetails {
  id: string;
  amount_pledged: number;
  start_date: string;
  occasion_type: string | null;
  occasion_note: string | null;
  status: string | null;
  donor: { name: string; email: string; phone: string | null };
  home: { name: string };
  need?: { description: string | null; categories?: { label: string } | null };
}

const Pay = () => {
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get('donationId');

  const [donation, setDonation] = useState<DonationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const { initiatePayment, isProcessing } = useRazorpay();
  const manualPayment = useManualDonationPayment();
  const useManual = isManualPaymentsEnabled();

  useEffect(() => {
    if (!donationId) {
      setError('No donation ID provided.');
      setLoading(false);
      return;
    }

    const fetchDonation = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('donations')
          .select(`
            id, amount_pledged, start_date, occasion_type, occasion_note, status,
            donor:profiles!donations_donor_id_fkey(name, email, phone),
            home:homes!donations_home_id_fkey(name),
            need:needs!donations_need_id_fkey(description, categories(label))
          `)
          .eq('id', donationId)
          .single();

        if (fetchError || !data) {
          setError('Donation not found or has been removed.');
          return;
        }

        setDonation({
          id: data.id,
          amount_pledged: data.amount_pledged,
          start_date: data.start_date,
          occasion_type: data.occasion_type,
          occasion_note: data.occasion_note,
          status: data.status,
          donor: data.donor as DonationDetails['donor'],
          home: data.home as DonationDetails['home'],
          need: data.need as DonationDetails['need'],
        });
      } catch {
        setError('Failed to load donation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDonation();
  }, [donationId]);

  const handleRazorpayPay = () => {
    if (!donation) return;
    initiatePayment({
      amount: donation.amount_pledged,
      donationId: donation.id,
      donorName: donation.donor.name,
      donorEmail: donation.donor.email,
      donorPhone: donation.donor.phone || undefined,
      description: donation.need?.description || 'Donation Payment',
      onSuccess: () => {
        setPaymentSuccess(true);
        setDonation((prev) => (prev ? { ...prev, status: 'ACTIVE' } : null));
      },
      onFailure: (err) => setError(err),
    });
  };

  const handleManualSuccess = async () => {
    if (!donation) return;
    try {
      await manualPayment.mutateAsync(donation.id);
      setPaymentSuccess(true);
      setDonation((prev) => (prev ? { ...prev, status: 'ACTIVE' } : null));
    } catch {
      /* hook handles toast */
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#ffca0f' }} />
        </div>
      </MainLayout>
    );
  }

  if (error && !donation) {
    return (
      <MainLayout>
        <div className="donor-container py-16">
          <DonorPaymentStatus
            status="failure"
            title="Donation Not Found"
            message={error}
            primaryAction={{ label: 'Back to Home', href: '/' }}
          />
        </div>
      </MainLayout>
    );
  }

  if (paymentSuccess) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16">
          <DonorPaymentStatus
            status="success"
            title="Payment Successful!"
            message={`Thank you, ${donation?.donor.name}. Your payment of ${formatCurrency(donation?.amount_pledged || 0)} has been received.`}
            amount={donation?.amount_pledged}
            primaryAction={{ label: 'Back to Home', href: '/' }}
            secondaryAction={{ label: 'My Donations', href: '/?tab=donations' }}
          />
        </div>
      </MainLayout>
    );
  }

  if (paymentFailed) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16">
          <DonorPaymentStatus
            status="failure"
            title="Payment Not Completed"
            message="Your sponsorship is saved. You can try paying again from My Donations."
            amount={donation?.amount_pledged}
            primaryAction={{ label: 'Back to Home', href: '/' }}
            secondaryAction={{ label: 'My Donations', href: '/?tab=donations' }}
          />
        </div>
      </MainLayout>
    );
  }

  if (donation?.status === 'COMPLETED' || donation?.status === 'ACTIVE') {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16">
          <DonorPaymentStatus
            status="success"
            title="Payment Already Completed"
            message="This donation has already been paid. Thank you for your generosity!"
            amount={donation.amount_pledged}
            primaryAction={{ label: 'Back to Home', href: '/' }}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="donor-container py-12 md:py-16 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="donor-section-title">Complete Your Payment</h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>M.S. Chellamuthu Trust</p>
        </div>

        <div className="donor-card p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: '#666' }}>
              <Home className="h-4 w-4" /> Project
            </span>
            <span className="font-medium" style={{ color: '#333' }}>{donation?.home.name}</span>
          </div>
          {donation?.need?.description && (
            <div className="flex items-start justify-between gap-4 text-sm">
              <span style={{ color: '#666' }}>Event</span>
              <span className="text-right" style={{ color: '#333' }}>{donation.need.description}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: '#666' }}>
              <Calendar className="h-4 w-4" /> Date
            </span>
            <span className="font-medium" style={{ color: '#333' }}>
              {donation && format(new Date(donation.start_date), 'dd MMM yyyy')}
            </span>
          </div>
          <div className="text-center pt-4 border-t" style={{ borderColor: 'var(--msc-border)' }}>
            <p className="text-sm mb-1" style={{ color: '#666' }}>Amount to Pay</p>
            <p className="text-3xl font-semibold flex items-center justify-center gap-1" style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}>
              <IndianRupee className="h-6 w-6" />
              {donation?.amount_pledged.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {useManual ? (
          <DonorManualPayment
            amount={donation?.amount_pledged || 0}
            summary={donation?.need?.categories?.label || 'Donation'}
            isProcessing={manualPayment.isPending}
            onSuccess={handleManualSuccess}
            onFailure={() => setPaymentFailed(true)}
          />
        ) : (
          <button
            type="button"
            onClick={handleRazorpayPay}
            disabled={isProcessing}
            className="donor-btn donor-btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
            {isProcessing ? 'Processing…' : 'Pay Now'}
          </button>
        )}

        {error && (
          <p className="text-sm text-destructive text-center mt-4">{error}</p>
        )}
      </div>
    </MainLayout>
  );
};

export default Pay;
