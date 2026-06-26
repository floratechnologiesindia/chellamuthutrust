-- Add completion tracking fields to food_slots
ALTER TABLE food_slots 
  ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completion_photos TEXT[];

-- Add completion tracking fields to kind_donations
ALTER TABLE kind_donations 
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completion_photos TEXT[];

-- Create storage bucket for completion report photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('completion-reports', 'completion-reports', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for completion reports storage
CREATE POLICY "Authenticated users can upload completion reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'completion-reports');

CREATE POLICY "Anyone can view completion reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'completion-reports');

CREATE POLICY "Authenticated users can delete their completion reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'completion-reports');