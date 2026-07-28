import { useCallback, useEffect, useRef, useState } from 'react';
import { readFileAsDataUrl } from '@/lib/cropImage';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];

export function useImageCropQueue(onCropped: (file: File) => void) {
  const [queue, setQueue] = useState<File[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const processingRef = useRef(false);

  const enqueueFiles = useCallback((files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type));
    if (imageFiles.length === 0) return { accepted: 0, rejected: allFiles.length };
    setQueue((prev) => [...prev, ...imageFiles]);
    return { accepted: imageFiles.length, rejected: allFiles.length - imageFiles.length };
  }, []);

  useEffect(() => {
    if (processingRef.current || open || queue.length === 0) return;

    processingRef.current = true;
    const next = queue[0];
    readFileAsDataUrl(next)
      .then((src) => {
        setImageSrc(src);
        setOpen(true);
      })
      .catch(() => {
        setQueue((prev) => prev.slice(1));
      })
      .finally(() => {
        processingRef.current = false;
      });
  }, [queue, open]);

  const handleCropComplete = useCallback(
    (file: File) => {
      onCropped(file);
      setQueue((prev) => prev.slice(1));
      setImageSrc(null);
      setOpen(false);
    },
    [onCropped],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setQueue((prev) => prev.slice(1));
      setImageSrc(null);
    }
    setOpen(nextOpen);
  }, []);

  return {
    enqueueFiles,
    cropDialogProps: {
      open,
      imageSrc,
      onOpenChange: handleOpenChange,
      onCropComplete: handleCropComplete,
    },
    isProcessing: open || queue.length > 0,
  };
}
