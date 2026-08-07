import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_NAME = 'food-slot-attachments';

export function useFoodSlotAttachments() {
  const [uploading, setUploading] = useState(false);

  const uploadChequeImage = async (file: File, slotKey?: string): Promise<string | null> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `cheque/${slotKey || 'temp'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);

      if (error || !data) {
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }

      const uploadData = data as { path: string; publicUrl?: string };
      if (uploadData.publicUrl) return uploadData.publicUrl;

      return supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path).data.publicUrl;
    } catch (error) {
      console.error('Cheque upload error:', error);
      toast.error('Failed to upload cheque image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadChequeImage, uploading };
}
