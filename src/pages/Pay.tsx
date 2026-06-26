import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, CreditCard, Calendar, Home, IndianRupee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRazorpay } from '@/hooks/useRazorpay';
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

  const { initiatePayment, isProcessing } = useRazorpay();

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
          donor: data.donor as any,
          home: data.home as any,
          need: data.need as any,
        });
      } catch {
        setError('Failed to load donation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDonation();
  }, [donationId]);

  const handlePay = () => {
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
        setDonation(prev => prev ? { ...prev, status: 'ACTIVE' } : null);
      },
      onFailure: (err) => {
        setError(err);
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !donation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Please check the link and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Thank you, {donation?.donor.name}. Your payment of {formatCurrency(donation?.amount_pledged || 0)} has been received.
            </p>
            <p className="text-sm text-muted-foreground">You will receive a confirmation email shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (donation?.status === 'COMPLETED' || donation?.status === 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Payment Already Completed</h2>
            <p className="text-muted-foreground">
              This donation has already been paid. Thank you for your generosity!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">MS Chellamuthu Trust</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" /> Home
              </span>
              <span className="font-medium">{donation?.home.name}</span>
            </div>
            {donation?.need?.description && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Event</span>
                <span className="text-sm text-right">{donation.need.description}</span>
              </div>
            )}
            {donation?.need?.categories?.label && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="secondary">{donation.need.categories.label}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Date
              </span>
              <span className="font-medium">{format(new Date(donation!.start_date), 'dd MMM yyyy')}</span>
            </div>
            {donation?.occasion_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Occasion</span>
                <span className="capitalize">{donation.occasion_type.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="text-center py-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold flex items-center justify-center gap-1">
              <IndianRupee className="h-6 w-6" />
              {donation?.amount_pledged.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Pay Button */}
          <Button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full h-12 text-lg gap-2"
            size="lg"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            {isProcessing ? 'Processing...' : 'Pay Now'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Razorpay
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pay;
