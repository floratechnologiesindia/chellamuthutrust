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
    return <Skeleton className={cn('home-image-frame w-full', className)} />;
  }

  const images =
    photos && photos.length > 0
      ? photos.map((p) => p.url)
      : fallbackImage
        ? [fallbackImage]
        : ['/placeholder.svg'];

  if (images.length === 1) {
    return (
      <div className={cn('home-image-frame', className)}>
        <img src={images[0]} alt="Project" />
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
            <div className="home-image-frame rounded-none">
              <img src={url} alt={`Project photo ${index + 1}`} />
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
