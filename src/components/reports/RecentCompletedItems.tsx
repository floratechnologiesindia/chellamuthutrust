import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UtensilsCrossed, 
  Package, 
  Heart, 
  CheckCircle2,
  Camera,
  FileText,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import type { 
  CompletedFoodSlot, 
  ReceivedKindDonation, 
  CompletedNeed,
  CompletedTask 
} from '@/hooks/useHomeWorkDone';

interface RecentCompletedItemsProps {
  foodSlots: CompletedFoodSlot[];
  kindDonations: ReceivedKindDonation[];
  completedNeeds: CompletedNeed[];
  completedTasks: CompletedTask[];
  isLoading?: boolean;
  selectedItemIds?: Set<string>;
  onToggleItem?: (id: string, item: CompletedItemData) => void;
  onSendToDonor?: () => void;
}

export type CompletedItemData = {
  id: string;
  type: 'food_slot' | 'kind_donation' | 'need' | 'task';
  title: string;
  subtitle: string;
  date: Date;
  value?: number;
  home: string;
  notes?: string | null;
  hasPhotos?: boolean;
  donorId?: string | null;
  donorName?: string;
  photos?: string[];
  reportSentAt?: string | null;
};

export function RecentCompletedItems({
  foodSlots,
  kindDonations,
  completedNeeds,
  completedTasks,
  isLoading,
  selectedItemIds,
  onToggleItem,
  onSendToDonor,
}: RecentCompletedItemsProps) {
  const selectable = !!onToggleItem;

  // Combine and sort all items by date
  const allItems: CompletedItemData[] = [
    ...foodSlots.map(slot => ({
      id: slot.id,
      type: 'food_slot' as const,
      title: `${slot.time_slot} Food`,
      subtitle: slot.donor_name || 'Anonymous',
      date: new Date(slot.completed_at || slot.date),
      value: slot.amount || undefined,
      home: slot.home_name,
      notes: slot.completion_notes,
      hasPhotos: (slot.completion_photos?.length || 0) > 0,
      donorId: slot.donor_id || null,
      donorName: slot.donor_name || 'Anonymous',
      photos: slot.completion_photos || [],
      reportSentAt: slot.report_sent_at,
    })),
    ...kindDonations.map(donation => ({
      id: donation.id,
      type: 'kind_donation' as const,
      title: donation.item_type,
      subtitle: `${donation.donor_name || 'Anonymous'}${donation.quantity ? ` • ${donation.quantity} items` : ''}`,
      date: new Date(donation.received_date),
      value: donation.estimated_value || undefined,
      home: donation.home_name,
      notes: donation.completion_notes,
      hasPhotos: (donation.completion_photos?.length || 0) > 0,
      donorId: donation.donor_id || null,
      donorName: donation.donor_name || 'Anonymous',
      photos: donation.completion_photos || [],
      reportSentAt: donation.report_sent_at,
    })),
    ...completedNeeds.map(need => ({
      id: need.id,
      type: 'need' as const,
      title: need.category_label || 'Need',
      subtitle: need.description || 'Completed need',
      date: new Date(need.date),
      value: need.collected_amount || undefined,
      home: need.home_name,
      notes: need.fulfillment_details,
      hasPhotos: false,
      donorId: null,
      donorName: 'Various',
      photos: [],
      reportSentAt: need.report_sent_at,
    })),
    ...completedTasks.map(task => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      subtitle: task.assignee_name || 'Staff',
      date: new Date(task.completed_at || new Date()),
      home: task.home_name || 'General',
      notes: null,
      hasPhotos: false,
      donorId: null,
      donorName: 'Staff',
      photos: [],
      reportSentAt: task.report_sent_at,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const getIcon = (type: CompletedItemData['type']) => {
    switch (type) {
      case 'food_slot':
        return <UtensilsCrossed className="h-4 w-4 text-orange-600" />;
      case 'kind_donation':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'need':
        return <Heart className="h-4 w-4 text-pink-600" />;
      case 'task':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
  };

  const getTypeBadge = (type: CompletedItemData['type']) => {
    switch (type) {
      case 'food_slot':
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Food</Badge>;
      case 'kind_donation':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Kind</Badge>;
      case 'need':
        return <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50">Need</Badge>;
      case 'task':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Task</Badge>;
    }
  };

  const selectedCount = selectedItemIds?.size || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Items</CardTitle>
          <CardDescription>Latest work done across all homes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Items</CardTitle>
          <CardDescription>Latest work done across all homes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            No completed items in the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Completed Items</CardTitle>
            <CardDescription>Latest work done across all homes</CardDescription>
          </div>
          {selectable && selectedCount > 0 && (
            <Button size="sm" onClick={onSendToDonor}>
              <Send className="h-4 w-4 mr-2" />
              Send to Donor ({selectedCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allItems.slice(0, 10).map((item) => {
            const isSelected = selectedItemIds?.has(item.id) || false;
            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => selectable && onToggleItem?.(item.id, item)}
              >
                {selectable && (
                  <Checkbox
                    checked={isSelected}
                    className="mt-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => onToggleItem?.(item.id, item)}
                  />
                )}
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{item.title}</span>
                    {getTypeBadge(item.type)}
                    {item.hasPhotos && (
                      <Camera className="h-3 w-3 text-muted-foreground" />
                    )}
                    {item.notes && (
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    )}
                    {item.reportSentAt && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0" title={`Sent on ${format(new Date(item.reportSentAt), 'MMM d, yyyy h:mm a')}`}>
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Sent {format(new Date(item.reportSentAt), 'MMM d')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="truncate">{item.home}</span>
                    <span>•</span>
                    <span>{item.subtitle}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      "{item.notes}"
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {item.value && (
                    <p className="font-medium text-foreground">₹{item.value.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(item.date, 'MMM d')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {allItems.length > 10 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            +{allItems.length - 10} more items
          </p>
        )}
      </CardContent>
    </Card>
  );
}
