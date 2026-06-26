import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';

interface PhotoItem {
  url: string;
  type: string;
  label: string;
  date: string;
  home: string;
}

interface WorkDonePhotoGalleryProps {
  photos: PhotoItem[];
  isLoading?: boolean;
}

export function WorkDonePhotoGallery({ photos, isLoading }: WorkDonePhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Completion Photos
          </CardTitle>
          <CardDescription>Photo evidence of completed work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Completion Photos
          </CardTitle>
          <CardDescription>Photo evidence of completed work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            No completion photos available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Completion Photos
          </CardTitle>
          <CardDescription>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} from completed work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.slice(0, 12).map((photo, index) => (
              <div
                key={`${photo.url}-${index}`}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.label}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="text-white text-xs truncate w-full">
                    {photo.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {photos.length > 12 && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              +{photos.length - 12} more photos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="relative">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.label}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedPhoto.label}</h3>
                  <Badge variant="outline">
                    {selectedPhoto.type === 'food_slot' ? 'Food Slot' : 'Kind Donation'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{selectedPhoto.home}</span>
                  <span>{format(new Date(selectedPhoto.date), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
