import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadHomeImageFile, insertHomePhotoRecord } from '@/lib/homePhotoUpload';
import { normalizeMediaUrl } from '@/lib/mediaUrl';

export interface HomePhoto {
  id: string;
  home_id: string;
  url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export function normalizeHomePhoto(raw: Record<string, unknown>): HomePhoto {
  return {
    id: String(raw.id || raw._id),
    home_id: String(raw.home_id),
    url: normalizeMediaUrl((raw.url as string) || (raw.image_url as string)) || '',
    caption: (raw.caption as string) || null,
    display_order: Number(raw.display_order ?? raw.sort_order ?? 0),
    is_primary: Boolean(raw.is_primary),
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

export function useHomePhotos(homeId: string | null) {
  return useQuery({
    queryKey: ['home-photos', homeId],
    queryFn: async () => {
      if (!homeId) return [];

      const { data, error } = await supabase
        .from('home_photos')
        .select('*')
        .eq('home_id', homeId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const rows = (data as Record<string, unknown>[] | null) || [];
      return rows.map(normalizeHomePhoto);
    },
    enabled: !!homeId,
  });
}

export function useAddHomePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      homeId,
      file,
      caption,
    }: {
      homeId: string;
      file: File;
      caption?: string;
    }) => {
      const publicUrl = await uploadHomeImageFile(homeId, file);
      return insertHomePhotoRecord(homeId, publicUrl, { caption });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['home-photos', variables.homeId] });
      toast.success('Photo added successfully');
    },
    onError: (error) => {
      console.error('Error adding photo:', error);
      toast.error('Failed to add photo');
    },
  });
}

export function useDeleteHomePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photo }: { photo: HomePhoto }) => {
      // Extract file path from URL
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage.from('home-photos').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('home_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      // If this was primary, set another photo as primary
      if (photo.is_primary) {
        const { data: remainingPhotos } = await supabase
          .from('home_photos')
          .select('id')
          .eq('home_id', photo.home_id)
          .order('sort_order', { ascending: true })
          .limit(1);

        if (remainingPhotos && remainingPhotos.length > 0) {
          await supabase
            .from('home_photos')
            .update({ is_primary: true })
            .eq('id', remainingPhotos[0].id);
        }
      }

      return photo.home_id;
    },
    onSuccess: (homeId) => {
      queryClient.invalidateQueries({ queryKey: ['home-photos', homeId] });
      toast.success('Photo deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    },
  });
}

export function useSetPrimaryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photo }: { photo: HomePhoto }) => {
      // The API layer only supports updates addressed by row id, so unset one row at a time.
      const { data: siblings } = await supabase
        .from('home_photos')
        .select('*')
        .eq('home_id', photo.home_id);

      const currentPrimaries = ((siblings as Record<string, unknown>[] | null) || [])
        .map(normalizeHomePhoto)
        .filter((p) => p.is_primary && p.id !== photo.id);

      for (const previous of currentPrimaries) {
        await supabase.from('home_photos').update({ is_primary: false }).eq('id', previous.id);
      }

      const { error } = await supabase
        .from('home_photos')
        .update({ is_primary: true })
        .eq('id', photo.id);

      if (error) throw error;
      return photo.home_id;
    },
    onSuccess: (homeId) => {
      queryClient.invalidateQueries({ queryKey: ['home-photos', homeId] });
      toast.success('Primary photo updated');
    },
    onError: (error) => {
      console.error('Error setting primary photo:', error);
      toast.error('Failed to set primary photo');
    },
  });
}

export function useUpdatePhotoCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, caption, homeId }: { photoId: string; caption: string; homeId: string }) => {
      const { error } = await supabase
        .from('home_photos')
        .update({ caption })
        .eq('id', photoId);

      if (error) throw error;
      return homeId;
    },
    onSuccess: (homeId) => {
      queryClient.invalidateQueries({ queryKey: ['home-photos', homeId] });
    },
    onError: (error) => {
      console.error('Error updating caption:', error);
      toast.error('Failed to update caption');
    },
  });
}
