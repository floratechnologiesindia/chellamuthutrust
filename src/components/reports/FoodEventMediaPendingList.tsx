import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { usePendingFoodEventMedia, type PendingFoodEventMedia } from '@/hooks/useFoodEventMedia';
import { FoodEventMediaReviewDialog } from '@/components/food-calendar/FoodEventMediaReviewDialog';
import { formatFoodSlotLabel } from '@/lib/foodSlotConstants';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';

export function FoodEventMediaPendingList() {
  const { data: items = [], isLoading } = usePendingFoodEventMedia();
  const [reviewItem, setReviewItem] = useState<PendingFoodEventMedia | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Food event media — pending review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!items.length) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-orange-600" />
            Food event media — pending review ({items.length})
          </CardTitle>
          <CardDescription>
            Social workers submitted photos/videos. Review, approve, and send to donors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const label = formatFoodSlotLabel(item.time_slot as FoodTimeSlot, item.meal_type);
            const mediaCount =
              (item.completion_photos?.length || 0) + (item.completion_videos?.length || 0);
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-medium truncate">
                    {item.home_name} · {format(new Date(`${item.date}T12:00:00`), 'dd MMM yyyy')} · {label}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.donor_name || 'Donor'} · {mediaCount} file(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Awaiting review</Badge>
                  <Button type="button" size="sm" onClick={() => setReviewItem(item)}>
                    Review <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <FoodEventMediaReviewDialog
        open={Boolean(reviewItem)}
        onOpenChange={(open) => {
          if (!open) setReviewItem(null);
        }}
        item={reviewItem}
      />
    </>
  );
}
