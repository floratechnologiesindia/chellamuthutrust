import { supabase } from '@/integrations/supabase/client';

/** Upload a resident photo; returns public URL. */
export async function uploadResidentPhoto(homeId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${homeId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from('resident-photos').upload(fileName, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const publicUrl = (data as { publicUrl?: string } | null)?.publicUrl;
  if (publicUrl) return publicUrl;
  const { data: urlData } = supabase.storage.from('resident-photos').getPublicUrl(fileName);
  return urlData.publicUrl;
}
