import { supabase } from '@/integrations/supabase/client';

/** Upload a cropped home image file to storage; returns public URL. */
export async function uploadHomeImageFile(
  homeId: string,
  file: File,
  prefix = 'photo',
): Promise<string> {
  const fileName = `${homeId}/${prefix}-${crypto.randomUUID()}.jpg`;
  const { data, error } = await supabase.storage.from('home-photos').upload(fileName, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const publicUrl = (data as { publicUrl?: string } | null)?.publicUrl;
  if (publicUrl) return publicUrl;
  const { data: urlData } = supabase.storage.from('home-photos').getPublicUrl(fileName);
  return urlData.publicUrl;
}

export async function insertHomePhotoRecord(
  homeId: string,
  url: string,
  options?: { caption?: string; displayOrder?: number; isPrimary?: boolean },
) {
  const { data: existingPhotos } = await supabase
    .from('home_photos')
    .select('*')
    .eq('home_id', homeId)
    .order('sort_order', { ascending: true });

  const photos = (existingPhotos as Record<string, unknown>[] | null) || [];
  const nextOrder =
    options?.displayOrder ??
    (photos.length > 0
      ? Math.max(...photos.map((p) => Number(p.sort_order ?? p.display_order ?? 0))) + 1
      : 0);

  const isPrimary = options?.isPrimary ?? photos.length === 0;

  const { data, error } = await supabase
    .from('home_photos')
    .insert({
      home_id: homeId,
      image_url: url,
      caption: options?.caption ?? null,
      sort_order: nextOrder,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
