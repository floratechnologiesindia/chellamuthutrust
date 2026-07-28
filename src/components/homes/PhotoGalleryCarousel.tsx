import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import type { HomePhoto } from '@/hooks/useHomePhotos';

interface PhotoGalleryCarouselProps {
  photos: HomePhoto[];
  className?: string;
}

export function PhotoGalleryCarousel({ photos, className }: PhotoGalleryCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  if (photos.length === 0) return null;

  const currentPhoto = photos[selectedIndex];
  const photoSrc = (photo: HomePhoto) => normalizeMediaUrl(photo.url) || '/placeholder.svg';

  return (
    <div className={cn('relative isolate', className)}>
      <div className="space-y-4">
        {/* Main Carousel */}
        <Carousel className="w-full relative">
          <CarouselContent>
            {photos.map((photo, index) => (
              <CarouselItem key={photo.id}>
                <div
                  className="home-image-frame cursor-pointer rounded-xl"
                  onClick={() => {
                    setSelectedIndex(index);
                    setFullscreenOpen(true);
                  }}
                >
                  <img
                    src={photoSrc(photo)}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="transition-transform hover:scale-105"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-sm text-white">{photo.caption}</p>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <>
              <CarouselPrevious className="left-4 h-10 w-10 bg-background/80 hover:bg-background" />
              <CarouselNext className="right-4 h-10 w-10 bg-background/80 hover:bg-background" />
            </>
          )}
        </Carousel>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex justify-center gap-3 overflow-x-auto py-3 bg-background px-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  selectedIndex === index
                    ? 'border-primary ring-2 ring-primary/30 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <img
                  src={photoSrc(photo)}
                  alt={photo.caption || `Thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0">
          <div className="relative">
            <img
              src={currentPhoto ? photoSrc(currentPhoto) : '/placeholder.svg'}
              alt={currentPhoto?.caption || 'Full size photo'}
              className="max-h-[85vh] w-full object-contain"
            />
            {currentPhoto?.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <p className="text-center text-white">{currentPhoto.caption}</p>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-2 p-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    selectedIndex === index
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/75'
                  )}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
