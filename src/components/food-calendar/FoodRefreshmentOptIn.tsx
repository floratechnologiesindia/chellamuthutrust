import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IndianRupee } from 'lucide-react';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import { refreshmentOptInLabel } from '@/lib/foodRefreshmentOptIn';

interface FoodRefreshmentOptInProps {
  timeSlot: FoodTimeSlot;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  price: number;
  disabled?: boolean;
  idPrefix?: string;
}

export function FoodRefreshmentOptIn({
  timeSlot,
  checked,
  onCheckedChange,
  price,
  disabled = false,
  idPrefix = 'refreshment',
}: FoodRefreshmentOptInProps) {
  const label = refreshmentOptInLabel(timeSlot);
  if (!label) return null;

  const inputId = `${idPrefix}-refreshment-opt-in`;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 bg-muted/20">
      <Checkbox
        id={inputId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="space-y-1">
        <Label htmlFor={inputId} className="font-medium cursor-pointer leading-snug">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <IndianRupee className="h-3.5 w-3.5" />
          {price.toLocaleString('en-IN')} added to your sponsorship total
        </p>
        {disabled && (
          <p className="text-xs text-muted-foreground">
            Refreshments for this meal are already booked on this date.
          </p>
        )}
      </div>
    </div>
  );
}
