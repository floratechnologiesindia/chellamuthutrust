import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import SuperAdminNav from '@/components/layout/SuperAdminNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  CreditCard,
  Calendar,
  Edit,
  IndianRupee,
  Heart,
  Utensils,
  Landmark,
  Gift,
  Rocket,
  List,
  MessageSquare
} from 'lucide-react';
import SendMessageDialog from '@/components/donors/SendMessageDialog';
import { useDonors, DonorWithStats } from '@/hooks/useDonors';
import { useDonations } from '@/hooks/useDonations';
import { useDonorFoodSlots } from '@/hooks/useFoodSlots';
import { useDonorCorpusFund } from '@/hooks/useDonorCorpusFund';
import { useDonorKindDonations } from '@/hooks/useDonorKindDonations';
import { useDonorCategoryStats } from '@/hooks/useDonorCategoryStats';
import { format } from 'date-fns';

const categoryColors: Record<string, string> = {
  monthly: 'bg-green-100 text-green-700 border-green-200',
  yearly: 'bg-purple-100 text-purple-700 border-purple-200',
  public: 'bg-orange-100 text-orange-700 border-orange-200',
  csr: 'bg-red-100 text-red-700 border-red-200',
};

const DonorPreview = () => {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const { donorId } = useParams<{ donorId: string }>();
  const navigate = useNavigate();
  const { data: donors, isLoading: donorsLoading } = useDonors();
  const { data: donations, isLoading: donationsLoading } = useDonations();
  const { data: foodSlots, isLoading: foodSlotsLoading } = useDonorFoodSlots(donorId || null);
  const { data: corpusFund, isLoading: corpusFundLoading } = useDonorCorpusFund(donorId || null);
  const { data: kindDonations, isLoading: kindDonationsLoading } = useDonorKindDonations(donorId || null);
  const { data: categoryStats } = useDonorCategoryStats(donorId || null);

  const donor = donors?.find((d: DonorWithStats) => d.id === donorId);
  const donorDonations = donations?.filter(d => d.donor_id === donorId) || [];

  const timeSlotLabels: Record<string, string> = {
    'MORNING': 'Breakfast',
    'AFTERNOON': 'Lunch',
    'EVENING': 'Dinner',
    'REFRESHMENTS': 'Refreshments'
  };

  const paymentStatusColors: Record<string, string> = {
    'PAID': 'bg-green-100 text-green-700 border-green-200',
    'YET_TO_PAY': 'bg-amber-100 text-amber-700 border-amber-200',
    'PREPAID': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate totals including all contribution types
  const corpusFundTotal = corpusFund?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  const kindDonationsTotal = kindDonations?.reduce((sum, k) => sum + Number(k.estimated_value || 0), 0) || 0;

  if (donorsLoading) {
    return (
      <MainLayout>
        <SuperAdminNav />
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-1" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!donor) {
    return (
      <MainLayout>
        <SuperAdminNav />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Donor not found</h2>
          <Button onClick={() => navigate('/super-admin/donors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Donors
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalContributed = (donor.total_donations_amount || 0) + 
                          (donor.total_food_slots_amount || 0) + 
                          corpusFundTotal + 
                          kindDonationsTotal;

  return (
    <MainLayout>
      <SuperAdminNav />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/donors')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{donor.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {donor.donor_category && (
                  <Badge className={categoryColors[donor.donor_category] || 'bg-secondary'}>
                    {donor.donor_category.charAt(0).toUpperCase() + donor.donor_category.slice(1)}
                  </Badge>
                )}
                <Badge variant={donor.status === 'active' ? 'default' : 'secondary'}>
                  {donor.status === 'active' ? '● Active' : '● Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMessageDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button variant="outline" onClick={() => navigate(`/super-admin/booking?donorId=${donor.id}`)}>
              <Calendar className="h-4 w-4 mr-2" />
              Book Event
            </Button>
            <Button onClick={() => navigate(`/super-admin/donors/${donor.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Donor
            </Button>
          </div>

          <SendMessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            donorName={donor.name}
            donorPhone={donor.phone}
            donorEmail={donor.email}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{donor.email}</p>
                </div>
              </div>
              
              {donor.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{donor.phone}</p>
                  </div>
                </div>
              )}
              
              {donor.organization && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{donor.organization}</p>
                  </div>
                </div>
              )}
              
              {(donor.address || donor.city || donor.state) && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[donor.address, donor.city, donor.state, donor.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              
              {donor.pan_number && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PAN Number</p>
                    <p className="font-medium">{donor.pan_number}</p>
                  </div>
                </div>
              )}

              {donor.requires_80g && (
                <Badge variant="outline" className="mt-2">Requires 80G Certificate</Badge>
              )}
            </CardContent>
          </Card>

          {/* Donation Stats & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {/* Total Amount */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-amber-100 mb-1">
                      <IndianRupee className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold">{formatCurrency(categoryStats?.totalAmount || totalContributed)}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Total Donations Count */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-green-100 mb-1">
                      <Heart className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">All Donations</p>
                    <p className="text-sm font-bold">{categoryStats?.totalDonationsCount || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Food Slots */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-orange-100 mb-1">
                      <Utensils className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Food</p>
                    <p className="text-sm font-bold">{categoryStats?.food_slots.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Trust Welfare */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-pink-100 mb-1">
                      <Heart className="h-4 w-4 text-pink-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Welfare</p>
                    <p className="text-sm font-bold">{categoryStats?.trust_welfare.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Impact Programs */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-blue-100 mb-1">
                      <Rocket className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Impact</p>
                    <p className="text-sm font-bold">{categoryStats?.impact_programs.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Need List */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-teal-100 mb-1">
                      <List className="h-4 w-4 text-teal-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Needs</p>
                    <p className="text-sm font-bold">{categoryStats?.need_list.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Corpus Fund */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-purple-100 mb-1">
                      <Landmark className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Corpus</p>
                    <p className="text-sm font-bold">{categoryStats?.corpus_fund.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Kind Donations */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-emerald-100 mb-1">
                      <Gift className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Kind</p>
                    <p className="text-sm font-bold">{categoryStats?.kind_donation.count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Last Interaction */}
              <Card>
                <CardContent className="pt-4 pb-4 px-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-2 rounded-full bg-slate-100 mb-1">
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="text-xs text-muted-foreground">Last</p>
                    <p className="text-sm font-bold">
                      {categoryStats?.lastInteraction 
                        ? format(new Date(categoryStats.lastInteraction), 'dd MMM')
                        : donor.last_interaction 
                          ? format(new Date(donor.last_interaction), 'dd MMM')
                          : '-'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Unified Contribution History with Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Contribution History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="donations" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="donations" className="gap-1 text-xs sm:text-sm">
                      <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Donations</span> ({donorDonations.length})
                    </TabsTrigger>
                    <TabsTrigger value="food" className="gap-1 text-xs sm:text-sm">
                      <Utensils className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Food</span> ({foodSlots?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="corpus" className="gap-1 text-xs sm:text-sm">
                      <Landmark className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Corpus</span> ({corpusFund?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="kind" className="gap-1 text-xs sm:text-sm">
                      <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Kind</span> ({kindDonations?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Donations Tab */}
                  <TabsContent value="donations" className="mt-4">
                    {donationsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : donorDonations.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No donations yet</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Upcoming Donations Section */}
                        {(() => {
                          const now = new Date();
                          const upcoming = donorDonations.filter(d => {
                            if (d.status === 'CANCELLED' || d.status === 'COMPLETED') return false;
                            if (d.next_due_date && new Date(d.next_due_date) >= now) return true;
                            if (d.status === 'ACTIVE' || d.status === 'PLEDGED') return true;
                            return false;
                          });
                          if (upcoming.length === 0) return null;
                          return (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Upcoming ({upcoming.length})
                              </h4>
                              {upcoming.map((donation) => (
                                <div 
                                  key={`upcoming-${donation.id}`} 
                                  className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/20 bg-primary/5"
                                >
                                  <div>
                                    <p className="font-medium">{donation.homes?.name || 'Unknown Home'}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {donation.next_due_date 
                                        ? `Due: ${format(new Date(donation.next_due_date), 'dd MMM yyyy')}`
                                        : format(new Date(donation.start_date), 'dd MMM yyyy')
                                      } • {donation.sponsorship_type}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">{formatCurrency(donation.amount_pledged)}</p>
                                    <Badge variant={donation.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                      {donation.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* All Donations */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">All Donations</h4>
                          {donorDonations.slice(0, 10).map((donation) => (
                            <div 
                              key={donation.id} 
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div>
                                <p className="font-medium">{donation.homes?.name || 'Unknown Home'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(donation.start_date), 'dd MMM yyyy')} • {donation.sponsorship_type}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(donation.amount_pledged)}</p>
                                <Badge variant={donation.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                  {donation.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {donorDonations.length > 10 && (
                            <p className="text-center text-sm text-muted-foreground pt-2">
                              And {donorDonations.length - 10} more donations...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Food Tab */}
                  <TabsContent value="food" className="mt-4">
                    {foodSlotsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : !foodSlots || foodSlots.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No food distribution bookings yet</p>
                    ) : (
                      <div className="space-y-3">
                        {foodSlots.slice(0, 10).map((slot) => (
                          <div 
                            key={slot.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{slot.homes?.name || 'Unknown Home'}</p>
                                <Badge variant="outline" className="text-xs">
                                  {timeSlotLabels[slot.time_slot] || slot.time_slot}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(slot.date), 'dd MMM yyyy')}
                                {slot.sponsor_for && ` • ${slot.sponsor_for}`}
                              </p>
                              {slot.reason && (
                                <p className="text-xs text-muted-foreground">Reason: {slot.reason}</p>
                              )}
                              {slot.donate_on_behalf_of && (
                                <p className="text-xs text-muted-foreground">On behalf of: {slot.donate_on_behalf_of}</p>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="font-semibold">{formatCurrency(slot.amount || 0)}</p>
                              <Badge className={`text-xs ${paymentStatusColors[slot.payment_status || 'YET_TO_PAY'] || 'bg-secondary'}`}>
                                {slot.payment_status === 'YET_TO_PAY' ? 'Yet to Pay' : slot.payment_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {foodSlots.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground pt-2">
                            And {foodSlots.length - 10} more bookings...
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Corpus Fund Tab */}
                  <TabsContent value="corpus" className="mt-4">
                    {corpusFundLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : !corpusFund || corpusFund.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No corpus fund contributions yet</p>
                    ) : (
                      <div className="space-y-3">
                        {corpusFund.slice(0, 10).map((contribution) => (
                          <div 
                            key={contribution.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">{contribution.trusts?.name || 'Unknown Trust'}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(contribution.contribution_date), 'dd MMM yyyy')}
                                {contribution.purpose && ` • ${contribution.purpose}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(Number(contribution.amount))}</p>
                              {contribution.contribution_mode && (
                                <Badge variant="outline" className="text-xs">
                                  {contribution.contribution_mode}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {corpusFund.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground pt-2">
                            And {corpusFund.length - 10} more contributions...
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Kind Donations Tab */}
                  <TabsContent value="kind" className="mt-4">
                    {kindDonationsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : !kindDonations || kindDonations.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No kind donations yet</p>
                    ) : (
                      <div className="space-y-3">
                        {kindDonations.slice(0, 10).map((donation) => (
                          <div 
                            key={donation.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">{donation.item_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {donation.homes?.name || 'Unknown Home'} • {format(new Date(donation.received_date), 'dd MMM yyyy')}
                              </p>
                              {donation.item_description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {donation.item_description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">Qty: {donation.quantity || 1}</p>
                              {donation.estimated_value && (
                                <p className="text-sm text-muted-foreground">
                                  Est. {formatCurrency(Number(donation.estimated_value))}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {kindDonations.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground pt-2">
                            And {kindDonations.length - 10} more donations...
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Notes */}
            {donor.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{donor.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DonorPreview;
