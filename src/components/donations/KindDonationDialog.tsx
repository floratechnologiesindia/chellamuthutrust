import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, Loader2, Truck, Building, MapPin } from 'lucide-react';
import { useCreateKindDonation } from '@/hooks/useKindDonations';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface KindDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needId: string;
  trustId: string;
  homeId: string;
  productName: string;
  productUnit: string;
  remainingQty: number;
  donorId: string;
  onSuccess?: () => void;
}

type DeliveryMode = 'SELF_DELIVERY' | 'COURIER' | 'TRUST_PICKUP';

export const KindDonationDialog = ({
  open,
  onOpenChange,
  needId,
  trustId,
  homeId,
  productName,
  productUnit,
  remainingQty,
  donorId,
  onSuccess,
}: KindDonationDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('SELF_DELIVERY');
  const [notes, setNotes] = useState('');

  const createKindDonation = useCreateKindDonation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity < 1 || quantity > remainingQty) {
      toast.error(`Please enter a quantity between 1 and ${remainingQty}`);
      return;
    }

    try {
      await createKindDonation.mutateAsync({
        need_id: needId,
        trust_id: trustId,
        home_id: homeId,
        donor_id: donorId,
        item_type: productName,
        quantity,
        delivery_mode: deliveryMode,
        received_date: format(new Date(), 'yyyy-MM-dd'),
        notes: notes || null,
        status: 'PLEDGED',
      });

      toast.success('Thank you for your pledge!', {
        description: `You pledged to provide ${quantity} ${productUnit} of ${productName}`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to submit pledge');
      console.error(error);
    }
  };

  const deliveryOptions = [
    { value: 'SELF_DELIVERY', label: 'Self Delivery', icon: MapPin, description: 'I will deliver to the home myself' },
    { value: 'COURIER', label: 'Courier/Shipping', icon: Truck, description: 'I will ship/courier the items' },
    { value: 'TRUST_PICKUP', label: 'Trust Pickup', icon: Building, description: 'Trust will pick up from my location' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Provide Items
          </DialogTitle>
          <DialogDescription>
            Pledge to provide {productName} to help fulfill this need.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">How many {productUnit} will you provide?</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={remainingQty}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-32"
              />
              <span className="text-muted-foreground">of {remainingQty} {productUnit} remaining</span>
            </div>
          </div>

          {/* Delivery Mode */}
          <div className="space-y-3">
            <Label>How will you deliver?</Label>
            <RadioGroup 
              value={deliveryMode} 
              onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
              className="space-y-2"
            >
              {deliveryOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Expected delivery date, special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createKindDonation.isPending}>
              {createKindDonation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Confirm Pledge
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
