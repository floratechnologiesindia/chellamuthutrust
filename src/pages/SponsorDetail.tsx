import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeed } from '@/hooks/useNeeds';
import { useCreateDonation } from '@/hooks/useDonations';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDonor } from '@/hooks/useDonors';
import { NeedProgressDisplay } from '@/components/needs/NeedProgressDisplay';
import { ContributionModeSelector } from '@/components/donations/ContributionModeSelector';
import { KindDonationDialog } from '@/components/donations/KindDonationDialog';
import { DonorOtpAuth } from '@/components/donor/DonorOtpAuth';
import { DonorManualPayment, DonorPaymentStatus } from '@/components/donor/DonorManualPayment';
import {
  DonorFoodDonationDetailsForm,
  type FoodDonationDetails,
} from '@/components/donor/DonorFoodDonationDetailsForm';
import { DonorNeedDonationPreview } from '@/components/donor/DonorNeedDonationPreview';
import { useManualDonationPayment } from '@/hooks/useManualPayment';
import { isManualPaymentsEnabled, isRazorpayEnabled } from '@/lib/manualPayments';
import { getLoginPath, isDonorPortal } from '@/lib/portal';
import { getRazorpayDonorEmail } from '@/lib/donorEmail';
import { apiFetch } from '@/integrations/supabase/client';
import { Calendar, MapPin, Users, ArrowLeft, Heart, Loader2, IndianRupee, Package } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DonationType = Database['public']['Enums']['donation_type'];
type DonationMode = 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';
type CheckoutStep = 'form' | 'otp' | 'details' | 'preview' | 'payment' | 'failed';

function buildOccasionNote(details: FoodDonationDetails): string {
  const parts: string[] = [];
  if (details.donation_for) parts.push(`For: ${details.donation_for}`);
  if (details.event_date) parts.push(`Event date: ${details.event_date}`);
  if (details.occasion_note) parts.push(details.occasion_note);
  return parts.join(' · ');
}

function mapSponsorshipType(details: FoodDonationDetails): DonationType {
  return details.recurring_frequency === 'one_time' ? 'ONE_TIME' : 'RECURRING';
}

function mapOccasionType(
  details: FoodDonationDetails,
): Database['public']['Enums']['occasion_type'] {
  if (details.occasion_type === 'special_day') return 'other';
  return details.occasion_type;
}

