import { HOME_IMAGE_HEIGHT, HOME_IMAGE_MIME, HOME_IMAGE_QUALITY, HOME_IMAGE_WIDTH } from '@/lib/homeImage';

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/** Crop source image to standard home dimensions (JPEG). */
export async function cropImageToHomeStandard(
  imageSrc: string,
  pixelCrop: PixelCrop,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = HOME_IMAGE_WIDTH;
  canvas.height = HOME_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    HOME_IMAGE_WIDTH,
    HOME_IMAGE_HEIGHT,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Crop failed'))),
      HOME_IMAGE_MIME,
      HOME_IMAGE_QUALITY,
    );
  });

  return new File([blob], `home-${Date.now()}.jpg`, { type: HOME_IMAGE_MIME });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
