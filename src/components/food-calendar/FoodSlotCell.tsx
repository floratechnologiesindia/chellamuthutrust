import { FOOD_TIME_SLOTS, type FoodTimeSlot } from '@/lib/foodSlotConstants';
import { FoodSlotBadge } from './FoodSlotBadge';
import { FoodSlot, FoodTimeSlot, FoodSlotStatus, FoodSlotWithDonor } from '@/hooks/useFoodSlots';
import { pickFoodSlotForTimeSlot, normalizeFoodSlotStatus } from '@/lib/foodSlotUtils';
import { cn } from '@/lib/utils';

interface FoodSlotCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast?: boolean;
  slots: (FoodSlot | FoodSlotWithDonor)[];
  onSlotClick: (date: Date, timeSlot: FoodTimeSlot, existingSlot?: FoodSlot) => void;
  compact?: boolean;
  /** Defaults to all meal columns; donor/staff views pass a filtered list. */
  visibleTimeSlots?: FoodTimeSlot[];
}

export function FoodSlotCell({
  date,
  isCurrentMonth,
  isToday,
  isPast = false,
  slots,
  onSlotClick,
  compact = false,
  visibleTimeSlots = FOOD_TIME_SLOTS,
}: FoodSlotCellProps) {
  const getSlotStatus = (timeSlot: FoodTimeSlot): { status: FoodSlotStatus | 'EMPTY'; slot?: FoodSlot | FoodSlotWithDonor } => {
    const slot = pickFoodSlotForTimeSlot(slots, timeSlot);
    return slot
      ? { status: normalizeFoodSlotStatus(slot.status), slot: { ...slot, status: normalizeFoodSlotStatus(slot.status) } }
      : { status: 'EMPTY' };
  };

  return (
    <div
      className={cn(
        'min-h-[100px] border border-border p-2 transition-colors',
        isCurrentMonth ? 'bg-card' : 'bg-muted/30',
        isToday && 'ring-2 ring-primary ring-inset',
        isPast && 'opacity-50 pointer-events-none',
        compact && 'min-h-[80px] p-1'
      )}
    >
      <div className={cn('font-medium mb-2', !isCurrentMonth && 'text-muted-foreground', compact && 'text-sm mb-1')}>
        {date.getDate()}
      </div>
      <div className={cn('flex flex-col gap-1', compact && 'gap-0.5')}>
        {visibleTimeSlots.map((timeSlot) => {
          const { slot } = getSlotStatus(timeSlot);
          return (
            <FoodSlotBadge
              key={timeSlot}
              timeSlot={timeSlot}
              compact={compact}
              slotData={slot as FoodSlotWithDonor | undefined}
              onClick={() => onSlotClick(date, timeSlot, slot)}
            />
          );
        })}
      </div>
    </div>
  );
}
