import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sun, CloudSun, Moon, Coffee, Trash2, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FoodSlot,
  FoodSlotWithDonor,
  FoodTimeSlot,
  FoodSlotStatus,
  useCreateFoodSlot,
  useUpdateFoodSlot,
  useDeleteFoodSlot,
  useSponsorFoodSlot,
  useCompleteFoodSlotPayment,
} from '@/hooks/useFoodSlots';

interface FoodSlotDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  timeSlot: FoodTimeSlot | null;
  existingSlot: FoodSlotWithDonor | null;
  homeId: string;
  trustId: string;
  homeName: string;
}

const slotLabels: Record<FoodTimeSlot, { label: string; icon: React.ReactNode }> = {
  MORNING: { label: 'Breakfast', icon: <Sun className="h-4 w-4" /> },
  AFTERNOON: { label: 'Lunch', icon: <CloudSun className="h-4 w-4" /> },
  EVENING: { label: 'Dinner', icon: <Moon className="h-4 w-4" /> },
  REFRESHMENTS: { label: 'Refreshments', icon: <Coffee className="h-4 w-4" /> },
};

const statusLabels: Record<FoodSlotStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NEED: { label: 'Open for Sponsorship', variant: 'secondary' },
  BOOKED: { label: 'Booked (Unpaid)', variant: 'default' },
  PAID: { label: 'Paid & Confirmed', variant: 'destructive' },
};

export function FoodSlotDetailPanel({
  open,
  onOpenChange,
  date,
  timeSlot,
  existingSlot,
  homeId,
  trustId,
  homeName,
}: FoodSlotDetailPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'warden';
  const isDonor = user?.role === 'donor';

  const [note, setNote] = useState(existingSlot?.note || '');
  const [status, setStatus] = useState<FoodSlotStatus>(existingSlot?.status || 'NEED');
  const [maxSponsors, setMaxSponsors] = useState(existingSlot?.max_sponsors_allowed || 1);
  const [isSponsorLoading, setIsSponsorLoading] = useState(false);

  const createSlot = useCreateFoodSlot();
  const updateSlot = useUpdateFoodSlot();
  const deleteSlot = useDeleteFoodSlot();
  const sponsorSlot = useSponsorFoodSlot();
  const completePayment = useCompleteFoodSlotPayment();

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
    if (existingSlot.status === 'PAID') {
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
          message: `A ${slotLabels[timeSlot].label} food slot on ${format(date, 'yyyy-MM-dd')} at ${homeName} has been booked without payment. Please track the expected payment.`,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {slotLabels[timeSlot].icon}
            {slotLabels[timeSlot].label} Slot
          </SheetTitle>
          <SheetDescription>
            {format(date, 'EEEE, MMMM d, yyyy')} • {homeName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badge */}
          {existingSlot && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={statusLabels[existingSlot.status].variant}>
                {statusLabels[existingSlot.status].label}
              </Badge>
            </div>
          )}

          {/* Donor Details */}
          {existingSlot?.profiles && (existingSlot.status === 'BOOKED' || existingSlot.status === 'PAID') && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <span className="text-sm font-semibold text-foreground">Sponsored by</span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{existingSlot.profiles.name}</p>
                <p className="text-sm text-muted-foreground">{existingSlot.profiles.email}</p>
                {existingSlot.profiles.phone && (
                  <p className="text-sm text-muted-foreground">{existingSlot.profiles.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Admin/Social Worker Form */}
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as FoodSlotStatus)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEED">Open for Sponsorship</SelectItem>
                        <SelectItem value="BOOKED">Booked (Unpaid)</SelectItem>
                        <SelectItem value="PAID">Paid & Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={isLoading} className="flex-1">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    {existingSlot.status !== 'PAID' && (
                      <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Donor Actions */}
          {isDonor && (
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

          {/* Guest (not logged in) - Prompt login */}
          {!user && (
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
                <>
                  <p className="text-sm text-muted-foreground">
                    This slot is open for sponsorship. Please login to sponsor this meal.
                  </p>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/login', { state: { from: window.location.pathname } });
                    }}
                    className="w-full"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Sponsor
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Non-donor logged-in users viewing slots without admin rights */}
          {user && !isAdmin && !isDonor && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {existingSlot ? `This slot is ${existingSlot.status === 'PAID' ? 'fully sponsored' : existingSlot.status === 'BOOKED' ? 'booked' : 'open for sponsorship'}.` : 'No food requirement has been created for this slot yet.'}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
