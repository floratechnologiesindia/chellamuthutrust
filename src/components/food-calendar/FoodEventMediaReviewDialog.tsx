import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Send, Video } from 'lucide-react';
import { format } from 'date-fns';
import { formatFoodSlotLabel } from '@/lib/foodSlotConstants';
import { defaultFoodEventDonorMessage } from '@/lib/foodEventMediaUtils';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import {
  useApproveFoodEventMedia,
  useRejectFoodEventMedia,
  useSendFoodEventMedia,
  type PendingFoodEventMedia,
} from '@/hooks/useFoodEventMedia';

interface FoodEventMediaReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PendingFoodEventMedia | null;
  mode?: 'review' | 'send';
}

export function FoodEventMediaReviewDialog({
  open,
  onOpenChange,
  item,
  mode = 'review',
}: FoodEventMediaReviewDialogProps) {
  const [rejectNotes, setRejectNotes] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [showReject, setShowReject] = useState(false);
  const approve = useApproveFoodEventMedia();
  const reject = useRejectFoodEventMedia();
  const send = useSendFoodEventMedia();

  const slotLabel = item
    ? formatFoodSlotLabel(item.time_slot as FoodTimeSlot, item.meal_type)
    : '';

  useEffect(() => {
    if (!item || !open) return;
    setDonorMessage(
      defaultFoodEventDonorMessage({
        donorName: item.donor_name || 'Donor',
        mealLabel: slotLabel,
        homeName: item.home_name,
        date: item.date,
      }),
    );
    setRejectNotes('');
    setShowReject(false);
  }, [item, open, slotLabel]);

  if (!item) return null;

  const busy = approve.isPending || reject.isPending || send.isPending;

  const handleSend = async (approveFirst: boolean) => {
    if (approveFirst && mode === 'review') {
      await approve.mutateAsync(item.id);
    }
    await send.mutateAsync({ slotId: item.id, customMessage: donorMessage });
    onOpenChange(false);
  };

  const mediaPreview = (
    <>
      {item.completion_notes && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium mb-1">Social worker notes</p>
          <p className="text-muted-foreground">{item.completion_notes}</p>
        </div>
      )}

      {item.completion_photos.length > 0 && (
        <div className="space-y-2">
          <Label>Photos ({item.completion_photos.length})</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {item.completion_photos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-md overflow-hidden border hover:opacity-90"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {item.completion_videos.length > 0 && (
        <div className="space-y-2">
          <Label>Videos ({item.completion_videos.length})</Label>
          <div className="space-y-2">
            {item.completion_videos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded border p-2 text-sm hover:bg-muted/50"
              >
                <Video className="h-4 w-4 shrink-0" />
                <span className="truncate">{url.split('/').pop()}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'send' ? 'Send event media to donor' : 'Review event media'}
          </DialogTitle>
          <DialogDescription>
            {item.home_name} · {format(new Date(`${item.date}T12:00:00`), 'dd MMM yyyy')} · {slotLabel} ·{' '}
            {item.donor_name || 'Donor'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mediaPreview}

          {!showReject && (
            <div className="space-y-2">
              <Label>Message to donor (editable)</Label>
              <Textarea
                value={donorMessage}
                onChange={(e) => setDonorMessage(e.target.value)}
                rows={6}
                placeholder="Personal message included in email and WhatsApp..."
              />
              <p className="text-xs text-muted-foreground">
                Photo and video links are appended automatically.
              </p>
            </div>
          )}

          {showReject && mode === 'review' && (
            <div className="space-y-2">
              <Label>Rejection feedback for social worker</Label>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === 'send' ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={busy || !donorMessage.trim()} onClick={() => handleSend(false)}>
                {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Send to donor
              </Button>
            </>
          ) : !showReject ? (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setShowReject(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => approve.mutate(item.id, { onSuccess: () => onOpenChange(false) })}
              >
                {approve.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve only
              </Button>
              <Button
                type="button"
                disabled={busy || !donorMessage.trim()}
                onClick={() => handleSend(true)}
              >
                {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Approve &amp; send to donor
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  reject.mutate(
                    { slotId: item.id, notes: rejectNotes },
                    { onSuccess: () => onOpenChange(false) },
                  )
                }
              >
                {reject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm rejection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FoodEventMediaStatusBadge({
  status,
  photosSharedAt,
}: {
  status?: string | null;
  photosSharedAt?: string | null;
}) {
  if (photosSharedAt) {
    return <Badge variant="default">Sent to donor</Badge>;
  }
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary">Awaiting admin review</Badge>;
    case 'APPROVED':
      return <Badge variant="outline">Approved — ready to send</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected — re-upload needed</Badge>;
    default:
      return null;
  }
}
