import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HomePhoto {
  id: string;
  home_id: string;
  url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
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
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as HomePhoto[];
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
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${homeId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('home-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('home-photos')
        .getPublicUrl(fileName);

      // Get current max display_order
      const { data: existingPhotos } = await supabase
        .from('home_photos')
        .select('display_order')
        .eq('home_id', homeId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPhotos && existingPhotos.length > 0 
        ? (existingPhotos[0].display_order || 0) + 1 
        : 0;

      // Check if this is the first photo (make it primary)
      const { count } = await supabase
        .from('home_photos')
        .select('*', { count: 'exact', head: true })
        .eq('home_id', homeId);

      const isPrimary = count === 0;

      // Insert into database
      const { data, error } = await supabase
        .from('home_photos')
        .insert({
          home_id: homeId,
          url: urlData.publicUrl,
          caption: caption || null,
          display_order: nextOrder,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
          .order('display_order', { ascending: true })
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
      // Unset current primary
      await supabase
        .from('home_photos')
        .update({ is_primary: false })
        .eq('home_id', photo.home_id);

      // Set new primary
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
