import { cn } from '@/lib/utils';
import { Sun, CloudSun, Moon, Coffee, Utensils } from 'lucide-react';
import { FoodTimeSlot, FoodSlotWithDonor } from '@/hooks/useFoodSlots';
import {
  getDonorDisplayStatus,
  getStaffDisplayStatus,
  staffDisplayLabel,
  DonorSlotDisplay,
  StaffSlotDisplay,
} from '@/lib/foodSlotUtils';
import { isMscBrandedPortal } from '@/lib/portal';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface FoodSlotBadgeProps {
  timeSlot: FoodTimeSlot;
  onClick?: () => void;
  compact?: boolean;
  slotData?: FoodSlotWithDonor;
}

const donorStyles: Record<DonorSlotDisplay, string> = {
  OPEN: 'donor-food-slot-badge donor-food-slot-badge-need',
  BOOKED: 'donor-food-slot-badge donor-food-slot-badge-paid',
};

const staffStyles: Record<StaffSlotDisplay, string> = {
  OPEN: 'bg-muted text-muted-foreground border border-dashed border-border',
  BOOKED_FULLY_PAID: 'bg-destructive text-destructive-foreground',
  BOOKED_PARTIALLY_PAID: 'bg-warning text-warning-foreground',
  BOOKED_FULLY_PENDING: 'bg-amber-500 text-white',
};

const slotLabels: Record<FoodTimeSlot, string> = {
  MORNING: 'BF',
  AFTERNOON: 'Lun',
  EVENING: 'Din',
  REFRESHMENTS: 'Ref',
  OUTSIDE_FOOD: 'Out',
};

const slotIcons: Record<FoodTimeSlot, React.ReactNode> = {
  MORNING: <Sun className="h-3 w-3" />,
  AFTERNOON: <CloudSun className="h-3 w-3" />,
  EVENING: <Moon className="h-3 w-3" />,
  REFRESHMENTS: <Coffee className="h-3 w-3" />,
  OUTSIDE_FOOD: <Utensils className="h-3 w-3" />,
};

const timeSlotFullLabels: Record<FoodTimeSlot, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

export function FoodSlotBadge({ timeSlot, onClick, compact = false, slotData }: FoodSlotBadgeProps) {
  const useDonorStyles = isMscBrandedPortal();
  const donorDisplay = getDonorDisplayStatus(slotData);
  const staffDisplay = getStaffDisplayStatus(slotData);
  const isBooked = donorDisplay === 'BOOKED';

  const badge = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md font-medium transition-all duration-200',
        'hover:scale-105 hover:shadow-sm cursor-pointer',
        useDonorStyles ? donorStyles[donorDisplay] : staffStyles[staffDisplay],
        compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs',
      )}
    >
      {!compact && slotIcons[timeSlot]}
      <span>{slotLabels[timeSlot]}</span>
    </button>
  );

  if (isBooked && slotData) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
        <HoverCardContent className="w-64 text-sm" side="top">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{timeSlotFullLabels[timeSlot]}</span>
              <Badge variant="secondary" className="text-xs">
                {useDonorStyles ? 'Booked' : staffDisplayLabel(staffDisplay)}
              </Badge>
            </div>
            {slotData.profiles?.name && (
              <p><span className="text-muted-foreground">Donor:</span> {slotData.profiles.name}</p>
            )}
            {slotData.profiles?.email && (
              <p><span className="text-muted-foreground">Email:</span> {slotData.profiles.email}</p>
            )}
            {slotData.profiles?.phone && (
              <p><span className="text-muted-foreground">Phone:</span> {slotData.profiles.phone}</p>
            )}
            {slotData.amount != null && slotData.amount > 0 && (
              <p><span className="text-muted-foreground">Amount:</span> ₹{slotData.amount.toLocaleString()}</p>
            )}
            {!useDonorStyles && slotData.amount_paid != null && slotData.amount_paid > 0 && (
              <p><span className="text-muted-foreground">Paid:</span> ₹{slotData.amount_paid.toLocaleString()}</p>
            )}
            {!useDonorStyles && slotData.payment_mode && (
              <p><span className="text-muted-foreground">Mode:</span> {slotData.payment_mode}</p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
