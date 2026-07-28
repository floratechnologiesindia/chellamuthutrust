import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageCropDialog } from '@/components/homes/ImageCropDialog';
import { HomeHeroImage } from '@/components/homes/HomeHeroImage';
import { useImageCropQueue } from '@/hooks/useImageCropQueue';
import { HOME_IMAGE_SIZE_LABEL } from '@/lib/homeImage';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface HomeMainImageUploadProps {
  previewUrl?: string | null;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  onClearExisting?: () => void;
  label?: string;
}

export function HomeMainImageUpload({
  previewUrl,
  pendingFile,
  onPendingFileChange,
  onClearExisting,
  label = 'Main image',
}: HomeMainImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = objectUrl ?? previewUrl ?? null;

  const { enqueueFiles, cropDialogProps } = useImageCropQueue((file) => {
    onPendingFileChange(file);
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const { accepted, rejected } = enqueueFiles(files);
    if (rejected > 0) {
      toast.error('Only image files (JPG, PNG, WEBP) are allowed.');
    }
    if (accepted === 0) return;
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = () => {
    onPendingFileChange(null);
    onClearExisting?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{HOME_IMAGE_SIZE_LABEL}</span>
      </div>

      {displayUrl ? (
        <div className="relative group max-w-xl">
          <HomeHeroImage src={displayUrl} alt="Main home image preview" />
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button type="button" size="icon" variant="destructive" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[140px] w-full max-w-xl flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Upload main image</p>
          <p className="mt-1 text-xs text-muted-foreground">Crop to {HOME_IMAGE_SIZE_LABEL}</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <ImageCropDialog {...cropDialogProps} title="Crop main image" />
    </div>
  );
}
