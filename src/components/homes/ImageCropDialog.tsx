import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, ZoomIn } from 'lucide-react';
import { cropImageToHomeStandard } from '@/lib/cropImage';
import { HOME_IMAGE_ASPECT, HOME_IMAGE_SIZE_LABEL } from '@/lib/homeImage';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (file: File) => void;
}

export function ImageCropDialog({
  open,
  imageSrc,
  title = 'Crop image',
  onOpenChange,
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropAreaChange = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await cropImageToHomeStandard(imageSrc, croppedAreaPixels);
      onCropComplete(file);
      onOpenChange(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag to reposition and use the slider to zoom. Images are saved at {HOME_IMAGE_SIZE_LABEL}.
          </p>
        </DialogHeader>

        <div className="relative h-[min(50vh,360px)] w-full bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={HOME_IMAGE_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropAreaChange}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(value) => setZoom(value[0])}
            className="flex-1"
          />
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Apply crop'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
