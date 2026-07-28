import { cn } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/mediaUrl';

interface HomeHeroImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Main home image — always 16:9 (cropped at upload). */
export function HomeHeroImage({ src, alt, className }: HomeHeroImageProps) {
  const imageSrc = normalizeMediaUrl(src) || '/placeholder.svg';
  return (
    <div className={cn('home-image-frame', className)}>
      <img src={imageSrc} alt={alt} />
    </div>
  );
}
