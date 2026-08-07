import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DonorReceiptDialog } from '@/components/donor/DonorReceiptDialog';
import type { InvoiceData } from '@/components/homes/InvoicePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Heart, 
  Home, 
  Download, 
  RefreshCcw, 
  Clock, 
  CheckCircle2,
  Pause,
  Play,
  X,
  Loader2,
  CreditCard,
  Eye,
  AlertCircle,
  Wallet,
  Utensils,
  FileText,
  Video,
} from 'lucide-react';
import {
  useDonations,
  useUpdateDonation,
  useDonorDonationPayments,
  DonationWithRelations,
} from '@/hooks/useDonations';
import { useDonorFoodSlots, FoodSlot } from '@/hooks/useFoodSlots';
import { useDonorFoodSlotBookingRequests, FoodSlotBookingRequest } from '@/hooks/useFoodSlotBookingRequests';
import {
  useFoodRecurringPledges,
  useUpdateFoodRecurringPledgeStatus,
  type FoodRecurringPledge,
} from '@/hooks/useFoodRecurringPledges';
import { useManualFoodSlotPayment } from '@/hooks/useManualPayment';
import { useDonorReceipts, loadDonorReceiptByReference } from '@/hooks/useDonorReceipts';
import { getFoodSlotBalanceDue, isFoodSlotFullyPaid, slotNeedsDonorPayment } from '@/lib/foodSlotUtils';
import { formatFoodSlotLabel } from '@/lib/foodSlotConstants';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import { isManualPaymentsEnabled, isRazorpayEnabled } from '@/lib/manualPayments';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { RecordPaymentDialog } from '@/components/donations/RecordPaymentDialog';
import type { Database } from '@/integrations/supabase/types';
import { getRazorpayDonorEmail } from '@/lib/donorEmail';
import { isDonorPortal } from '@/lib/portal';
import { apiFetch } from '@/integrations/supabase/client';
import {
  buildDonationReceiptData,
  buildFoodSlotReceiptData,
  canShowFoodSlotReceipt,
  donationHasReceipt,
  donationReceiptReference,
  foodSlotReceiptReference,
  latestPaymentByDonation,
  parseReceiptReference,
  type DonorReceiptProfile,
} from '@/lib/donorReceipt';

type DonationStatus = Database['public']['Enums']['donation_status'];

type FoodSlotWithHome = FoodSlot & { homes?: { name: string } | null };

type OneTimeItem =
  | { kind: 'donation'; date: string; data: DonationWithRelations }
  | { kind: 'food'; date: string; data: FoodSlotWithHome }
  | { kind: 'booking-request'; date: string; data: FoodSlotBookingRequest };

const bookingRequestStatusLabels: Record<FoodSlotBookingRequest['status'], string> = {
  PENDING: 'Awaiting Review',
  APPROVED: 'Confirmed',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
};

const foodSlotLabel = (timeSlot: string, mealType?: string | null) =>
  formatFoodSlotLabel(timeSlot as FoodTimeSlot, mealType);

const recentTimestamp = (createdAt?: string | null, fallbackDate?: string) => {
  if (createdAt) return new Date(createdAt).getTime();
  if (fallbackDate) return new Date(fallbackDate).getTime();
  return 0;
};

