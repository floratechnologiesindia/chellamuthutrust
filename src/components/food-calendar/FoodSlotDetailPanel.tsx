import { useState } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sun, CloudSun, Moon, Coffee, Trash2, Loader2, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isDonorPortal } from '@/lib/portal';
import { DonorFoodSlotCheckout } from '@/components/donor/DonorFoodSlotCheckout';
import { StaffFoodSlotConfirm } from '@/components/food-calendar/StaffFoodSlotConfirm';
import { useFoodSlotBookingRequests } from '@/hooks/useFoodSlotBookingRequests';
import { isSlotBooked, isSlotOpen, getDonorDisplayStatus, getStaffDisplayStatus, staffDisplayLabel, normalizePaymentStatus } from '@/lib/foodSlotUtils';
import { useCreateFoodSlot,
  useUpdateFoodSlot,
  useDeleteFoodSlot,
  useSponsorFoodSlot,
  useCompleteFoodSlotPayment,
} from '@/hooks/useFoodSlots';
import type {
  FoodSlotWithDonor,
  FoodTimeSlot,
  FoodSlotStatus,
} from '@/hooks/useFoodSlots';
import { cn } from '@/lib/utils';
import { useFoodSlotPricingMap } from '@/hooks/useFoodSlotPricing';
import { formatCurrency } from '@/lib/formatters';
import { formatFoodSlotLabel } from '@/lib/foodSlotConstants';
import type { FoodSlotRazorpayPayRequest } from '@/lib/foodSlotRazorpay';

interface FoodSlotDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  timeSlot: FoodTimeSlot | null;
  existingSlot: FoodSlotWithDonor | null;
  homeId: string;
  trustId: string;
  homeName: string;
  onRazorpayFoodPayment?: (request: FoodSlotRazorpayPayRequest) => void;
  razorpayProcessing?: boolean;
  homeSlots?: FoodSlotWithDonor[];
}

const slotLabels: Record<FoodTimeSlot, { label: string; icon: React.ReactNode }> = {
  MORNING: { label: 'Breakfast', icon: <Sun className="h-4 w-4" /> },
  AFTERNOON: { label: 'Lunch', icon: <CloudSun className="h-4 w-4" /> },
  EVENING: { label: 'Dinner', icon: <Moon className="h-4 w-4" /> },
  REFRESHMENTS: { label: 'Refreshments', icon: <Coffee className="h-4 w-4" /> },
  OUTSIDE_FOOD: { label: 'Outside Food', icon: <Utensils className="h-4 w-4" /> },
};

const statusLabels: Record<FoodSlotStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NEED: { label: 'Open for Sponsorship', variant: 'secondary' },
  BOOKED: { label: 'Booked (Unpaid)', variant: 'default' },
  PAID: { label: 'Paid & Confirmed', variant: 'destructive' },
};

const donorStatusLabels: Record<'OPEN' | 'BOOKED', string> = {
  OPEN: 'Open for Sponsorship',
  BOOKED: 'Booked',
};

function DonorSlotStatus({ slot }: { slot: FoodSlotWithDonor | null }) {
  const display = getDonorDisplayStatus(slot);
  return (
    <span
      className={cn(
        'donor-slot-status',
        display === 'BOOKED' && 'donor-slot-status-paid',
        display === 'OPEN' && 'donor-slot-status-need',
      )}
    >
      {donorStatusLabels[display]}
    </span>
  );
}

