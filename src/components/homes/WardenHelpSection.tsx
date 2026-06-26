import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SendReportDialog } from './SendReportDialog';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';
import { CompletionReportDialog, type CompletionReportData } from './CompletionReportDialog';
import { useNeeds, useUpdateNeed, type NeedWithRelations } from '@/hooks/useNeeds';
import { useFutureBookedFoodSlots, useCompletedFoodSlots, useCompleteFoodSlot, type FoodSlotWithDonor } from '@/hooks/useFoodSlots';
import { usePendingKindDonations, useCompleteKindDonation, type KindDonationWithRelations } from '@/hooks/useKindDonations';
import { useDonationsForHome, type DonationWithRelations } from '@/hooks/useDonations';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Package, 
  IndianRupee,
  Clock,
  User,
  ArrowRight,
  Loader2,
  Utensils,
  Gift,
  Wallet,
  ChevronDown,
  Phone,
  Mail,
  Truck,
  MapPin,
  Receipt
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import type { InvoiceData } from './InvoicePreview';

interface WardenHelpSectionProps {
  homeId: string;
  trustId: string;
}

const formatDeliveryMode = (mode: string | null) => {
  switch (mode) {
    case 'SELF_DELIVERY': return 'Self Delivery';
    case 'COURIER': return 'Courier';
    case 'TRUST_PICKUP': return 'Trust Pickup';
    default: return 'Not specified';
  }
};