const MyDonations = ({ embedded = false }: { embedded?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('one-time');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationWithRelations | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<Omit<InvoiceData, 'receiptNumber'> | null>(null);
  const [receiptReference, setReceiptReference] = useState('');
  const [storedReceiptNumber, setStoredReceiptNumber] = useState<string | undefined>();
  const [activeReceiptId, setActiveReceiptId] = useState<string | undefined>();
  const [activeReceiptEmailedAt, setActiveReceiptEmailedAt] = useState<string | null | undefined>();
  const donorStyled = embedded || isDonorPortal();

  const { data: donations = [], isLoading: donationsLoading } = useDonations(user?.id);
  const { data: foodSlots = [], isLoading: foodSlotsLoading } = useDonorFoodSlots(user?.id);
  const { data: bookingRequests = [], isLoading: bookingRequestsLoading } = useDonorFoodSlotBookingRequests(user?.id);
  const { data: foodPledges = [], isLoading: foodPledgesLoading } = useFoodRecurringPledges(user?.id);
  const updateFoodPledge = useUpdateFoodRecurringPledgeStatus();
  const donationIds = useMemo(() => donations.map((d) => d.id), [donations]);
  const { data: donationPayments = [], isLoading: paymentsLoading } = useDonorDonationPayments(donationIds);
  const { data: storedReceipts = [], isLoading: receiptsLoading } = useDonorReceipts(Boolean(user?.id));
  const receiptsByReference = useMemo(() => {
    const map = new Map<string, (typeof storedReceipts)[number]>();
    for (const receipt of storedReceipts) {
      map.set(receipt.reference_key, receipt);
    }
    return map;
  }, [storedReceipts]);
  const paymentsByDonation = useMemo(
    () => latestPaymentByDonation(donationPayments),
    [donationPayments],
  );
  const isLoading =
    donationsLoading ||
    foodSlotsLoading ||
    bookingRequestsLoading ||
    foodPledgesLoading ||
    paymentsLoading ||
    receiptsLoading;
  const updateDonation = useUpdateDonation();
  const manualFoodPayment = useManualFoodSlotPayment();
  const { initiatePayment, isProcessing } = useRazorpay();

  const donorProfile: DonorReceiptProfile = {
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    address: (user as DonorReceiptProfile)?.address,
    city: (user as DonorReceiptProfile)?.city,
    state: (user as DonorReceiptProfile)?.state,
    pincode: (user as DonorReceiptProfile)?.pincode,
  };

  const openReceipt = useCallback((
    data: Omit<InvoiceData, 'receiptNumber'>,
    reference: string,
    officialReceiptNumber?: string,
    receiptId?: string,
    receiptEmailedAt?: string | null,
  ) => {
    setReceiptData(data);
    setReceiptReference(reference);
    setStoredReceiptNumber(officialReceiptNumber);
    setActiveReceiptId(receiptId);
    setActiveReceiptEmailedAt(receiptEmailedAt);
    setReceiptOpen(true);
  }, []);

  const openStoredReceipt = useCallback(
    (reference: string, fallback?: () => void) => {
      const cached = receiptsByReference.get(reference);
      if (cached?.invoice_data) {
        const { receiptNumber: _ignored, ...invoiceFields } = cached.invoice_data;
        openReceipt(
          invoiceFields,
          reference,
          cached.receipt_number,
          cached.id,
          cached.receipt_emailed_at,
        );
        return;
      }
      void loadDonorReceiptByReference(reference).then((receipt) => {
        if (receipt?.invoice_data) {
          const { receiptNumber: _ignored, ...invoiceFields } = receipt.invoice_data;
          openReceipt(
            invoiceFields,
            reference,
            receipt.receipt_number,
            receipt.id,
            receipt.receipt_emailed_at,
          );
        } else {
          fallback?.();
        }
      });
    },
    [openReceipt, receiptsByReference],
  );

  const resolveAndOpenReceipt = useCallback(
    (receiptParam: string) => {
      const target = parseReceiptReference(receiptParam);
      if (!target || !user) return false;

      if (target.kind === 'food') {
        const slot = foodSlots.find((s) => s.id === target.id);
        if (!slot || !canShowFoodSlotReceipt(slot)) return false;
        const reference = foodSlotReceiptReference(slot.id);
        openStoredReceipt(reference, () => {
          openReceipt(buildFoodSlotReceiptData(slot, donorProfile), reference);
        });
        return true;
      }

      if (target.kind === 'need') {
        const donation = donations.find((d) => d.need_id === target.needId);
        if (!donation || !donationHasReceipt(donation, paymentsByDonation)) return false;
        const payment = paymentsByDonation.get(donation.id);
        const reference = donationReceiptReference(donation.id, payment);
        openStoredReceipt(reference, () => {
          openReceipt(buildDonationReceiptData(donation, donorProfile, payment), reference);
        });
        return true;
      }

      const donation = donations.find((d) => d.id === target.id);
      if (!donation || !donationHasReceipt(donation, paymentsByDonation)) return false;
      const payment = target.paymentId
        ? donationPayments.find(
            (p) => p.donation_id === target.id && p.payment_reference === target.paymentId,
          )
        : paymentsByDonation.get(target.id);
      const reference = donationReceiptReference(donation.id, payment);
      openStoredReceipt(reference, () => {
        openReceipt(buildDonationReceiptData(donation, donorProfile, payment), reference);
      });
      return true;
    },
    [
      donations,
      donationPayments,
      donorProfile,
      foodSlots,
      openReceipt,
      openStoredReceipt,
      paymentsByDonation,
      user,
    ],
  );

  const receiptParam = searchParams.get('receipt');
  const receiptIdParam = searchParams.get('receiptId');

  useEffect(() => {
    if (!receiptParam || isLoading || !user) return;
    const opened = resolveAndOpenReceipt(receiptParam);
    if (opened) {
      const next = new URLSearchParams(searchParams);
      next.delete('receipt');
      setSearchParams(next, { replace: true });
    }
  }, [receiptParam, isLoading, user, resolveAndOpenReceipt, searchParams, setSearchParams]);

  useEffect(() => {
    if (!receiptIdParam || !user) return;
    const cached = storedReceipts.find((r) => r.id === receiptIdParam);
    const openFromReceipt = (receipt: (typeof storedReceipts)[number] | null) => {
      if (!receipt?.invoice_data) return;
      const { receiptNumber: _ignored, ...invoiceFields } = receipt.invoice_data;
      openReceipt(
        invoiceFields,
        receipt.reference_key,
        receipt.receipt_number,
        receipt.id,
        receipt.receipt_emailed_at,
      );
    };
    if (cached?.invoice_data) {
      openFromReceipt(cached);
    } else {
      void apiFetch(`/api/donor/receipts/${encodeURIComponent(receiptIdParam)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((receipt) => openFromReceipt(receipt));
    }
    const next = new URLSearchParams(searchParams);
    next.delete('receiptId');
    setSearchParams(next, { replace: true });
  }, [receiptIdParam, user, storedReceipts, openReceipt, searchParams, setSearchParams]);

  const renderReceiptButton = (onClick: () => void) =>
    donorStyled ? (
      <button
        type="button"
        className="donor-btn donor-btn-outline px-4 py-2 text-sm inline-flex items-center gap-2"
        onClick={onClick}
      >
        <FileText className="h-4 w-4" />
        View Receipt
      </button>
    ) : (
      <Button variant="outline" size="sm" onClick={onClick}>
        <FileText className="h-4 w-4 mr-1" />
        View Receipt
      </Button>
    );

  // Filter donations by type
  const oneTimeDonations = donations.filter(d => d.sponsorship_type === 'ONE_TIME');
  const recurringDonations = donations.filter(d => d.sponsorship_type === 'RECURRING');
  const recurringTotalCount = recurringDonations.length + foodPledges.length;
  const activeRecurringCount =
    recurringDonations.filter((d) => d.status === 'ACTIVE').length +
    foodPledges.filter((p) => p.status === 'ACTIVE').length;

  const visibleBookingRequests = useMemo(() => {
    const slotKeys = new Set(
      foodSlots.map((s) => `${s.home_id}-${s.date}-${s.time_slot}`),
    );
    return bookingRequests.filter((req) => {
      if (req.status !== 'APPROVED') return true;
      const key = `${req.home_id}-${req.date}-${req.time_slot}`;
      return !slotKeys.has(key);
    });
  }, [bookingRequests, foodSlots]);

  const oneTimeItems = useMemo(() => {
    const items: OneTimeItem[] = [
      ...oneTimeDonations.map((d) => ({ kind: 'donation' as const, date: d.start_date, data: d })),
      ...foodSlots.map((s) => ({ kind: 'food' as const, date: s.date, data: s })),
      ...visibleBookingRequests.map((r) => ({ kind: 'booking-request' as const, date: r.date, data: r })),
    ];
    return items.sort(
      (a, b) =>
        recentTimestamp(
          'created_at' in a.data ? a.data.created_at : undefined,
          a.date,
        ) -
        recentTimestamp(
          'created_at' in b.data ? b.data.created_at : undefined,
          b.date,
        ),
    );
  }, [oneTimeDonations, foodSlots, visibleBookingRequests]);

  const recurringDonationsSorted = useMemo(
    () =>
      [...recurringDonations].sort(
        (a, b) => recentTimestamp(b.created_at, b.start_date) - recentTimestamp(a.created_at, a.start_date),
      ),
    [recurringDonations],
  );

  const foodPledgesSorted = useMemo(
    () =>
      [...foodPledges].sort(
        (a, b) => recentTimestamp(b.created_at, b.next_due_date) - recentTimestamp(a.created_at, a.next_due_date),
      ),
    [foodPledges],
  );

  const oneTimeCount = oneTimeItems.length;

  const getStatusBadge = (status: DonationStatus | null) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-success/20 text-success border-success/30">Active</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Completed</Badge>;
      case 'PLEDGED':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pledged</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getOccasionLabel = (type?: string | null) => {
    switch (type) {
      case 'birthday': return 'Birthday Celebration';
      case 'ancestor_remembrance': return 'In Memory';
      case 'festival': return 'Festival';
      default: return 'Donation';
    }
  };

  const handlePauseDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'PLEDGED', // Using PLEDGED as paused state
      });
      toast({
        title: "Donation Paused",
        description: "Your recurring donation has been paused. You can resume it anytime.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResumeDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'ACTIVE',
      });
      toast({
        title: "Donation Resumed",
        description: "Your recurring donation has been resumed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resume donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDonation = async (donationId: string) => {
    try {
      await updateDonation.mutateAsync({
        id: donationId,
        status: 'CANCELLED',
      });
      toast({
        title: "Donation Cancelled",
        description: "Your recurring donation has been cancelled.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFoodSlotStatusBadge = (slot: FoodSlotWithHome) => {
    if (isFoodSlotFullyPaid(slot)) {
      return <Badge className="bg-success/20 text-success border-success/30">Paid</Badge>;
    }
    const payment = slot.payment_status?.toUpperCase();
    if (payment === 'PARTIALLY_PAID') {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Partially Paid</Badge>;
    }
    return <Badge className="bg-warning/20 text-warning border-warning/30">Payment Pending</Badge>;
  };

  const getBookingRequestStatusBadge = (status: FoodSlotBookingRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-warning/20 text-warning border-warning/30">{bookingRequestStatusLabels.PENDING}</Badge>;
      case 'APPROVED':
        return <Badge className="bg-primary/20 text-primary border-primary/30">{bookingRequestStatusLabels.APPROVED}</Badge>;
      case 'REJECTED':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{bookingRequestStatusLabels.REJECTED}</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">{bookingRequestStatusLabels.CANCELLED}</Badge>;
    }
  };

  const handleCompleteFoodPayment = async (slot: FoodSlotWithHome) => {
    const balanceDue = getFoodSlotBalanceDue(slot);
    if (balanceDue <= 0) return;

    if (isRazorpayEnabled()) {
      initiatePayment({
        amount: balanceDue,
        foodSlot: {
          food_slot_id: slot.id,
          home_id: slot.home_id,
          trust_id: slot.trust_id,
          date: slot.date,
          time_slot: slot.time_slot,
        },
        donorName: user?.name || 'Donor',
        donorEmail: getRazorpayDonorEmail(user?.email),
        donorPhone: user?.phone,
        description: `${foodSlotLabel(slot.time_slot, slot.meal_type)} sponsorship · ${slot.homes?.name || 'project'}`,
        onSuccess: () => {
          toast({
            title: 'Payment Successful!',
            description: `₹${balanceDue.toLocaleString()} paid for ${slot.homes?.name || 'project'} food sponsorship.`,
          });
        },
        onFailure: (error) => {
          if (error !== 'Payment cancelled by user') {
            toast({
              title: 'Payment Failed',
              description: error,
              variant: 'destructive',
            });
          }
        },
      });
      return;
    }

    if (!isManualPaymentsEnabled()) return;

    try {
      await manualFoodPayment.mutateAsync({
        food_slot_id: slot.id,
        home_id: slot.home_id,
        trust_id: slot.trust_id,
        date: slot.date,
        time_slot: slot.time_slot,
        amount: balanceDue,
      });
      toast({
        title: 'Payment Successful!',
        description: `₹${balanceDue.toLocaleString()} paid for ${slot.homes?.name || 'project'} food sponsorship.`,
      });
    } catch {
      /* toast from hook */
    }
  };

  const handleExport = () => {
    if (donations.length === 0 && foodSlots.length === 0 && visibleBookingRequests.length === 0) {
      toast({
        title: "No Data",
        description: "No donations to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Kind', 'Date', 'Project', 'Category', 'Type', 'Amount', 'Status', 'Occasion', 'Note'];
    const donationRows = donations.map(d => [
      'Need Sponsorship',
      format(new Date(d.start_date), 'yyyy-MM-dd'),
      d.homes?.name || '',
      d.needs?.categories?.label || '',
      d.sponsorship_type,
      d.amount_pledged.toString(),
      d.status || '',
      d.occasion_type || '',
      d.occasion_note || '',
    ]);
    const foodRows = foodSlots.map(slot => [
      'Food Sponsorship',
      format(new Date(slot.date), 'yyyy-MM-dd'),
      slot.homes?.name || '',
      foodSlotLabel(slot.time_slot, slot.meal_type),
      'ONE_TIME',
      (slot.amount ?? 0).toString(),
      isFoodSlotFullyPaid(slot) ? 'PAID' : slot.payment_status || 'PENDING',
      slot.sponsor_for || '',
      slot.reason || '',
    ]);
    const requestRows = visibleBookingRequests.map((req) => [
      'Food Booking Request',
      format(new Date(req.date), 'yyyy-MM-dd'),
      req.home_name || '',
      foodSlotLabel(req.time_slot),
      'ONE_TIME',
      req.amount.toString(),
      req.status,
      '',
      req.notes || '',
    ]);
    const rows = [...donationRows, ...foodRows, ...requestRows];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `my-donations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: "Your donation history has been downloaded.",
    });
  };

  const totalOneTime = oneTimeDonations.reduce((sum, d) => sum + d.amount_pledged, 0);
  const totalRecurring = recurringDonations.reduce((sum, d) => sum + d.amount_pledged, 0);
  const totalFood = foodSlots.reduce((sum, slot) => sum + (slot.amount ?? 0), 0);
  const pendingFoodSlots = foodSlots.filter((slot) => slotNeedsDonorPayment(slot));

  const renderDonationCard = (donation: DonationWithRelations, isRecurring: boolean) => {
    const home = donation.homes;
    const need = donation.needs;
    const category = need?.categories;
    const isDue = donation.status === 'OVERDUE' || 
      (donation.next_due_date && isBefore(new Date(donation.next_due_date), new Date()));

    return (
      <Card key={donation.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {home?.image_url ? (
                <img src={home.image_url} alt={home.name} className="w-full h-full object-cover" />
              ) : (
                <Home className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{home?.name || 'Unknown Project'}</h3>
                  <p className="text-sm text-muted-foreground">{category?.label || 'General'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDue && isRecurring && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Payment Due
                    </Badge>
                  )}
                  {getStatusBadge(donation.status)}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {isRecurring ? 'Started: ' : ''}{format(new Date(donation.start_date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {getOccasionLabel(donation.occasion_type)}
                </span>
              </div>
              {donation.occasion_note && (
                <p className="text-sm italic mt-2">"{donation.occasion_note}"</p>
              )}
              
              {/* Recurring-specific info with progress */}
              {isRecurring && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex flex-wrap gap-4">
                    {donation.next_due_date && (
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${isDue ? 'text-destructive' : 'text-warning'}`} />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Next Due:</span>{' '}
                          <span className={`font-medium ${isDue ? 'text-destructive' : ''}`}>
                            {format(new Date(donation.next_due_date), 'MMM dd, yyyy')}
                          </span>
                        </span>
                      </div>
                    )}
                    {donation.last_paid_date && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Last Paid:</span>{' '}
                          <span className="font-medium">{format(new Date(donation.last_paid_date), 'MMM dd, yyyy')}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Pay Now Button for due donations */}
                  {isDue && donation.status !== 'CANCELLED' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation();
                          initiatePayment({
                            amount: donation.amount_pledged,
                            donationId: donation.id,
                            donorName: user?.name || user?.email || 'Donor',
                            donorEmail: user?.email || '',
                            donorPhone: user?.phone || '',
                            description: `Payment for ${donation.homes?.name || 'Project'}`,
                            onSuccess: () => {
                              toast({
                                title: "Payment Successful! 🎉",
                                description: `₹${donation.amount_pledged.toLocaleString()} paid for ${donation.homes?.name || 'Project'}.`,
                              });
                            },
                            onFailure: (error) => {
                              if (error !== 'Payment cancelled by user') {
                                toast({
                                  title: "Payment Failed",
                                  description: error,
                                  variant: "destructive",
                                });
                              }
                            },
                          });
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Online
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDonation(donation);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Manual
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₹{donation.amount_pledged.toLocaleString()}</p>
                {isRecurring && <p className="text-xs text-muted-foreground">per month</p>}
              </div>
              
              {/* View Details Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/donations/${donation.id}`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>

              {donationHasReceipt(donation, paymentsByDonation) && renderReceiptButton(() => {
                const payment = paymentsByDonation.get(donation.id);
                const reference = donationReceiptReference(donation.id, payment);
                openStoredReceipt(reference, () => {
                  openReceipt(
                    buildDonationReceiptData(donation, donorProfile, payment),
                    reference,
                  );
                });
              })}
              
              {/* Actions for recurring donations */}
              {isRecurring && donation.status !== 'CANCELLED' && donation.status !== 'COMPLETED' && (
                <div className="flex gap-2">
                  {donation.status === 'ACTIVE' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={updateDonation.isPending}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Pause Recurring Donation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your donation will be paused until you resume it. No payments will be collected during this time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePauseDonation(donation.id)}>
                            Pause Donation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleResumeDonation(donation.id)}
                      disabled={updateDonation.isPending}
                    >
                      {updateDonation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Resume
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={updateDonation.isPending}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Recurring Donation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently cancel your recurring donation. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Donation</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleCancelDonation(donation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Donation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFoodSlotCard = (slot: FoodSlotWithHome) => {
    const homeName = slot.homes?.name || 'Unknown Project';
    const slotLabel = foodSlotLabel(slot.time_slot, slot.meal_type);
    const totalAmount = slot.amount ?? 0;
    const balanceDue = getFoodSlotBalanceDue(slot);
    const amountPaid = slot.amount_paid ?? 0;
    const needsPayment = slotNeedsDonorPayment(slot);

    return (
      <Card key={slot.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{homeName}</h3>
                  <p className="text-sm text-muted-foreground">{slotLabel} sponsorship</p>
                </div>
                {getFoodSlotStatusBadge(slot)}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(slot.date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Utensils className="h-4 w-4" />
                  {slotLabel}
                </span>
              </div>
              {amountPaid > 0 && balanceDue > 0 && (
                <p className="text-sm mt-2 text-muted-foreground">
                  ₹{amountPaid.toLocaleString()} paid · ₹{balanceDue.toLocaleString()} remaining
                </p>
              )}
              {slot.sponsor_for && (
                <p className="text-sm mt-2">Sponsored for: {slot.sponsor_for}</p>
              )}
              {slot.reason && (
                <p className="text-sm italic mt-2 text-muted-foreground">"{slot.reason}"</p>
              )}
              {slot.photos_shared_at &&
                ((slot.completion_photos?.length || 0) > 0 || (slot.completion_videos?.length || 0) > 0) && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Event photos &amp; videos</p>
                  {(slot.completion_photos?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {slot.completion_photos!.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-16 w-16 rounded-md overflow-hidden border hover:opacity-90"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {(slot.completion_videos?.length || 0) > 0 && (
                    <div className="space-y-1">
                      {slot.completion_videos!.map((url, i) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Video className="h-4 w-4" />
                          Watch video {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {slot.completion_notes && (
                    <p className="text-xs text-muted-foreground">{slot.completion_notes}</p>
                  )}
                </div>
              )}
              {needsPayment && (isRazorpayEnabled() || isManualPaymentsEnabled()) && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    disabled={manualFoodPayment.isPending || isProcessing}
                    onClick={() => handleCompleteFoodPayment(slot)}
                  >
                    {(manualFoodPayment.isPending || isProcessing) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {isRazorpayEnabled() ? `Pay ₹${balanceDue.toLocaleString()} via Razorpay` : `Pay ₹${balanceDue.toLocaleString()}`}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ₹{(balanceDue > 0 ? balanceDue : totalAmount).toLocaleString()}
                </p>
                {balanceDue > 0 && balanceDue < totalAmount && (
                  <p className="text-xs text-muted-foreground">of ₹{totalAmount.toLocaleString()} total</p>
                )}
                {balanceDue === 0 && totalAmount > 0 && (
                  <p className="text-xs text-muted-foreground">total sponsored</p>
                )}
              </div>
              {canShowFoodSlotReceipt(slot) && renderReceiptButton(() => {
                const reference = foodSlotReceiptReference(slot.id);
                openStoredReceipt(reference, () => {
                  openReceipt(buildFoodSlotReceiptData(slot, donorProfile), reference);
                });
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFoodPledgeCard = (pledge: FoodRecurringPledge) => {
    const homeName = pledge.homes?.name || 'Unknown Project';
    const slotLabel = foodSlotLabel(pledge.time_slot);
    const freqLabel = pledge.frequency === 'annual' ? 'Annual' : 'Monthly';
    const isOverdue =
      pledge.status === 'ACTIVE' &&
      pledge.next_due_date &&
      isBefore(new Date(pledge.next_due_date), new Date());

    return (
      <Card key={`food-pledge-${pledge.id}`} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Utensils className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{homeName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {freqLabel} food sponsorship · {slotLabel}
                  </p>
                </div>
                <Badge variant={pledge.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {pledge.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Started {format(new Date(pledge.start_date), 'MMM dd, yyyy')}
                </span>
                {pledge.next_due_date && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                    <Clock className="h-4 w-4" />
                    Next due {format(new Date(pledge.next_due_date), 'MMM dd, yyyy')}
                    {isOverdue ? ' (overdue)' : ''}
                  </span>
                )}
                {pledge.donation_for && (
                  <span>For: {pledge.donation_for}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Same date and time each {pledge.frequency === 'annual' ? 'year' : 'month'}. Pay when due — not auto-debited.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₹{pledge.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  per {pledge.frequency === 'annual' ? 'year' : 'month'}
                </p>
              </div>
              {pledge.status !== 'CANCELLED' && (
                <div className="flex gap-2">
                  {pledge.status === 'ACTIVE' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateFoodPledge.isPending}
                      onClick={() => updateFoodPledge.mutate({ id: pledge.id, status: 'PAUSED' })}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateFoodPledge.isPending}
                      onClick={() => updateFoodPledge.mutate({ id: pledge.id, status: 'ACTIVE' })}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={updateFoodPledge.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel food recurring pledge?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This stops future {freqLabel.toLowerCase()} meal sponsorship reminders for {homeName}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Pledge</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateFoodPledge.mutate({ id: pledge.id, status: 'CANCELLED' })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Pledge
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBookingRequestCard = (request: FoodSlotBookingRequest) => {
    const homeName = request.home_name || 'Unknown Project';
    const slotLabel = foodSlotLabel(request.time_slot);

    return (
      <Card key={`req-${request.id}`} className="hover:shadow-md transition-shadow border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{homeName}</h3>
                  <p className="text-sm text-muted-foreground">{slotLabel} booking request</p>
                </div>
                {getBookingRequestStatusBadge(request.status)}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(request.date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Utensils className="h-4 w-4" />
                  {slotLabel}
                </span>
              </div>
              {request.notes && (
                <p className="text-sm italic mt-2 text-muted-foreground">"{request.notes}"</p>
              )}
              {request.status === 'PENDING' && (
                <p className="text-sm mt-2 text-muted-foreground">
                  Sent to the social worker and admins for review. The slot stays open until confirmed.
                </p>
              )}
              {request.status === 'REJECTED' && (
                <p className="text-sm mt-2 text-muted-foreground">
                  This request was not approved. You may submit a new request from the food calendar.
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">₹{request.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">requested amount</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pageClass = embedded ? 'donor-container py-8' : 'container py-8';

  const wrapPage = (content: ReactNode) =>
    embedded ? <div className={pageClass}>{content}</div> : <MainLayout><div className={pageClass}>{content}</div></MainLayout>;

  if (isLoading) {
    return wrapPage(
      <>
        {!embedded && (
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        )}
        {embedded && (
          <div className="flex justify-end mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
        )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-10 w-80 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
      </>
    );
  }

  return wrapPage(
    <>
        {embedded ? (
          <div className="flex justify-end mb-6">
            <Button variant="outline" onClick={handleExport} disabled={donations.length === 0 && foodSlots.length === 0 && visibleBookingRequests.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export History
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">My Donations</h1>
              <p className="text-muted-foreground mt-1">Track and manage your contributions</p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={donations.length === 0 && foodSlots.length === 0 && visibleBookingRequests.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export History
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Contributed</p>
                  <p className="text-2xl font-bold">₹{(totalOneTime + totalRecurring + totalFood).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">One-Time Donations</p>
                  <p className="text-2xl font-bold">{oneTimeCount}</p>
                  {pendingFoodSlots.length > 0 && (
                    <p className="text-xs text-warning">{pendingFoodSlots.length} food awaiting payment</p>
                  )}
                  {visibleBookingRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {visibleBookingRequests.filter((r) => r.status === 'PENDING').length} booking request(s) pending
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <RefreshCcw className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Recurring</p>
                  <p className="text-2xl font-bold">{activeRecurringCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="one-time">One-Time ({oneTimeCount})</TabsTrigger>
            <TabsTrigger value="recurring">Recurring ({recurringTotalCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="one-time" className="space-y-4">
            {oneTimeCount === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No one-time donations yet</h3>
                  <p className="text-muted-foreground mb-4">Sponsor a need or donate food to get started</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                      <Link to="/?tab=sponsor">Browse Needs</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/?tab=food">Donate Food</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              oneTimeItems.map((item) => {
                if (item.kind === 'donation') return renderDonationCard(item.data, false);
                if (item.kind === 'food') return renderFoodSlotCard(item.data);
                return renderBookingRequestCard(item.data);
              })
            )}
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            {recurringTotalCount === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recurring donations yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up monthly or annual food sponsorship, or recurring need support
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                      <Link to="/?tab=food">Donate Food</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/?tab=sponsor">Browse Needs</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {foodPledgesSorted.map((pledge) => renderFoodPledgeCard(pledge))}
                {recurringDonationsSorted.map((donation) => renderDonationCard(donation, true))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        {selectedDonation && (
          <RecordPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            donationId={selectedDonation.id}
            amount={selectedDonation.amount_pledged}
            nextDueDate={selectedDonation.next_due_date}
            homeName={selectedDonation.homes?.name || 'Project'}
          />
        )}

        <DonorReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          invoiceData={receiptData}
          receiptReference={receiptReference}
          storedReceiptNumber={storedReceiptNumber}
          receiptId={activeReceiptId}
          receiptEmailedAt={activeReceiptEmailedAt}
        />
    </>
  );
};

export default MyDonations;
