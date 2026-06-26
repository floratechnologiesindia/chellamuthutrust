import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useNeed } from '@/hooks/useNeeds';
import { useCreateDonation } from '@/hooks/useDonations';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { NeedProgressDisplay } from '@/components/needs/NeedProgressDisplay';
import { ContributionModeSelector } from '@/components/donations/ContributionModeSelector';
import { KindDonationDialog } from '@/components/donations/KindDonationDialog';
import { Calendar, MapPin, Users, ArrowLeft, Heart, Loader2, CheckCircle, IndianRupee, Package } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type OccasionType = Database['public']['Enums']['occasion_type'];
type DonationType = Database['public']['Enums']['donation_type'];
type DonationMode = 'MONEY_ONLY' | 'PRODUCT_ONLY' | 'BOTH';

const SponsorDetail = () => {
  const { needId } = useParams<{ needId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Get initial mode from URL params
  const initialMode = searchParams.get('mode') === 'product' ? 'product' : 'money';

  const [contributionMode, setContributionMode] = useState<'money' | 'product'>(initialMode);
  const [sponsorshipType, setSponsorshipType] = useState<DonationType>('ONE_TIME');
  const [occasionType, setOccasionType] = useState<OccasionType>('other');
  const [occasionNote, setOccasionNote] = useState('');
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showKindDonationDialog, setShowKindDonationDialog] = useState(false);

  // Fetch need from Supabase
  const { data: need, isLoading, error, refetch } = useNeed(needId || null);
  const createDonation = useCreateDonation();
  const { initiatePayment, isProcessing } = useRazorpay();

  // Extract relations
  const home = need?.homes;
  const category = need?.categories;
  const subcategory = need?.subcategories;

  // Donation mode fields
  const donationMode: DonationMode = (need as any)?.donation_mode || 'MONEY_ONLY';
  const requiredAmount = (need as any)?.required_amount || 0;
  const collectedAmount = (need as any)?.collected_amount || 0;
  const requiredProductQty = (need as any)?.required_product_qty || 0;
  const fulfilledProductQty = (need as any)?.fulfilled_product_qty || 0;
  const productName = (need as any)?.product_name || 'Items';
  const productUnit = (need as any)?.product_unit || 'pieces';

  const pendingAmount = Math.max(0, requiredAmount - collectedAmount);
  const pendingProducts = Math.max(0, requiredProductQty - fulfilledProductQty);

  // Set initial contribution mode based on donation mode
  useEffect(() => {
    if (donationMode === 'PRODUCT_ONLY') {
      setContributionMode('product');
    } else if (donationMode === 'MONEY_ONLY') {
      setContributionMode('money');
    }
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
          <p className="text-muted-foreground mb-6">The sponsorship opportunity you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link to="/sponsor">Browse All Needs</Link>
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

  const handleSubmitMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user?.id) {
      toast({
        title: 'Please login first',
        description: 'You need to be logged in to sponsor a need.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    try {
      const donation = await createDonation.mutateAsync({
        need_id: need.id,
        trust_id: need.trust_id,
        home_id: need.home_id,
        sponsorship_type: sponsorshipType,
        amount_pledged: parseFloat(amount) || 0,
        payment_mode: 'online',
        start_date: need.date,
        occasion_type: occasionType,
        occasion_note: occasionNote || null,
      });

      // Trigger Razorpay payment
      initiatePayment({
        amount: parseFloat(amount) || 0,
        donationId: donation.id,
        donorName: user?.name || user?.email || 'Donor',
        donorEmail: user?.email || '',
        description: `Sponsorship for ${home.name} - ${category?.label || 'Need'}`,
        onSuccess: () => {
          setIsSuccess(true);
          toast({
            title: 'Payment Successful! 🎉',
            description: 'Thank you for your generous contribution.',
          });
        },
        onFailure: (error) => {
          if (error !== 'Payment cancelled by user') {
            toast({
              title: 'Payment Issue',
              description: `Sponsorship created but payment pending: ${error}. You can pay later from My Donations.`,
              variant: 'destructive',
            });
          }
          // Still show success since donation was created
          setIsSuccess(true);
        },
      });
    } catch (error) {
      toast({
        title: 'Sponsorship Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handleOpenKindDonation = () => {
    if (!isAuthenticated || !user?.id) {
      toast({
        title: 'Please login first',
        description: 'You need to be logged in to provide items.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    setShowKindDonationDialog(true);
  };

  if (isSuccess) {
    return (
      <MainLayout>
        <div className="container py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">Thank You!</h1>
            <p className="text-muted-foreground mb-8">
              Your sponsorship for {home.name} on {formattedDate} has been confirmed. 
              You&apos;ll receive a confirmation email shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/my-donations">View My Donations</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/sponsor">Sponsor Another Need</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/sponsor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Needs
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Need Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Home Info */}
            <Card>
              {home.image_url && (
                <div className="h-64 overflow-hidden rounded-t-lg">
                  <img 
                    src={home.image_url} 
                    alt={home.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold mb-1">{home.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {home.city}{home.state && `, ${home.state}`}
                    </p>
                  </div>
                  <Badge variant={need.status === 'OPEN' ? 'default' : 'secondary'}>
                    {need.status}
                  </Badge>
                </div>
                {home.description && <p className="text-muted-foreground">{home.description}</p>}
              </CardContent>
            </Card>

            {/* Need Info */}
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
                      <p className="font-medium">{need.quantity} {need.unit}</p>
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

                {/* Progress Display */}
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

          {/* Sponsorship Form */}
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
                    {/* Contribution Mode Selector */}
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
                        {/* Sponsorship Type */}
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
                                <p className="text-xs text-muted-foreground">Sponsor just for this date</p>
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

                        {/* Amount */}
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

                        {/* Occasion */}
                        <div className="space-y-2">
                          <Label>Occasion (Optional)</Label>
                          <Select value={occasionType} onValueChange={(v) => setOccasionType(v as OccasionType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="birthday">Birthday</SelectItem>
                              <SelectItem value="ancestor_remembrance">In Memory of Loved One</SelectItem>
                              <SelectItem value="festival">Festival/Celebration</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Occasion Note */}
                        <div className="space-y-2">
                          <Label htmlFor="note">Personal Note (Optional)</Label>
                          <Textarea
                            id="note"
                            placeholder="e.g., In celebration of my daughter's birthday"
                            value={occasionNote}
                            onChange={(e) => setOccasionNote(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <Separator />

                        <Button 
                          type="submit" 
                          className="w-full" 
                          size="lg" 
                          disabled={createDonation.isPending}
                        >
                          {createDonation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <IndianRupee className="mr-2 h-4 w-4" />
                              Confirm Sponsorship
                            </>
                          )}
                        </Button>

                        {!isAuthenticated && (
                          <p className="text-xs text-center text-muted-foreground">
                            You&apos;ll be asked to login before confirming
                          </p>
                        )}
                      </form>
                    ) : contributionMode === 'product' && productAvailable ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-1">Provide {productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {pendingProducts} {productUnit} still needed
                          </p>
                        </div>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleOpenKindDonation}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Pledge to Provide Items
                        </Button>
                        {!isAuthenticated && (
                          <p className="text-xs text-center text-muted-foreground">
                            You&apos;ll be asked to login before confirming
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
                      <Link to="/sponsor">Find Other Needs</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Kind Donation Dialog */}
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
