import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { useNeedAttachments, AttachmentType } from '@/hooks/useNeedAttachments';
import { cn } from '@/lib/utils';

interface NeedAttachmentUploadProps {
  type: AttachmentType;
  existingUrls: string[];
  onUrlsChange: (urls: string[]) => void;
  needId?: string;
  accept?: string;
  maxFiles?: number;
  label: string;
  description?: string;
}

export function NeedAttachmentUpload({
  type,
  existingUrls,
  onUrlsChange,
  needId,
  accept = type === 'photo' ? 'image/*' : 'image/*,.pdf,.doc,.docx',
  maxFiles = 5,
  label,
  description,
}: NeedAttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, deleteFile, uploading } = useNeedAttachments();
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - existingUrls.length;
    if (remainingSlots <= 0) {
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const newUrls = await uploadFiles(filesToUpload, type, needId);

    if (newUrls.length > 0) {
      onUrlsChange([...existingUrls, ...newUrls]);
    }
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
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = async (url: string) => {
    await deleteFile(url);
    onUrlsChange(existingUrls.filter((u) => u !== url));
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].substring(0, 30);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{label}</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {existingUrls.length}/{maxFiles} files
        </span>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          existingUrls.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => existingUrls.length < maxFiles && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={existingUrls.length >= maxFiles || uploading}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : 'Click or drag files to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              {type === 'photo' ? 'Images only' : 'Images, PDF, DOC files'}
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {existingUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {existingUrls.map((url, index) => (
            <Card
              key={index}
              className="relative group overflow-hidden"
            >
              {isImage(url) ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                </a>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center h-24 bg-muted hover:bg-muted/80"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 px-2 truncate max-w-full">
                    {getFileName(url)}
                  </span>
                </a>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemove(url);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
