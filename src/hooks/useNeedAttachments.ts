import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_NAME = 'need-attachments';

export type AttachmentType = 'quotation' | 'photo';

interface UploadProgress {
  file: string;
  progress: number;
}

export function useNeedAttachments() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const uploadFile = async (
    file: File,
    type: AttachmentType,
    needId?: string
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${needId || 'temp'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      setUploadProgress(prev => [...prev, { file: file.name, progress: 0 }]);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      setUploadProgress(prev => prev.filter(p => p.file !== file.name));

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  };

  const uploadFiles = async (
    files: File[],
    type: AttachmentType,
    needId?: string
  ): Promise<string[]> => {
    setUploading(true);
    const urls: string[] = [];

    for (const file of files) {
      const url = await uploadFile(file, type, needId);
      if (url) {
        urls.push(url);
      }
    }

    setUploading(false);
    return urls;
  };

  const deleteFile = async (url: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = url.split(`${BUCKET_NAME}/`);
      if (urlParts.length < 2) return false;

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete file');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploading,
    uploadProgress,
  };
}