export function FoodSlotDetailPanel({
  open,
  onOpenChange,
  date,
  timeSlot,
  existingSlot,
  homeId,
  trustId,
  homeName,
  onRazorpayFoodPayment,
  razorpayProcessing,
  homeSlots = [],
}: FoodSlotDetailPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'warden';
  const isDonor = user?.role === 'donor';
  const donorCheckout = isDonorPortal() && !isAdmin;

  const [note, setNote] = useState(existingSlot?.note || '');
  const [status, setStatus] = useState<FoodSlotStatus>(existingSlot?.status || 'NEED');
  const [maxSponsors, setMaxSponsors] = useState(existingSlot?.max_sponsors_allowed || 1);
  const [isSponsorLoading, setIsSponsorLoading] = useState(false);

  const createSlot = useCreateFoodSlot();
  const updateSlot = useUpdateFoodSlot();
  const deleteSlot = useDeleteFoodSlot();
  const sponsorSlot = useSponsorFoodSlot();
  const completePayment = useCompleteFoodSlotPayment();

  const { priceMap } = useFoodSlotPricingMap();
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
  const slotAmount =
    existingSlot?.amount ?? (timeSlot ? priceMap[timeSlot] : undefined) ?? 75;
  const { data: pendingRequests = [] } = useFoodSlotBookingRequests(
    isAdmin && dateStr && timeSlot
      ? { home_id: homeId, status: 'PENDING' }
      : undefined,
  );
  const cellRequests = pendingRequests.filter(
    (r) => r.date === dateStr && r.time_slot === timeSlot,
  );

  const slotOpen = !existingSlot || isSlotOpen(existingSlot.status);
  const slotBooked = existingSlot && isSlotBooked(existingSlot.status);
  const slotDisplayLabel =
    timeSlot != null ? formatFoodSlotLabel(timeSlot, existingSlot?.meal_type) : '';

  const isLoading = isSponsorLoading || createSlot.isPending || updateSlot.isPending || deleteSlot.isPending || sponsorSlot.isPending || completePayment.isPending;

  const handleCreate = () => {
    if (!date || !timeSlot) return;
    createSlot.mutate(
      {
        home_id: homeId,
        trust_id: trustId,
        date: format(date, 'yyyy-MM-dd'),
        time_slot: timeSlot,
        note: note || undefined,
        max_sponsors_allowed: maxSponsors,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleUpdate = () => {
    if (!existingSlot) return;
    updateSlot.mutate(
      { id: existingSlot.id, status, note, max_sponsors_allowed: maxSponsors },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDelete = () => {
    if (!existingSlot) return;
    if (existingSlot && isSlotBooked(existingSlot.status)) {
      return;
    }
    deleteSlot.mutate(existingSlot.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleSponsor = () => {
    if (!existingSlot) return;
    sponsorSlot.mutate(
      { slotId: existingSlot.id, homeName, date: existingSlot.date, timeSlot: existingSlot.time_slot },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleCompletePayment = () => {
    if (!existingSlot) return;
    completePayment.mutate(existingSlot.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleSponsorNewSlot = async () => {
    if (!date || !timeSlot || !user) return;
    setIsSponsorLoading(true);
    try {
      const { error } = await supabase
        .from('food_slots')
        .insert({
          home_id: homeId,
          trust_id: trustId,
          date: format(date, 'yyyy-MM-dd'),
          time_slot: timeSlot,
          status: 'BOOKED' as const,
          donor_id: user.id,
          current_sponsors_count: 1,
          max_sponsors_allowed: 1,
          created_by: user.id,
        });
      if (error) throw error;

      // Notify finance users about pending payment
      const { data: financeUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'finance');

      if (financeUsers && financeUsers.length > 0) {
        const notifications = financeUsers.map((u: any) => ({
          user_id: u.user_id,
          type: 'payment_awaiting_assignment' as const,
          title: 'Food Sponsorship Pending Payment',
          message: `A ${slotDisplayLabel} food slot on ${format(date, 'yyyy-MM-dd')} at ${homeName} has been booked without payment. Please track the expected payment.`,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast.success('Successfully sponsored this food slot!');
      queryClient.invalidateQueries({ queryKey: ['food-slots'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sponsor food slot');
    } finally {
      setIsSponsorLoading(false);
    }
  };

  if (!date || !timeSlot) return null;

  const panelBody = (
    <div className={cn(donorCheckout ? 'space-y-5' : 'mt-6 space-y-6')}>
      {existingSlot && (
        <div className={cn('flex items-center gap-2', donorCheckout && 'justify-center')}>
          {!donorCheckout && (
            <Badge variant={slotOpen ? 'secondary' : 'default'}>
              {slotOpen ? 'Open' : staffDisplayLabel(getStaffDisplayStatus(existingSlot))}
            </Badge>
          )}
          {donorCheckout && <DonorSlotStatus slot={existingSlot} />}
        </div>
      )}

      {existingSlot?.profiles && slotBooked && (
        <div
          className={cn(
            'p-4 space-y-2',
            donorCheckout ? 'donor-card' : 'rounded-lg border border-border bg-muted/50',
          )}
        >
          <span
            className="text-sm font-semibold"
            style={donorCheckout ? { color: '#333', fontFamily: 'Rubik, sans-serif' } : undefined}
          >
            Sponsored by
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium" style={donorCheckout ? { color: '#333' } : undefined}>
              {existingSlot.profiles.name}
            </p>
            <p className="text-sm" style={donorCheckout ? { color: '#666' } : undefined}>
              {existingSlot.profiles.email}
            </p>
            {existingSlot.profiles.phone && (
              <p className="text-sm" style={donorCheckout ? { color: '#666' } : undefined}>
                {existingSlot.profiles.phone}
              </p>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
            <>
              {!existingSlot ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note">Note (optional)</Label>
                    <Textarea
                      id="note"
                      placeholder="e.g., Birthday celebration, General Annadhanam..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxSponsors">Max Sponsors Allowed</Label>
                    <Input
                      id="maxSponsors"
                      type="number"
                      min={1}
                      max={10}
                      value={maxSponsors}
                      onChange={(e) => setMaxSponsors(parseInt(e.target.value) || 1)}
                      className="mt-1.5"
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Food Requirement
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note">Note</Label>
                    <Textarea
                      id="note"
                      placeholder="e.g., Birthday celebration, General Annadhanam..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxSponsors">Max Sponsors Allowed</Label>
                    <Input
                      id="maxSponsors"
                      type="number"
                      min={1}
                      max={10}
                      value={maxSponsors}
                      onChange={(e) => setMaxSponsors(parseInt(e.target.value) || 1)}
                      className="mt-1.5"
                    />
                  </div>
                  {slotBooked && (
                    <StaffFoodSlotConfirm
                      slotId={existingSlot.id}
                      amount={existingSlot.amount ?? undefined}
                      onConfirmed={() => onOpenChange(false)}
                    />
                  )}
                  {slotOpen && cellRequests.map((req) => (
                    <div key={req.id} className="rounded-lg border p-3 space-y-2 text-sm">
                      <p className="font-medium">Pending request — {req.donor_name || 'Donor'}</p>
                      <p className="text-muted-foreground">₹{req.amount}{req.notes ? ` · ${req.notes}` : ''}</p>
                      <StaffFoodSlotConfirm
                        requestId={req.id}
                        amount={req.amount}
                        onConfirmed={() => onOpenChange(false)}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    {slotOpen && (
                      <Button onClick={handleUpdate} disabled={isLoading} className="flex-1">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Note
                      </Button>
                    )}
                    {slotOpen && (
                      <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Donor portal checkout (OTP + manual payment) — guests can verify via OTP */}
          {donorCheckout && slotOpen && (
            <DonorFoodSlotCheckout
              date={date}
              timeSlot={timeSlot}
              existingSlot={existingSlot}
              homeId={homeId}
              trustId={trustId}
              homeName={homeName}
              slotLabel={slotDisplayLabel}
              donorId={user?.id}
              onFinished={() => onOpenChange(false)}
              onRazorpayPay={onRazorpayFoodPayment}
              razorpayProcessing={razorpayProcessing}
              homeSlots={homeSlots}
            />
          )}

          {donorCheckout && slotBooked && (
            <p className="text-sm text-center py-4" style={{ color: '#666' }}>
              This slot has been booked.
            </p>
          )}

          {/* Staff / app portal donor actions */}
          {!donorCheckout && isDonor && (
            <div className="space-y-4">
              {existingSlot?.note && (
                <div>
                  <span className="text-sm font-medium">Note:</span>
                  <p className="text-sm text-muted-foreground mt-1">{existingSlot.note}</p>
                </div>
              )}

              {(!existingSlot || existingSlot.status === 'NEED') && (
                <div className="text-center space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">This slot is open for sponsorship.</p>
                  {existingSlot ? (
                    <Button onClick={handleSponsor} disabled={isLoading} className="w-full">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sponsor this Slot
                    </Button>
                  ) : (
                    <Button onClick={handleSponsorNewSlot} disabled={isLoading} className="w-full">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sponsor this Slot
                    </Button>
                  )}
                </div>
              )}

              {existingSlot?.status === 'BOOKED' && existingSlot.donor_id === user?.id && (
                <Button onClick={handleCompletePayment} disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Payment
                </Button>
              )}

              {existingSlot?.status === 'PAID' && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  This slot has been fully sponsored and paid.
                </p>
              )}
            </div>
          )}

          {/* Guest — non-donor portal */}
          {!user && !donorCheckout && (
            <div className="text-center space-y-4 py-6">
              {existingSlot?.status === 'PAID' ? (
                <p className="text-sm text-muted-foreground">
                  This slot has been fully sponsored and paid.
                </p>
              ) : existingSlot?.status === 'BOOKED' ? (
                <p className="text-sm text-muted-foreground">
                  This slot has been booked and is awaiting payment confirmation.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This slot is open for sponsorship. Please sign in to sponsor this meal.
                </p>
              )}
            </div>
          )}

          {/* Non-donor logged-in users viewing slots without admin rights */}
          {user && !isAdmin && !isDonor && (
            <p
              className={cn('text-sm text-center py-4', !donorCheckout && 'text-muted-foreground')}
              style={donorCheckout ? { color: '#666' } : undefined}
            >
              {existingSlot
                ? `This slot is ${existingSlot.status === 'PAID' ? 'fully sponsored' : existingSlot.status === 'BOOKED' ? 'booked' : 'open for sponsorship'}.`
                : 'No food requirement has been created for this slot yet.'}
            </p>
          )}
    </div>
  );

  if (donorCheckout) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="portal-donor donor-food-slot-dialog sm:max-w-lg max-h-[min(90vh,720px)] overflow-y-auto gap-0 p-0 border-0">
          <div className="p-6 pt-8">
            <DialogHeader className="text-center sm:text-center space-y-2 pb-5 border-b border-[#e6e6e6]">
              <DialogTitle className="donor-section-title text-xl flex items-center justify-center gap-2">
                <span style={{ color: '#ff6633' }}>{slotLabels[timeSlot].icon}</span>
                {slotDisplayLabel}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm" style={{ color: '#666' }}>
                  <p>{format(date, 'EEEE, MMMM d, yyyy')} · {homeName}</p>
                  {slotOpen && (
                    <div>
                      <p className="text-xs uppercase tracking-wide" style={{ color: '#999' }}>
                        Amount to pay
                      </p>
                      <p
                        className="text-2xl font-semibold"
                        style={{ fontFamily: 'Rubik, sans-serif', color: '#333' }}
                      >
                        {formatCurrency(slotAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            {panelBody}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {slotLabels[timeSlot].icon}
            {slotDisplayLabel} Slot
          </SheetTitle>
          <SheetDescription>
            {format(date, 'EEEE, MMMM d, yyyy')} • {homeName}
          </SheetDescription>
        </SheetHeader>
        {panelBody}
      </SheetContent>
    </Sheet>
  );
}
