import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageCropDialog } from '@/components/homes/ImageCropDialog';
import { useImageCropQueue } from '@/hooks/useImageCropQueue';
import { HOME_IMAGE_SIZE_LABEL } from '@/lib/homeImage';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StagedFile {
  file: File;
  preview: string;
}

interface StagedPhotoUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function StagedPhotoUploader({ files, onFilesChange }: StagedPhotoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const syncFiles = (updated: StagedFile[]) => {
    setStagedFiles(updated);
    onFilesChange(updated.map((sf) => sf.file));
  };

  const { enqueueFiles, cropDialogProps, isProcessing } = useImageCropQueue((file) => {
    const preview = URL.createObjectURL(file);
    setStagedFiles((prev) => {
      const updated = [...prev, { file, preview }];
      onFilesChange(updated.map((sf) => sf.file));
      return updated;
    });
  });

  const handleIncomingFiles = (incoming: FileList | File[]) => {
    const { accepted, rejected } = enqueueFiles(incoming);
    if (rejected > 0) {
      toast.error('Only image files (JPG, PNG, WEBP) are allowed. GIFs and PDFs are not supported.');
    }
    if (accepted === 0) return;
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleIncomingFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const removed = stagedFiles[index];
    URL.revokeObjectURL(removed.preview);
    syncFiles(stagedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          isProcessing && 'pointer-events-none opacity-70',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {isProcessing ? 'Crop each photo before adding to the gallery...' : 'Drag and drop photos here, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Images are cropped to {HOME_IMAGE_SIZE_LABEL}. JPG, PNG, WEBP only.
        </p>
      </div>

      {stagedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stagedFiles.map((staged, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <div className="home-image-frame rounded-none border-0">
                <img src={staged.preview} alt={`Preview ${index + 1}`} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-2 text-xs text-muted-foreground truncate">
                {staged.file.name} ({formatFileSize(staged.file.size)})
              </div>
            </Card>
          ))}
        </div>
      )}

      {stagedFiles.length === 0 && !isProcessing && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos selected yet</p>
        </div>
      )}

      <ImageCropDialog {...cropDialogProps} title="Crop gallery photo" />
    </div>
  );
}
