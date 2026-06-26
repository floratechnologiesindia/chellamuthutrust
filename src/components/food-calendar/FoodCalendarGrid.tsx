import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  format,
} from 'date-fns';
import { FoodSlotCell } from './FoodSlotCell';
import { FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';

interface FoodCalendarGridProps {
  currentDate: Date;
  slots: FoodSlot[];
  onSlotClick: (date: Date, timeSlot: FoodTimeSlot, existingSlot?: FoodSlot) => void;
  compact?: boolean;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function FoodCalendarGrid({ currentDate, slots, onSlotClick, compact = false }: FoodCalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();
  const todayStart = startOfDay(today);

  const getSlotsForDate = (date: Date): FoodSlot[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter((slot) => slot.date === dateStr);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden w-full">
      {/* Week day headers */}
      <div className="grid grid-cols-7 bg-muted w-full">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground border-b border-border">
            {compact ? day.charAt(0) : day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 w-full">
        {days.map((day) => (
          <FoodSlotCell
            key={day.toISOString()}
            date={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            isToday={isSameDay(day, today)}
            isPast={isBefore(day, todayStart)}
            slots={getSlotsForDate(day)}
            onSlotClick={onSlotClick}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
