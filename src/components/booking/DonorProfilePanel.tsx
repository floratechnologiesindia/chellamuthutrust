import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Phone, Mail, Building2, MapPin, CreditCard, 
  ArrowLeft, CalendarPlus, IndianRupee, Calendar, Utensils,
  Landmark, Gift
} from 'lucide-react';
import { type DonorWithStats } from '@/hooks/useDonors';
import { useDonations } from '@/hooks/useDonations';
import { useDonorFoodSlots } from '@/hooks/useFoodSlots';
import { useDonorCorpusFund } from '@/hooks/useDonorCorpusFund';
import { useDonorKindDonations } from '@/hooks/useDonorKindDonations';
import { format } from 'date-fns';

interface DonorProfilePanelProps {
  donor: DonorWithStats;
  onProceed: () => void;
  onBack: () => void;
}

const categoryColors: Record<string, string> = {
  monthly: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  yearly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  public: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  csr: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const timeSlotLabels: Record<string, string> = {
  'MORNING': 'Breakfast',
  'AFTERNOON': 'Lunch',
  'EVENING': 'Dinner',
  'REFRESHMENTS': 'Refreshments'
};

export const DonorProfilePanel = ({ donor, onProceed, onBack }: DonorProfilePanelProps) => {
  const { data: donations = [] } = useDonations(donor.id);
  const { data: foodSlots = [] } = useDonorFoodSlots(donor.id);
  const { data: corpusFund = [] } = useDonorCorpusFund(donor.id);
  const { data: kindDonations = [] } = useDonorKindDonations(donor.id);

  // Calculate totals including all contribution types
  const corpusFundTotal = corpusFund.reduce((sum, c) => sum + Number(c.amount), 0);
  const kindDonationsTotal = kindDonations.reduce((sum, k) => sum + Number(k.estimated_value || 0), 0);
  const totalAmount = (donor.total_donations_amount || 0) + 
                     (donor.total_food_slots_amount || 0) + 
                     corpusFundTotal + 
                     kindDonationsTotal;

  const totalContributions = donations.length + foodSlots.length + corpusFund.length + kindDonations.length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donor Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Donor Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{donor.name}</h2>
                {donor.donor_category && (
                  <Badge className={`mt-1 ${categoryColors[donor.donor_category] || ''}`}>
                    {donor.donor_category.toUpperCase()} Donor
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{donor.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{donor.email}</span>
              </div>
              {donor.organization && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{donor.organization}</span>
                </div>
              )}
              {(donor.address || donor.city || donor.state) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {[donor.address, donor.city, donor.state, donor.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {donor.pan_number && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>PAN: {donor.pan_number}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {totalContributions}
                </div>
                <div className="text-sm text-muted-foreground">Total Contributions</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  ₹{totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contribution History Card with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contribution History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="donations" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="donations" className="text-xs px-1">
                  Donations ({donations.length})
                </TabsTrigger>
                <TabsTrigger value="food" className="text-xs px-1">
                  Food ({foodSlots.length})
                </TabsTrigger>
                <TabsTrigger value="corpus" className="text-xs px-1">
                  Corpus ({corpusFund.length})
                </TabsTrigger>
                <TabsTrigger value="kind" className="text-xs px-1">
                  Kind ({kindDonations.length})
                </TabsTrigger>
              </TabsList>

              {/* Donations Tab */}
              <TabsContent value="donations" className="mt-4">
                {donations.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No donations yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {donations.slice(0, 10).map((donation) => (
                      <div 
                        key={donation.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <IndianRupee className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {donation.homes?.name || 'Unknown Project'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(donation.start_date), 'dd MMM yyyy')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ₹{donation.amount_pledged.toLocaleString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {donation.sponsorship_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Food Slots Tab */}
              <TabsContent value="food" className="mt-4">
                {foodSlots.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No food sponsorships yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {foodSlots.slice(0, 10).map((slot) => (
                      <div 
                        key={slot.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {slot.homes?.name || 'Unknown Project'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(slot.date), 'dd MMM yyyy')} • {timeSlotLabels[slot.time_slot] || slot.time_slot}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ₹{(slot.amount || 0).toLocaleString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {slot.payment_status === 'YET_TO_PAY' ? 'Pending' : slot.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Corpus Fund Tab */}
              <TabsContent value="corpus" className="mt-4">
                {corpusFund.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No corpus fund contributions yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {corpusFund.slice(0, 10).map((contribution) => (
                      <div 
                        key={contribution.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <Landmark className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {contribution.trusts?.name || 'Unknown Trust'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(contribution.contribution_date), 'dd MMM yyyy')}
                              {contribution.purpose && ` • ${contribution.purpose}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ₹{Number(contribution.amount).toLocaleString()}
                          </div>
                          {contribution.contribution_mode && (
                            <Badge variant="outline" className="text-xs">
                              {contribution.contribution_mode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Kind Donations Tab */}
              <TabsContent value="kind" className="mt-4">
                {kindDonations.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No kind donations yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {kindDonations.slice(0, 10).map((donation) => (
                      <div 
                        key={donation.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                            <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {donation.item_type}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {donation.homes?.name || 'Unknown Project'} • {format(new Date(donation.received_date), 'dd MMM yyyy')}
                            </div>
                            {donation.item_description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {donation.item_description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            Qty: {donation.quantity || 1}
                          </div>
                          {donation.estimated_value && (
                            <div className="text-sm text-muted-foreground">
                              ₹{Number(donation.estimated_value).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create Event Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={onProceed} className="gap-2">
          <CalendarPlus className="h-5 w-5" />
          Create Event for {donor.name}
        </Button>
      </div>
    </div>
  );
};

export default DonorProfilePanel;