const SponsorDetail = () => {
  const { needId } = useParams<{ needId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const initialMode = searchParams.get('mode') === 'product' ? 'product' : 'money';

  const [contributionMode, setContributionMode] = useState<'money' | 'product'>(initialMode);
  const [sponsorshipType, setSponsorshipType] = useState<DonationType>('ONE_TIME');
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showKindDonationDialog, setShowKindDonationDialog] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('form');
  const [pendingDonationId, setPendingDonationId] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [activeDonorId, setActiveDonorId] = useState<string | undefined>();
  const [isNewDonor, setIsNewDonor] = useState(false);
  const [donationDetails, setDonationDetails] = useState<FoodDonationDetails | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [paying, setPaying] = useState(false);

  const manualPayment = useManualDonationPayment();
  const donorPortal = isDonorPortal();
  const sponsorListPath = donorPortal ? '/?tab=sponsor' : '/sponsor';

  const { data: need, isLoading, error, refetch } = useNeed(needId || null);
  const createDonation = useCreateDonation();
  const { initiatePayment, isProcessing } = useRazorpay();

  const profileId = activeDonorId || user?.id;
  const { data: donorProfile } = useDonor(profileId);

  const home = need?.homes;
  const category = need?.categories;
  const subcategory = need?.subcategories;

  const donationMode: DonationMode = (need as { donation_mode?: DonationMode } | undefined)?.donation_mode || 'MONEY_ONLY';
  const requiredAmount = (need as { required_amount?: number } | undefined)?.required_amount || 0;
  const collectedAmount = (need as { collected_amount?: number } | undefined)?.collected_amount || 0;
  const requiredProductQty = (need as { required_product_qty?: number } | undefined)?.required_product_qty || 0;
  const fulfilledProductQty = (need as { fulfilled_product_qty?: number } | undefined)?.fulfilled_product_qty || 0;
  const productName = (need as { product_name?: string } | undefined)?.product_name || 'Items';
  const productUnit = (need as { product_unit?: string } | undefined)?.product_unit || 'pieces';

  const pendingAmount = Math.max(0, requiredAmount - collectedAmount);
  const pendingProducts = Math.max(0, requiredProductQty - fulfilledProductQty);

  useEffect(() => {
    if (donationMode === 'PRODUCT_ONLY') setContributionMode('product');
    else if (donationMode === 'MONEY_ONLY') setContributionMode('money');
  }, [donationMode]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !need || !home) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Need Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The sponsorship opportunity you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link to={sponsorListPath}>Browse All Needs</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const formattedDate = new Date(need.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isAvailable = need.status !== 'FULLY_SPONSORED' && need.status !== 'COMPLETED';
  const moneyAvailable = pendingAmount > 0;
  const productAvailable = pendingProducts > 0;
  const needLabel = category?.label || productName || 'Need';
  const amountValue = parseFloat(amount) || 0;

  const initialDonationDetails: Partial<FoodDonationDetails> = {
    name: isNewDonor ? '' : donorProfile?.name || user?.name || '',
    phone: donorProfile?.phone || user?.phone || verifiedPhone || '',
    pan_number: donorProfile?.pan_number || '',
    address: donorProfile?.address || '',
    occasion_type: 'birthday',
    occasion_note: '',
    donation_for: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    recurring_frequency: sponsorshipType === 'RECURRING' ? 'monthly' : 'one_time',
  };

  const isExistingDonor = Boolean(!isNewDonor && isAuthenticated && (donorProfile || user));

  const createDonationAndPay = async (
    donorUserId: string,
    details: FoodDonationDetails,
    checkoutPhone?: string,
  ) => {
    const donation = await createDonation.mutateAsync({
      need_id: need.id,
      trust_id: need.trust_id,
      home_id: need.home_id,
      sponsorship_type: mapSponsorshipType(details),
      amount_pledged: amountValue,
      payment_mode: 'online',
      start_date: need.date,
      occasion_type: mapOccasionType(details),
      occasion_note: buildOccasionNote(details) || null,
    });

    if (donorPortal && isManualPaymentsEnabled() && !isRazorpayEnabled()) {
      setPendingDonationId(donation.id);
      setCheckoutStep('payment');
      return;
    }

    initiatePayment({
      amount: amountValue,
      donationId: donation.id,
      donorName: details.name || user?.name || 'Donor',
      donorEmail: getRazorpayDonorEmail(user?.email),
      donorPhone: details.phone || user?.phone || checkoutPhone || verifiedPhone || undefined,
      description: `Sponsorship for ${home.name} - ${needLabel}`,
      onSuccess: () => {
        setIsSuccess(true);
        toast({ title: 'Payment Successful!', description: 'Thank you for your generous contribution.' });
      },
      onFailure: (err) => {
        if (err !== 'Payment cancelled by user') {
          toast({
            title: 'Payment Issue',
            description: `Sponsorship created but payment pending: ${err}. You can pay later from My Donations.`,
            variant: 'destructive',
          });
        }
        setIsSuccess(true);
      },
    });
  };

  const handleSubmitMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValue || amountValue < 100) {
      toast({ title: 'Enter a valid amount', description: 'Minimum contribution is ₹100.', variant: 'destructive' });
      return;
    }

    if (donorPortal) {
      if (!isAuthenticated) {
        setCheckoutStep('otp');
        return;
      }
      setActiveDonorId(user?.id);
      setCheckoutStep('details');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      toast({
        title: 'Please login first',
        description: 'You need to be logged in to sponsor a need.',
        variant: 'destructive',
      });
      navigate(getLoginPath());
      return;
    }

    setActiveDonorId(user.id);
    setCheckoutStep('details');
  };

  const handleOtpVerified = (userId?: string, phone?: string, newUser?: boolean) => {
    if (!userId) return;
    if (phone) setVerifiedPhone(phone);
    setIsNewDonor(Boolean(newUser));
    setActiveDonorId(userId);
    setCheckoutStep('details');
  };

  const saveDonationDetails = async (details: FoodDonationDetails) => {
    const donorUserId = activeDonorId || user?.id;
    if (!donorUserId) {
      toast({ title: 'Please verify your phone number first', variant: 'destructive' });
      return;
    }

    setSavingDetails(true);
    try {
      const res = await apiFetch(`/api/profiles/${donorUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: details.name,
          pan_number: details.pan_number,
          address: details.address,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save donation details');
      }
      setDonationDetails(details);
      setCheckoutStep('preview');
    } catch (err) {
      toast({
        title: 'Could not save details',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (!donationDetails) return;
    const donorUserId = activeDonorId || user?.id;
    if (!donorUserId) return;

    setPaying(true);
    try {
      await createDonationAndPay(donorUserId, donationDetails, verifiedPhone);
    } catch (err) {
      toast({
        title: 'Sponsorship Failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  };

  const handleManualPaymentSuccess = async () => {
    if (!pendingDonationId) return;
    try {
      await manualPayment.mutateAsync(pendingDonationId);
      setIsSuccess(true);
      setPaymentFailed(false);
    } catch {
      /* handled in hook */
    }
  };

  const handleManualPaymentFailure = () => {
    setPaymentFailed(true);
    setCheckoutStep('failed');
  };

  const handleOpenKindDonation = () => {
    if (donorPortal && !isAuthenticated) {
      setCheckoutStep('otp');
      return;
    }
    if (!isAuthenticated || !user?.id) {
      toast({
        title: 'Please login first',
        description: 'You need to be logged in to provide items.',
        variant: 'destructive',
      });
      navigate(getLoginPath());
      return;
    }
    setShowKindDonationDialog(true);
  };

  if (isSuccess) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16">
          <DonorPaymentStatus
            status="success"
            title="Thank You!"
            message={`Your sponsorship for ${home.name} on ${formattedDate} has been confirmed.`}
            amount={amountValue}
            primaryAction={{ label: 'Back to Home', href: '/' }}
            secondaryAction={{ label: 'My Donations', href: '/?tab=donations' }}
          />
        </div>
      </MainLayout>
    );
  }

  if (checkoutStep === 'failed' || paymentFailed) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16">
          <DonorPaymentStatus
            status="failure"
            title="Payment Not Completed"
            message="Your sponsorship was saved but payment was not completed. You can complete it from My Donations."
            amount={amountValue}
            primaryAction={{ label: 'Back to Home', href: '/' }}
            secondaryAction={{ label: 'My Donations', href: '/?tab=donations' }}
          />
        </div>
      </MainLayout>
    );
  }

  if (checkoutStep === 'otp') {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16 max-w-lg">
          <Button variant="ghost" className="mb-6 -ml-2" onClick={() => setCheckoutStep('form')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="donor-card p-6 md:p-8">
            <DonorOtpAuth onVerified={handleOtpVerified} phoneOnly submitLabel="Send OTP & Continue" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (checkoutStep === 'details') {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16 max-w-lg">
          <Button variant="ghost" className="mb-6 -ml-2" onClick={() => setCheckoutStep('form')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="donor-card p-6 md:p-8">
            <p className="text-sm mb-4" style={{ color: '#666' }}>
              {needLabel} · {home.name} · ₹{amountValue.toLocaleString('en-IN')}
            </p>
            <DonorFoodDonationDetailsForm
              key={`${profileId || 'guest'}-${donorProfile ? 'ready' : 'pending'}-${verifiedPhone}-${isNewDonor}`}
              initialValues={initialDonationDetails}
              onSubmit={saveDonationDetails}
              isSubmitting={savingDetails}
              isExistingDonor={isExistingDonor}
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (checkoutStep === 'preview' && donationDetails) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16 max-w-lg">
          <div className="donor-card p-6 md:p-8">
            {paying || isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Preparing payment…</p>
              </div>
            ) : (
              <DonorNeedDonationPreview
                details={donationDetails}
                homeName={home.name}
                needLabel={needLabel}
                needDateLabel={formattedDate}
                amount={amountValue}
                onBack={() => setCheckoutStep('details')}
                onConfirm={handleConfirmAndPay}
              />
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (checkoutStep === 'payment' && pendingDonationId) {
    return (
      <MainLayout>
        <div className="donor-container py-12 md:py-16 max-w-lg">
          <div className="donor-card p-6 md:p-8">
            <DonorManualPayment
              amount={amountValue}
              summary={`${needLabel} · ${home.name} · ${formattedDate}`}
              isProcessing={manualPayment.isPending}
              onSuccess={handleManualPaymentSuccess}
              onFailure={handleManualPaymentFailure}
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to={sponsorListPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Needs
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              {home.image_url && (
                <div className="h-64 overflow-hidden rounded-t-lg">
                  <img src={home.image_url} alt={home.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold mb-1">{home.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {home.city}
                      {home.state && `, ${home.state}`}
                    </p>
                  </div>
                  <Badge variant={need.status === 'OPEN' ? 'default' : 'secondary'}>{need.status}</Badge>
                </div>
                {home.description && <p className="text-muted-foreground">{home.description}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Beneficiaries</p>
                      <p className="font-medium">
                        {need.quantity} {need.unit}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Category</p>
                  <p className="font-medium">
                    {category?.label}
                    {subcategory && <span className="text-muted-foreground"> • {subcategory.label}</span>}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{need.description}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-3">Funding Progress</p>
                  <NeedProgressDisplay
                    donationMode={donationMode}
                    requiredAmount={requiredAmount}
                    collectedAmount={collectedAmount}
                    requiredProductQty={requiredProductQty}
                    fulfilledProductQty={fulfilledProductQty}
                    productName={productName}
                    productUnit={productUnit}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Sponsor This Need
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAvailable ? (
                  <div className="space-y-6">
                    <ContributionModeSelector
                      donationMode={donationMode}
                      selectedMode={contributionMode}
                      onModeChange={setContributionMode}
                      productName={productName}
                      moneyAvailable={moneyAvailable}
                      productAvailable={productAvailable}
                    />

                    {contributionMode === 'money' && moneyAvailable ? (
                      <form onSubmit={handleSubmitMoney} className="space-y-6">
                        <div className="space-y-3">
                          <Label>Sponsorship Type</Label>
                          <RadioGroup
                            value={sponsorshipType}
                            onValueChange={(v) => setSponsorshipType(v as DonationType)}
                          >
                            <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                              <RadioGroupItem value="ONE_TIME" id="one-time" />
                              <Label htmlFor="one-time" className="flex-1 cursor-pointer">
                                <span className="font-medium">One-time Help</span>
                                <p className="text-xs text-muted-foreground">Sponsor just for this need</p>
                              </Label>
                            </div>
                            {need.help_mode === 'RECURRING' && (
                              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                                <RadioGroupItem value="RECURRING" id="recurring" />
                                <Label htmlFor="recurring" className="flex-1 cursor-pointer">
                                  <span className="font-medium">Recurring Help</span>
                                  <p className="text-xs text-muted-foreground">Sponsor monthly</p>
                                </Label>
                              </div>
                            )}
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount">Contribution Amount (₹)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="100"
                            max={pendingAmount}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Pending: ₹{pendingAmount.toLocaleString()} (Min ₹100)
                          </p>
                        </div>

                        <Separator />

                        <Button type="submit" className="w-full" size="lg">
                          <IndianRupee className="mr-2 h-4 w-4" />
                          Continue
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          Next: verify WhatsApp, fill donation details, then pay
                        </p>
                      </form>
                    ) : contributionMode === 'product' && productAvailable ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-1">Provide {productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {pendingProducts} {productUnit} still needed
                          </p>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleOpenKindDonation}>
                          <Package className="mr-2 h-4 w-4" />
                          Pledge to Provide Items
                        </Button>
                        {!isAuthenticated && (
                          <p className="text-xs text-center text-muted-foreground">
                            You&apos;ll verify your WhatsApp number before confirming
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">
                          {contributionMode === 'money'
                            ? 'Monetary goal has been reached!'
                            : 'All items have been pledged!'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      This need is fully sponsored. Thank you to all our donors!
                    </p>
                    <Button variant="outline" asChild>
                      <Link to={sponsorListPath}>Find Other Needs</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {need && user && (
        <KindDonationDialog
          open={showKindDonationDialog}
          onOpenChange={setShowKindDonationDialog}
          needId={need.id}
          trustId={need.trust_id}
          homeId={need.home_id}
          productName={productName}
          productUnit={productUnit}
          remainingQty={pendingProducts}
          donorId={user.id}
          onSuccess={() => refetch()}
        />
      )}
    </MainLayout>
  );
};

export default SponsorDetail;
