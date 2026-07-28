import { cn } from '@/lib/utils';
import { isMscBrandedPortal } from '@/lib/portal';

const donorLegend = [
  { label: 'Open', color: 'donor-legend-swatch-need' },
  { label: 'Booked', color: 'donor-legend-swatch-paid' },
];

const staffLegend = [
  { label: 'Open', color: 'bg-muted border border-dashed border-border' },
  { label: 'Paid Fully', color: 'bg-destructive' },
  { label: 'Partially Pending', color: 'bg-warning' },
  { label: 'Fully Pending', color: 'bg-amber-500' },
];

interface FoodSlotLegendProps {
  className?: string;
}

export function FoodSlotLegend({ className }: FoodSlotLegendProps) {
  const useDonorStyles = isMscBrandedPortal();
  const items = useDonorStyles ? donorLegend : staffLegend;

  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={cn('w-4 h-4 rounded', item.color)} />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