export function WardenHelpSection({ homeId, trustId }: WardenHelpSectionProps) {
  const { user } = useAuth();
  const [selectedNeed, setSelectedNeed] = useState<NeedWithRelations | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Omit<InvoiceData, 'receiptNumber'> | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Completion report dialog state
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionReportData | null>(null);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<Omit<InvoiceData, 'receiptNumber'> | null>(null);
  
  // Fetch all data sources
  const { data: allNeeds, isLoading: needsLoading } = useNeeds({ homeId });
  const { data: bookedFoodSlots, isLoading: slotsLoading } = useFutureBookedFoodSlots(homeId);
  const { data: completedFoodSlots, isLoading: completedSlotsLoading } = useCompletedFoodSlots(homeId);
  const { data: pendingKindDonations, isLoading: kindLoading } = usePendingKindDonations(homeId);
  const { data: activeDonations, isLoading: donationsLoading } = useDonationsForHome(homeId);
  
  const updateNeed = useUpdateNeed();
  const completeFoodSlot = useCompleteFoodSlot();
  const completeKindDonation = useCompleteKindDonation();

  
  // Categorize needs
  const upcomingNeeds = allNeeds?.filter(n => 
    n.status === 'FULLY_SPONSORED' || 
    (n.status === 'PARTIAL' && (n.current_sponsors_count || 0) > 0)
  ) || [];
  const receivedNeeds = allNeeds?.filter(n => n.status === 'COMPLETED') || [];
  const receivedKindDonations = pendingKindDonations?.filter(d => d.status === 'RECEIVED') || [];
  const pendingReportNeeds = receivedNeeds.filter(n => !n.fulfillment_details);
  const totalReceivedCount = receivedNeeds.length + (completedFoodSlots?.length || 0) + receivedKindDonations.length;
  
  // Build unified upcoming list for count
  const upcomingCount = 
    upcomingNeeds.length + 
    (bookedFoodSlots?.length || 0) + 
    (pendingKindDonations?.length || 0) + 
    (activeDonations?.length || 0);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleMarkReceived = async (need: NeedWithRelations) => {
    try {
      await updateNeed.mutateAsync({
        id: need.id,
        status: 'COMPLETED',
      });
      toast.success('Marked as received');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };
  
  const handleSendReport = (need: NeedWithRelations) => {
    setSelectedNeed(need);
    setReportDialogOpen(true);
  };

  const handleGenerateInvoice = (data: Omit<InvoiceData, 'receiptNumber'>) => {
    setInvoiceData(data);
    setInvoiceDialogOpen(true);
  };

  // Helper to prepare invoice data from a completed need
  const prepareNeedInvoice = (need: NeedWithRelations) => {
    const amount = need.donation_mode === 'MONEY_ONLY' 
      ? (need.collected_amount || 0) 
      : (need.fulfilled_product_qty || 0) * 100; // Estimate if product-based
    
    handleGenerateInvoice({
      date: need.date,
      donorName: 'Multiple Donors', // Needs may have multiple sponsors
      description: need.description || need.product_name || 'Requirement Sponsorship',
      amount,
      homeName: need.homes?.name,
      donationType: 'need',
    });
  };

  // Helper to prepare invoice data from a food slot
  const prepareFoodSlotInvoice = (slot: FoodSlotWithDonor) => {
    handleGenerateInvoice({
      date: slot.date,
      donorName: slot.donate_on_behalf_of || slot.profiles?.name || 'Anonymous Donor',
      donorEmail: slot.profiles?.email || undefined,
      donorPhone: slot.profiles?.phone || undefined,
      description: `${slot.time_slot.replace('_', ' ')} Meal Sponsorship${slot.reason ? ` - ${slot.reason}` : ''}`,
      amount: slot.amount || 0,
      donationType: 'food_slot',
    });
  };

  // Helper to prepare invoice data from a kind donation
  const prepareKindDonationInvoice = (donation: KindDonationWithRelations) => {
    handleGenerateInvoice({
      date: donation.received_date,
      donorName: donation.profiles?.name || donation.donor_name || 'Anonymous Donor',
      donorEmail: donation.profiles?.email || undefined,
      donorPhone: donation.profiles?.phone || undefined,
      description: `${donation.quantity} ${donation.item_type}${donation.item_description ? ` - ${donation.item_description}` : ''}`,
      amount: donation.estimated_value || 0,
      donationType: 'kind_donation',
    });
  };

  // Helper to prepare invoice data from a monetary donation
  const prepareDonationInvoice = (donation: DonationWithRelations) => {
    handleGenerateInvoice({
      date: donation.start_date,
      donorName: donation.profiles?.name || 'Anonymous Donor',
      donorEmail: donation.profiles?.email || undefined,
      donorPhone: donation.profiles?.phone || undefined,
      description: donation.needs?.description || donation.occasion_type?.replace('_', ' ') || 'Monetary Donation',
      amount: donation.amount_pledged,
      homeName: donation.homes?.name,
      donationType: 'donation',
    });
  };

  // Handler to open completion dialog for food slot
  const handleFoodSlotCompletion = (slot: FoodSlotWithDonor) => {
    setCompletionData({
      id: slot.id,
      title: `${slot.time_slot.replace('_', ' ')} Meal`,
      date: slot.date,
      amount: slot.amount || undefined,
      donorName: slot.donate_on_behalf_of || slot.profiles?.name || 'Anonymous Donor',
      type: 'food_slot',
    });
    setPendingInvoiceData({
      date: slot.date,
      donorName: slot.donate_on_behalf_of || slot.profiles?.name || 'Anonymous Donor',
      donorEmail: slot.profiles?.email || undefined,
      donorPhone: slot.profiles?.phone || undefined,
      description: `${slot.time_slot.replace('_', ' ')} Meal Sponsorship${slot.reason ? ` - ${slot.reason}` : ''}`,
      amount: slot.amount || 0,
      donationType: 'food_slot',
    });
    setCompletionDialogOpen(true);
  };

  // Handler to open completion dialog for kind donation
  const handleKindDonationCompletion = (donation: KindDonationWithRelations) => {
    setCompletionData({
      id: donation.id,
      title: `${donation.quantity} ${donation.item_type}`,
      date: donation.received_date,
      amount: donation.estimated_value || undefined,
      donorName: donation.profiles?.name || donation.donor_name || 'Anonymous Donor',
      type: 'kind_donation',
    });
    setPendingInvoiceData({
      date: donation.received_date,
      donorName: donation.profiles?.name || donation.donor_name || 'Anonymous Donor',
      donorEmail: donation.profiles?.email || undefined,
      donorPhone: donation.profiles?.phone || undefined,
      description: `${donation.quantity} ${donation.item_type}${donation.item_description ? ` - ${donation.item_description}` : ''}`,
      amount: donation.estimated_value || 0,
      donationType: 'kind_donation',
    });
    setCompletionDialogOpen(true);
  };

  // Handle completion report submission
  const handleCompletionSubmit = async (reportData: { notes: string; photoUrls: string[] }) => {
    if (!completionData) return;

    if (completionData.type === 'food_slot') {
      await completeFoodSlot.mutateAsync({
        slotId: completionData.id,
        notes: reportData.notes,
        photoUrls: reportData.photoUrls,
      });
    } else if (completionData.type === 'kind_donation') {
      await completeKindDonation.mutateAsync({
        donationId: completionData.id,
        notes: reportData.notes,
        photoUrls: reportData.photoUrls,
      });
    }
  };

  // Handle generate invoice from completion dialog
  const handleCompletionInvoice = () => {
    if (pendingInvoiceData) {
      setInvoiceData(pendingInvoiceData);
      setInvoiceDialogOpen(true);
    }
    setCompletionDialogOpen(false);
  };
  
  const isLoading = needsLoading || slotsLoading || completedSlotsLoading || kindLoading || donationsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Help Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
              <Package className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{upcomingNeeds.length}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Requirements</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
              <Utensils className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
              <p className="text-lg font-bold text-orange-800 dark:text-orange-200">{bookedFoodSlots?.length || 0}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Food Slots</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
              <Gift className="h-5 w-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
              <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{pendingKindDonations?.length || 0}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Kind Donations</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <Wallet className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
              <p className="text-lg font-bold text-green-800 dark:text-green-200">{activeDonations?.length || 0}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Active Donations</p>
            </div>
          </div>

          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Upcoming</span>
                <Badge variant="secondary" className="ml-1">
                  {upcomingCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="received" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Received</span>
                <Badge variant="secondary" className="ml-1">
                  {totalReceivedCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
                {pendingReportNeeds.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingReportNeeds.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Help Tab */}
            <TabsContent value="upcoming" className="mt-4 space-y-6">
              {upcomingCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No upcoming help scheduled</p>
                </div>
              ) : (
                <>
                  {/* Sponsored Needs Section */}
                  {upcomingNeeds.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Requirements ({upcomingNeeds.length})
                      </h4>
                      {upcomingNeeds.map(need => {
                        const isExpanded = expandedItems.has(`need-${need.id}`);
                        const progressPercent = need.required_amount && need.required_amount > 0 
                          ? Math.min(100, ((need.collected_amount || 0) / need.required_amount) * 100)
                          : need.required_product_qty && need.required_product_qty > 0
                            ? Math.min(100, ((need.fulfilled_product_qty || 0) / need.required_product_qty) * 100)
                            : 0;
                        
                        return (
                          <Collapsible 
                            key={need.id} 
                            open={isExpanded} 
                            onOpenChange={() => toggleExpanded(`need-${need.id}`)}
                          >
                            <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline">
                                      {need.categories?.label || 'General'}
                                    </Badge>
                                    <Badge variant={need.status === 'FULLY_SPONSORED' ? 'default' : 'secondary'}>
                                      {need.status === 'FULLY_SPONSORED' ? 'Fully Sponsored' : 'Partial'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(need.date)}
                                    </span>
                                  </div>
                                  <p className="font-medium">{need.description || need.product_name || 'Need'}</p>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {need.donation_mode === 'MONEY_ONLY' && need.collected_amount ? (
                                      <span className="flex items-center gap-1">
                                        <IndianRupee className="h-3 w-3" />
                                        {formatCurrency(need.collected_amount)}
                                      </span>
                                    ) : need.fulfilled_product_qty ? (
                                      <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {need.fulfilled_product_qty} {need.product_unit}
                                      </span>
                                    ) : null}
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {need.current_sponsors_count} sponsor(s)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {need.status === 'FULLY_SPONSORED' && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleMarkReceived(need)}
                                      disabled={updateNeed.isPending}
                                    >
                                      {updateNeed.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-1" />
                                          Mark Received
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>
                              
                              <CollapsibleContent className="mt-3 pt-3 border-t">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {need.subcategories?.label && (
                                    <div>
                                      <p className="text-muted-foreground">Subcategory</p>
                                      <p className="font-medium">{need.subcategories.label}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-muted-foreground">Help Mode</p>
                                    <p className="font-medium">{need.help_mode === 'RECURRING' ? 'Recurring' : 'One-time'}</p>
                                  </div>
                                  {need.status === 'PARTIAL' && progressPercent > 0 && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground mb-1">Progress</p>
                                      <Progress value={progressPercent} className="h-2" />
                                      <p className="text-xs mt-1">
                                        {need.donation_mode === 'MONEY_ONLY' 
                                          ? `${formatCurrency(need.collected_amount || 0)} of ${formatCurrency(need.required_amount || 0)} collected`
                                          : `${need.fulfilled_product_qty || 0} of ${need.required_product_qty || 0} ${need.product_unit} fulfilled`
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Booked Food Slots Section */}
                  {bookedFoodSlots && bookedFoodSlots.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Food Slots ({bookedFoodSlots.length})
                      </h4>
                      {bookedFoodSlots.map((slot: FoodSlotWithDonor) => {
                        const isTodaySlot = isToday(new Date(slot.date));
                        
                        return (
                          <div 
                            key={slot.id} 
                            className={`p-4 border rounded-lg transition-colors ${isTodaySlot ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700' : 'bg-card'}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">Food</Badge>
                                  {isTodaySlot && (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Today</Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(slot.date), 'dd MMM yyyy')}
                                  </span>
                                </div>
                                <p className="font-medium capitalize">
                                  {slot.time_slot.replace('_', ' ').toLowerCase()} Meal
                                  {slot.amount ? ` • ${formatCurrency(slot.amount)}` : ''}
                                </p>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">
                                    Sponsored by: {slot.donate_on_behalf_of || slot.profiles?.name || 'Anonymous Donor'}
                                  </span>
                                </div>
                                {slot.reason && (
                                  <p className="text-sm text-muted-foreground">
                                    Reason: <span className="font-medium text-foreground">{slot.reason}</span>
                                  </p>
                                )}
                                {slot.note && (
                                  <p className="text-sm italic text-muted-foreground">
                                    Note: "{slot.note}"
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => handleFoodSlotCompletion(slot)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Mark Completed
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pending Kind Donations Section */}
                  {pendingKindDonations && pendingKindDonations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Kind Donations ({pendingKindDonations.length})
                      </h4>
                      {pendingKindDonations.map(donation => {
                        const isExpanded = expandedItems.has(`kind-${donation.id}`);
                        
                        return (
                          <Collapsible 
                            key={donation.id} 
                            open={isExpanded} 
                            onOpenChange={() => toggleExpanded(`kind-${donation.id}`)}
                          >
                            <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">Kind Donation</Badge>
                                    <Badge variant={donation.status === 'DELIVERED' ? 'default' : 'secondary'}>
                                      {donation.status === 'DELIVERED' ? 'Delivered' : 'Pledged'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      Expected: {formatDate(donation.received_date)}
                                    </span>
                                  </div>
                                  <p className="font-medium">
                                    {donation.quantity} {donation.item_type}
                                  </p>
                                  {donation.item_description && (
                                    <p className="text-sm text-muted-foreground">{donation.item_description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {donation.estimated_value && (
                                      <span className="flex items-center gap-1">
                                        <IndianRupee className="h-3 w-3" />
                                        {formatCurrency(donation.estimated_value)}
                                      </span>
                                    )}
                                    {donation.profiles?.name && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        By: {donation.profiles.name}
                                      </span>
                                    )}
                                    {donation.donor_name && !donation.profiles?.name && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        By: {donation.donor_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Mark Received button for kind donations */}
                                  <Button 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleKindDonationCompletion(donation);
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Mark Received
                                  </Button>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>
                              <CollapsibleContent className="mt-3 pt-3 border-t">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-3 w-3 text-muted-foreground" />
                                    <div>
                                      <p className="text-muted-foreground">Delivery Mode</p>
                                      <p className="font-medium">{formatDeliveryMode(donation.delivery_mode)}</p>
                                    </div>
                                  </div>
                                  {donation.profiles?.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span>{donation.profiles.email}</span>
                                    </div>
                                  )}
                                  {donation.profiles?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      <span>{donation.profiles.phone}</span>
                                    </div>
                                  )}
                                  {donation.notes && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Notes</p>
                                      <p className="font-medium">{donation.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Monetary Donations Section */}
                  {activeDonations && activeDonations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Active Donations ({activeDonations.length})
                      </h4>
                      {activeDonations.map(donation => {
                        const isExpanded = expandedItems.has(`donation-${donation.id}`);
                        
                        return (
                          <Collapsible 
                            key={donation.id} 
                            open={isExpanded} 
                            onOpenChange={() => toggleExpanded(`donation-${donation.id}`)}
                          >
                            <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {donation.needs?.categories?.label || 'Donation'}
                                    </Badge>
                                    <Badge variant={donation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                      {donation.status === 'ACTIVE' ? 'Active' : 'Pledged'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      Start: {formatDate(donation.start_date)}
                                    </span>
                                  </div>
                                  <p className="font-medium">
                                    {donation.sponsorship_type === 'RECURRING' 
                                      ? `${formatCurrency(donation.amount_pledged)}/month`
                                      : formatCurrency(donation.amount_pledged)
                                    }
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {donation.profiles?.name && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        By: {donation.profiles.name}
                                      </span>
                                    )}
                                    {donation.sponsorship_type === 'RECURRING' && donation.next_due_date && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Next: {formatDate(donation.next_due_date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              
                              <CollapsibleContent className="mt-3 pt-3 border-t">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Sponsorship Type</p>
                                    <p className="font-medium">{donation.sponsorship_type === 'RECURRING' ? 'Recurring' : 'One-time'}</p>
                                  </div>
                                  {donation.occasion_type && (
                                    <div>
                                      <p className="text-muted-foreground">Occasion</p>
                                      <p className="font-medium">{donation.occasion_type.replace('_', ' ')}</p>
                                    </div>
                                  )}
                                  {donation.profiles?.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span>{donation.profiles.email}</span>
                                    </div>
                                  )}
                                  {donation.profiles?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      <span>{donation.profiles.phone}</span>
                                    </div>
                                  )}
                                  {donation.needs?.description && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Linked Requirement</p>
                                      <p className="font-medium">{donation.needs.description}</p>
                                    </div>
                                  )}
                                  {donation.occasion_note && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Note</p>
                                      <p className="font-medium italic">"{donation.occasion_note}"</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Received Help Tab */}
            <TabsContent value="received" className="mt-4 space-y-4">
              {totalReceivedCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No help received yet</p>
                </div>
              ) : (
                <>
                {(() => {
                  // Build unified sorted list (newest first)
                  type ReceivedItem =
                    | { type: 'need'; sortDate: string; data: NeedWithRelations }
                    | { type: 'food_slot'; sortDate: string; data: FoodSlotWithDonor }
                    | { type: 'kind_donation'; sortDate: string; data: KindDonationWithRelations };

                  const unifiedItems: ReceivedItem[] = [
                    ...receivedNeeds.map(n => ({ type: 'need' as const, sortDate: n.date, data: n })),
                    ...(completedFoodSlots || []).map(s => ({ type: 'food_slot' as const, sortDate: s.date, data: s })),
                    ...receivedKindDonations.map(d => ({ type: 'kind_donation' as const, sortDate: d.received_date, data: d })),
                  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

                  return unifiedItems.map(item => {
                    if (item.type === 'need') {
                      const need = item.data;
                      return (
                        <div key={`need-${need.id}`} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                                  Completed
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(need.date)}
                                </span>
                              </div>
                              <p className="font-medium">{need.description || need.product_name || 'Need'}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {need.categories?.label && (
                                  <span>{need.categories.label}</span>
                                )}
                                {need.donation_mode === 'MONEY_ONLY' && need.collected_amount ? (
                                  <span className="flex items-center gap-1">
                                    <IndianRupee className="h-3 w-3" />
                                    {formatCurrency(need.collected_amount)}
                                  </span>
                                ) : need.fulfilled_product_qty ? (
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {need.fulfilled_product_qty} {need.product_unit}
                                  </span>
                                ) : null}
                              </div>
                              {need.fulfillment_details && (
                                <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                                  <span className="font-medium">Report: </span>
                                  {need.fulfillment_details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {need.fulfillment_details ? (
                                <>
                                  <Badge variant="secondary">Reported</Badge>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => prepareNeedInvoice(need)}
                                  >
                                    <Receipt className="h-4 w-4 mr-1" />
                                    Generate Invoice
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleSendReport(need)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Send Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (item.type === 'food_slot') {
                      const slot = item.data;
                      return (
                        <div key={`slot-${slot.id}`} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                                  Completed
                                </Badge>
                                <Badge variant="outline">Food Slot</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(slot.date)}
                                </span>
                              </div>
                              <p className="font-medium">
                                {slot.time_slot.replace('_', ' ')} Meal
                                {slot.reason ? ` — ${slot.reason}` : ''}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {slot.amount && (
                                  <span className="flex items-center gap-1">
                                    <IndianRupee className="h-3 w-3" />
                                    {formatCurrency(slot.amount)}
                                  </span>
                                )}
                                {slot.profiles?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    By: {slot.profiles.name}
                                  </span>
                                )}
                              </div>
                              {slot.completion_notes && (
                                <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                                  <span className="font-medium">Report: </span>
                                  {slot.completion_notes}
                                </p>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => prepareFoodSlotInvoice(slot)}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Generate Invoice
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // kind_donation
                    const donation = item.data;
                    return (
                      <div key={`kind-${donation.id}`} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                                Received
                              </Badge>
                              <Badge variant="outline">Kind Donation</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(donation.received_date)}
                              </span>
                            </div>
                            <p className="font-medium">
                              {donation.quantity} {donation.item_type}
                              {donation.item_description ? ` — ${donation.item_description}` : ''}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {donation.estimated_value && (
                                <span className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3" />
                                  {formatCurrency(donation.estimated_value)}
                                </span>
                              )}
                              {(donation.profiles?.name || donation.donor_name) && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  By: {donation.profiles?.name || donation.donor_name}
                                </span>
                              )}
                            </div>
                            {donation.completion_notes && (
                              <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                                <span className="font-medium">Report: </span>
                                {donation.completion_notes}
                              </p>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => prepareKindDonationInvoice(donation)}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Generate Invoice
                          </Button>
                        </div>
                      </div>
                    );
                  });
                })()}
                </>
              )}
            </TabsContent>

            {/* Pending Reports Tab */}
            <TabsContent value="reports" className="mt-4 space-y-4">
              {pendingReportNeeds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All reports have been sent</p>
                  <p className="text-sm mt-1">Great job keeping admins informed!</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
                    <Clock className="h-4 w-4 inline mr-2" />
                    {pendingReportNeeds.length} item(s) need fulfillment reports to be sent to admin
                  </div>
                  
                  {pendingReportNeeds.map(need => (
                    <div 
                      key={need.id} 
                      className="p-4 border rounded-lg bg-card border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {need.categories?.label || 'General'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Received on {formatDate(need.date)}
                            </span>
                          </div>
                          <p className="font-medium">{need.description || need.product_name || 'Need'}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {need.donation_mode === 'MONEY_ONLY' && need.collected_amount ? (
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {formatCurrency(need.collected_amount)}
                              </span>
                            ) : need.fulfilled_product_qty ? (
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {need.fulfilled_product_qty} {need.product_unit}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleSendReport(need)}
                        >
                          Send Report
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedNeed && (
        <SendReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          need={selectedNeed}
          onGenerateInvoice={() => prepareNeedInvoice(selectedNeed)}
        />
      )}

      {invoiceData && (
        <GenerateInvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoiceData={invoiceData}
        />
      )}

      {completionData && (
        <CompletionReportDialog
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          itemData={completionData}
          onComplete={handleCompletionSubmit}
          onGenerateInvoice={handleCompletionInvoice}
          trustId={trustId}
        />
      )}
    </>
  );
}
