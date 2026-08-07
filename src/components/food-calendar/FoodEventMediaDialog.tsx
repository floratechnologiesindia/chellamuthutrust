import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, Video, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { FoodSlot } from '@/hooks/useFoodSlots';
import { formatFoodSlotLabel } from '@/lib/foodSlotConstants';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

interface FoodEventMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: FoodSlot;
  onSubmit: (data: { notes: string; photoUrls: string[]; videoUrls: string[] }) => Promise<void>;
}

export function FoodEventMediaDialog({
  open,
  onOpenChange,
  slot,
  onSubmit,
}: FoodEventMediaDialogProps) {
  const [notes, setNotes] = useState(slot.completion_notes || '');
  const [confirmed, setConfirmed] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(slot.completion_photos || []);
  const [videoUrls, setVideoUrls] = useState<string[]>(slot.completion_videos || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const slotLabel = formatFoodSlotLabel(slot.time_slot, slot.meal_type);
  const isResubmit = slot.event_media_status === 'REJECTED';

  const uploadFiles = async (files: FileList, kind: 'photo' | 'video') => {
    const allowed = kind === 'photo' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    const validFiles = Array.from(files).filter((f) => allowed.includes(f.type));
    const rejected = Array.from(files).filter((f) => !allowed.includes(f.type));

    if (rejected.length) {
      toast.error(
        kind === 'photo'
          ? 'Only JPG, PNG, and WEBP images are allowed.'
          : 'Only MP4, WEBM, and MOV videos are allowed.',
      );
    }
    if (!validFiles.length) return;

    setIsUploading(true);
    const uploaded: string[] = [];

    try {
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `food_slot-${slot.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `food_slot/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('completion-reports')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('completion-reports').getPublicUrl(filePath);
        if (urlData?.publicUrl) uploaded.push(urlData.publicUrl);
      }

      if (kind === 'photo') {
        setPhotoUrls((prev) => [...prev, ...uploaded]);
      } else {
        setVideoUrls((prev) => [...prev, ...uploaded]);
      }
      if (uploaded.length) toast.success(`Uploaded ${uploaded.length} ${kind}(s)`);
    } finally {
      setIsUploading(false);
      if (kind === 'photo' && photoInputRef.current) photoInputRef.current.value = '';
      if (kind === 'video' && videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error('Please confirm the event is complete');
      return;
    }
    if (!photoUrls.length && !videoUrls.length) {
      toast.error('Upload at least one photo or video');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ notes, photoUrls, videoUrls });
      toast.success(isResubmit ? 'Media resubmitted for admin review' : 'Event media submitted for admin review');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit event media');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isResubmit ? 'Re-upload event media' : 'Upload event photos & videos'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p className="font-medium">
              {format(new Date(`${slot.date}T12:00:00`), 'dd MMM yyyy')} · {slotLabel}
            </p>
            <p className="text-muted-foreground">{slot.donor_name || 'Donor'}</p>
            {slot.event_media_status === 'REJECTED' && slot.event_media_rejection_notes && (
              <p className="text-destructive text-xs mt-2">
                Admin feedback: {slot.event_media_rejection_notes}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Event notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief description of the meal event..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUploading}
                onClick={() => photoInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Add photos
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadFiles(e.target.files, 'photo')}
              />
            </div>
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url) => (
                  <div key={url} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
                      onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Videos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUploading}
                onClick={() => videoInputRef.current?.click()}
              >
                <Video className="h-3.5 w-3.5 mr-1" /> Add videos
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept={ALLOWED_VIDEO_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadFiles(e.target.files, 'video')}
              />
            </div>
            {videoUrls.length > 0 && (
              <div className="space-y-2">
                {videoUrls.map((url) => (
                  <div key={url} className="flex items-center gap-2 rounded border p-2 text-sm">
                    <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{url.split('/').pop()}</span>
                    <button type="button" onClick={() => setVideoUrls((prev) => prev.filter((u) => u !== url))}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {photoUrls.length > 0 && (
              <Badge variant="secondary">
                <ImageIcon className="h-3 w-3 mr-1" /> {photoUrls.length} photo(s)
              </Badge>
            )}
            {videoUrls.length > 0 && (
              <Badge variant="secondary">
                <Video className="h-3 w-3 mr-1" /> {videoUrls.length} video(s)
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="confirm-event" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            <Label htmlFor="confirm-event" className="text-sm leading-snug cursor-pointer">
              I confirm this meal event is complete and the media accurately represents the sponsorship.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || isUploading}
            onClick={handleSubmit}
          >
            {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isResubmit ? 'Resubmit for review' : 'Submit for admin review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
