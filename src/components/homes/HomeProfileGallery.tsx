import { Images } from 'lucide-react';
import { PhotoGalleryCarousel } from '@/components/homes/PhotoGalleryCarousel';
import type { HomePhoto } from '@/hooks/useHomePhotos';

interface HomeProfileGalleryProps {
  photos: HomePhoto[];
}

export function HomeProfileGallery({ photos }: HomeProfileGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Images className="h-5 w-5 text-primary" />
        Photo Gallery
      </h2>
      <PhotoGalleryCarousel photos={photos} />
    </section>
  );
}
