import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];

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

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const allFiles = Array.from(newFiles);
    const imageFiles = allFiles.filter(file => ALLOWED_IMAGE_TYPES.includes(file.type));
    const rejected = allFiles.filter(file => !ALLOWED_IMAGE_TYPES.includes(file.type));
    
    if (rejected.length > 0) {
      toast.error('Only image files (JPG, PNG, WEBP) are allowed. GIFs and PDFs are not supported.');
    }
    
    if (imageFiles.length === 0) return;
    
    const newStagedFiles: StagedFile[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedStagedFiles = [...stagedFiles, ...newStagedFiles];
    setStagedFiles(updatedStagedFiles);
    onFilesChange(updatedStagedFiles.map(sf => sf.file));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const removed = stagedFiles[index];
    URL.revokeObjectURL(removed.preview);
    
    const updatedStagedFiles = stagedFiles.filter((_, i) => i !== index);
    setStagedFiles(updatedStagedFiles);
    onFilesChange(updatedStagedFiles.map(sf => sf.file));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
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
          Drag and drop photos here, or click to select
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports JPG, PNG, WEBP formats only. GIFs and PDFs are not allowed.
        </p>
      </div>

      {/* Preview Grid */}
      {stagedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stagedFiles.map((staged, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={staged.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
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
                {index === 0 && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Primary
                  </span>
                )}
              </div>
              <div className="p-2 text-xs text-muted-foreground truncate">
                {staged.file.name} ({formatFileSize(staged.file.size)})
              </div>
            </Card>
          ))}
        </div>
      )}

      {stagedFiles.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos selected yet</p>
        </div>
      )}
    </div>
  );
}
