import { cn } from '@/lib/utils';
import { Sun, CloudSun, Moon, Coffee } from 'lucide-react';
import { FoodTimeSlot, FoodSlotStatus, FoodSlotWithDonor } from '@/hooks/useFoodSlots';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface FoodSlotBadgeProps {
  timeSlot: FoodTimeSlot;
  status: FoodSlotStatus | 'EMPTY';
  onClick?: () => void;
  compact?: boolean;
  slotData?: FoodSlotWithDonor;
}

const statusStyles = {
  EMPTY: 'bg-muted text-muted-foreground border border-dashed border-border',
  NEED: 'bg-muted text-muted-foreground border border-dashed border-border',
  BOOKED: 'bg-warning text-warning-foreground',
  PAID: 'bg-destructive text-destructive-foreground',
};

const slotLabels: Record<FoodTimeSlot, string> = {
  MORNING: 'BF',
  AFTERNOON: 'Lun',
  EVENING: 'Din',
  REFRESHMENTS: 'Ref',
};

const slotIcons: Record<FoodTimeSlot, React.ReactNode> = {
  MORNING: <Sun className="h-3 w-3" />,
  AFTERNOON: <CloudSun className="h-3 w-3" />,
  EVENING: <Moon className="h-3 w-3" />,
  REFRESHMENTS: <Coffee className="h-3 w-3" />,
};

const timeSlotFullLabels: Record<FoodTimeSlot, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
};

export function FoodSlotBadge({ timeSlot, status, onClick, compact = false, slotData }: FoodSlotBadgeProps) {
  const badge = (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md font-medium transition-all duration-200',
        'hover:scale-105 hover:shadow-sm cursor-pointer',
        statusStyles[status],
        compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
      )}
    >
      {!compact && slotIcons[timeSlot]}
      <span>{slotLabels[timeSlot]}</span>
    </button>
  );

  // Only show hover card for BOOKED or PAID slots with data
  if ((status === 'BOOKED' || status === 'PAID') && slotData) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          {badge}
        </HoverCardTrigger>
        <HoverCardContent className="w-64 text-sm" side="top">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{timeSlotFullLabels[timeSlot]}</span>
              <Badge variant={status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                {status}
              </Badge>
            </div>
            {slotData.profiles?.name && (
              <p><span className="text-muted-foreground">Donor:</span> {slotData.profiles.name}</p>
            )}
            {slotData.donate_on_behalf_of && (
              <p><span className="text-muted-foreground">On behalf of:</span> {slotData.donate_on_behalf_of}</p>
            )}
            {slotData.sponsor_for && (
              <p><span className="text-muted-foreground">For:</span> {slotData.sponsor_for}</p>
            )}
            {slotData.reason && (
              <p><span className="text-muted-foreground">Reason:</span> {slotData.reason}</p>
            )}
            {slotData.amount != null && slotData.amount > 0 && (
              <p><span className="text-muted-foreground">Amount:</span> ₹{slotData.amount.toLocaleString()}</p>
            )}
            {slotData.payment_status && (
              <p><span className="text-muted-foreground">Payment:</span> {slotData.payment_status === 'YET_TO_PAY' ? 'Yet to Pay' : slotData.payment_status}</p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return badge;
}
