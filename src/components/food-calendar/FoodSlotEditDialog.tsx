import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2, Save, Plus, IndianRupee, User, Calendar, FileText } from 'lucide-react';
import {
  useCreateFoodSlot,
  useUpdateFoodSlot,
  useDeleteFoodSlot,
  FoodTimeSlot,
  FoodSlotStatus,
  FoodSlot,
} from '@/hooks/useFoodSlots';
import { useFoodSlotPricingMap } from '@/hooks/useFoodSlotPricing';
import { useDonors } from '@/hooks/useDonors';
import { FOOD_TIME_SLOT_LABELS } from '@/lib/foodSlotConstants';
import { normalizePaymentStatus } from '@/lib/foodSlotUtils';
import { useMarkChequePaid } from '@/hooks/useWardenOps';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { toast } from 'sonner';

const TIME_SLOT_LABELS = FOOD_TIME_SLOT_LABELS;

const STATUS_OPTIONS: { value: FoodSlotStatus; label: string; color: string }[] = [
  { value: 'NEED', label: 'Available', color: 'bg-success text-success-foreground' },
  { value: 'BOOKED', label: 'Booked (Unpaid)', color: 'bg-warning text-warning-foreground' },
  { value: 'PAID', label: 'Paid (Confirmed)', color: 'bg-destructive text-destructive-foreground' },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  YET_TO_PAY: 'Yet to Pay',
  PREPAID: 'Prepaid',
};

interface FoodSlotEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  timeSlot: FoodTimeSlot;
  homeId: string;
  homeName: string;
  trustId: string;
  existingSlot: FoodSlot | null;
}

