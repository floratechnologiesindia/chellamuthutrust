import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageCropDialog } from '@/components/homes/ImageCropDialog';
import { useImageCropQueue } from '@/hooks/useImageCropQueue';
import { HOME_IMAGE_SIZE_LABEL } from '@/lib/homeImage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { X, Star, Loader2, ImagePlus } from 'lucide-react';
import {
  useHomePhotos,
  useAddHomePhoto,
  useDeleteHomePhoto,
  useSetPrimaryPhoto,
  useUpdatePhotoCaption,
  type HomePhoto,
} from '@/hooks/useHomePhotos';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PhotoGalleryManagerProps {
  homeId: string;
}

export function PhotoGalleryManager({ homeId }: PhotoGalleryManagerProps) {
  const { data: photos = [], isLoading } = useHomePhotos(homeId);
  const addPhoto = useAddHomePhoto();
  const deletePhoto = useDeleteHomePhoto();
  const setPrimary = useSetPrimaryPhoto();
  const updateCaption = useUpdatePhotoCaption();

  const [dragActive, setDragActive] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { enqueueFiles, cropDialogProps, isProcessing } = useImageCropQueue(async (file) => {
    await addPhoto.mutateAsync({ homeId, file });
  });

  const handleIncomingFiles = (files: FileList | File[]) => {
    const { accepted, rejected } = enqueueFiles(files);
    if (rejected > 0) {
      toast.error('Only image files (JPG, PNG, WEBP) are allowed. GIFs and PDFs are not supported.');
    }
    if (accepted === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleIncomingFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleIncomingFiles(e.target.files);
    }
  };

  const handleCaptionSave = async (photo: HomePhoto) => {
    await updateCaption.mutateAsync({
      photoId: photo.id,
      caption: captionValue,
      homeId,
    });
    setEditingCaption(null);
    setCaptionValue('');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="home-image-frame rounded-lg" />
        ))}
      </div>
    );
  }

  const uploading = addPhoto.isPending || isProcessing;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          uploading && 'pointer-events-none opacity-70',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {isProcessing ? 'Crop photo...' : 'Uploading...'}
            </span>
          </div>
        ) : (
          <>
            <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop images here, or click to select</p>
            <p className="text-xs text-muted-foreground/70">Cropped to {HOME_IMAGE_SIZE_LABEL}</p>
          </>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="group relative overflow-hidden">
              <CardContent className="p-0">
                <div className="relative home-image-frame rounded-none border-0">
                  <img src={photo.url} alt={photo.caption || 'Project photo'} />

                  {photo.is_primary && (
                    <Badge className="absolute left-2 top-2 bg-primary">
                      <Star className="mr-1 h-3 w-3" /> Primary
                    </Badge>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {!photo.is_primary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimary.mutate({ photo })}
                        disabled={setPrimary.isPending}
                      >
                        <Star className="mr-1 h-4 w-4" />
                        Set Primary
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this photo? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePhoto.mutate({ photo })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="p-2">
                  {editingCaption === photo.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={captionValue}
                        onChange={(e) => setCaptionValue(e.target.value)}
                        placeholder="Add caption..."
                        className="h-8 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCaptionSave(photo);
                          if (e.key === 'Escape') setEditingCaption(null);
                        }}
                      />
                      <Button size="sm" className="h-8" onClick={() => handleCaptionSave(photo)}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCaption(photo.id);
                        setCaptionValue(photo.caption || '');
                      }}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground"
                    >
                      {photo.caption || 'Add caption...'}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No photos uploaded yet. Add photos to create a gallery for this project.
        </p>
      )}

      <ImageCropDialog {...cropDialogProps} title="Crop gallery photo" />
    </div>
  );
}
