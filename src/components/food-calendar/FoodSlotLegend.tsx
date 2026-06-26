import { cn } from '@/lib/utils';

const legendItems = [
  { status: 'NEED', label: 'Open for Sponsorship', color: 'bg-muted border border-dashed border-border' },
  { status: 'BOOKED', label: 'Booked (Unpaid)', color: 'bg-warning' },
  { status: 'PAID', label: 'Paid (Confirmed)', color: 'bg-destructive' },
];

interface FoodSlotLegendProps {
  className?: string;
}

export function FoodSlotLegend({ className }: FoodSlotLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {legendItems.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <div className={cn('w-4 h-4 rounded', item.color)} />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