export function FoodSlotEditDialog({
  open,
  onOpenChange,
  date,
  timeSlot,
  homeId,
  homeName,
  trustId,
  existingSlot,
}: FoodSlotEditDialogProps) {
  const [status, setStatus] = useState<FoodSlotStatus>('NEED');
  const [note, setNote] = useState('');
  const [maxSponsors, setMaxSponsors] = useState(1);

  const createSlot = useCreateFoodSlot();
  const updateSlot = useUpdateFoodSlot();
  const deleteSlot = useDeleteFoodSlot();
  const { priceMap } = useFoodSlotPricingMap();
  const { data: donors = [] } = useDonors();
  const markChequePaid = useMarkChequePaid();

  const isLoading = createSlot.isPending || updateSlot.isPending || deleteSlot.isPending;
  const isEditing = !!existingSlot;
  const isBooked = existingSlot?.status === 'BOOKED' || existingSlot?.status === 'PAID';
  
  const slotPrice = priceMap[timeSlot] ?? 0;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get donor name from donor_id
  const donorName = useMemo(() => {
    if (!existingSlot?.donor_id) return null;
    const donor = donors.find(d => d.id === existingSlot.donor_id);
    return donor?.name || 'Unknown Donor';
  }, [existingSlot?.donor_id, donors]);

  useEffect(() => {
    if (existingSlot) {
      setStatus(existingSlot.status);
      setNote(existingSlot.note || '');
      setMaxSponsors(existingSlot.max_sponsors_allowed || 1);
    } else {
      setStatus('NEED');
      setNote('');
      setMaxSponsors(1);
    }
  }, [existingSlot, open]);

  const handleCreate = async () => {
    await createSlot.mutateAsync({
      home_id: homeId,
      trust_id: trustId,
      date,
      time_slot: timeSlot,
      note: note || undefined,
      max_sponsors_allowed: maxSponsors,
    });
    onOpenChange(false);
  };

  const handleUpdate = async () => {
    if (!existingSlot) return;
    await updateSlot.mutateAsync({
      id: existingSlot.id,
      status,
      note: note || undefined,
      max_sponsors_allowed: maxSponsors,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!existingSlot) return;
    await deleteSlot.mutateAsync(existingSlot.id);
    onOpenChange(false);
  };

  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (isBooked ? 'Booking Details' : 'Edit Food Slot') : 'Create Food Slot'}
          </DialogTitle>
          <DialogDescription>
            {TIME_SLOT_LABELS[timeSlot]}
            {timeSlot === 'OUTSIDE_FOOD' && existingSlot?.meal_type
              ? ` (${existingSlot.meal_type})`
              : ''}{' '}
            at {homeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date and Price display */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-sm">
              {formattedDate}
            </Badge>
            {slotPrice > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 text-sm font-semibold">
                <IndianRupee className="h-3 w-3" />
                {formatCurrency(slotPrice)}
              </Badge>
            )}
          </div>

          {/* Booking Details - Show when slot is booked */}
          {isBooked && existingSlot && (
            <>
              <Separator />
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Booking Information
                </h4>

                {/* Sponsor */}
                {donorName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Food Sponsor</Label>
                      <p className="font-medium">{donorName}</p>
                    </div>
                  </div>
                )}

                {/* Donate on behalf of */}
                {existingSlot.donate_on_behalf_of && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Person Name</Label>
                      <p className="font-medium">{existingSlot.donate_on_behalf_of}</p>
                    </div>
                  </div>
                )}

                {/* Occasion/Sponsor For */}
                {existingSlot.sponsor_for && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Occasion</Label>
                      <p className="font-medium">{existingSlot.sponsor_for}</p>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {existingSlot.reason && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Purpose</Label>
                    <p className="text-sm mt-1">{existingSlot.reason}</p>
                  </div>
                )}

                {/* Amount */}
                {existingSlot.amount && existingSlot.amount > 0 && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="font-medium">{formatCurrency(existingSlot.amount)}</p>
                    </div>
                  </div>
                )}

                {existingSlot.payment_mode && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Mode</Label>
                    <p className="font-medium mt-1">{existingSlot.payment_mode}</p>
                  </div>
                )}

                {existingSlot.amount_paid != null && existingSlot.amount_paid > 0 && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount Received</Label>
                      <p className="font-medium">{formatCurrency(existingSlot.amount_paid)}</p>
                    </div>
                  </div>
                )}

                {existingSlot.cheque_number && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cheque Number</Label>
                    <p className="font-medium mt-1">{existingSlot.cheque_number}</p>
                  </div>
                )}

                {existingSlot.bank_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank Name</Label>
                    <p className="font-medium mt-1">{existingSlot.bank_name}</p>
                  </div>
                )}

                {existingSlot.cheque_image_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Cheque Image</Label>
                    <a
                      href={normalizeMediaUrl(existingSlot.cheque_image_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline mt-1 inline-block"
                    >
                      View attachment
                    </a>
                  </div>
                )}

                {String(existingSlot.payment_mode).toLowerCase() === 'cheque' &&
                  normalizePaymentStatus(existingSlot.payment_status, existingSlot.status) !== 'FULLY_PAID' && (
                    <Button
                      type="button"
                      className="w-full"
                      disabled={markChequePaid.isPending}
                      onClick={() =>
                        markChequePaid.mutate(existingSlot.id, {
                          onSuccess: () => toast.success('Cheque marked as paid'),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      {markChequePaid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Mark Cheque as Paid
                    </Button>
                  )}

                {/* Payment Status */}
                {existingSlot.payment_status && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Status</Label>
                    <Badge 
                      variant={existingSlot.payment_status === 'PAID' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {PAYMENT_STATUS_LABELS[existingSlot.payment_status] || existingSlot.payment_status}
                    </Badge>
                  </div>
                )}

                {/* Notes */}
                {existingSlot.note && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1 text-muted-foreground">{existingSlot.note}</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Status selection - only show when editing */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup
                value={status}
                onValueChange={(value) => setStatus(value as FoodSlotStatus)}
                className="flex flex-col gap-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Badge className={option.color}>{option.label}</Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Max sponsors - show when not booked or when editing */}
          {(!isBooked || !isEditing) && (
            <div className="space-y-2">
              <Label htmlFor="maxSponsors">Max Sponsors Allowed</Label>
              <Input
                id="maxSponsors"
                type="number"
                min={1}
                max={10}
                value={maxSponsors}
                onChange={(e) => setMaxSponsors(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          {/* Note - editable */}
          <div className="space-y-2">
            <Label htmlFor="note">Admin Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this slot..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="sm:mr-auto"
            >
              {deleteSlot.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={isEditing ? handleUpdate : handleCreate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : isEditing ? (
              <Save className="h-4 w-4 mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}