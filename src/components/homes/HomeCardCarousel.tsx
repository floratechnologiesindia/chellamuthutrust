import { useHomePhotos } from '@/hooks/useHomePhotos';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface HomeCardCarouselProps {
  homeId: string;
  fallbackImage?: string | null;
  className?: string;
}

export function HomeCardCarousel({ homeId, fallbackImage, className }: HomeCardCarouselProps) {
  const { data: photos, isLoading } = useHomePhotos(homeId);

  if (isLoading) {
    return <Skeleton className={cn('aspect-video w-full', className)} />;
  }

  const images = photos && photos.length > 0 
    ? photos.map(p => p.url) 
    : fallbackImage 
      ? [fallbackImage] 
      : ['/placeholder.svg'];

  if (images.length === 1) {
    return (
      <div className={cn('relative aspect-video overflow-hidden bg-muted', className)}>
        <img
          src={images[0]}
          alt="Home"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]}
      className={cn('w-full', className)}
    >
      <CarouselContent>
        {images.map((url, index) => (
          <CarouselItem key={index}>
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img
                src={url}
                alt={`Home photo ${index + 1}`}
                className="h-full w-full object-contain"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {images.map((_, index) => (
          <div
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-background/70"
          />
        ))}
      </div>
    </Carousel>
  );
}
