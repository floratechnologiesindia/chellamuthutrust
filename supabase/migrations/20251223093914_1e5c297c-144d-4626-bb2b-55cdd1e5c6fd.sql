-- Create religions table for managing religion options
CREATE TABLE public.religions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.religions ENABLE ROW LEVEL SECURITY;

-- Public can view religions (for dropdowns)
CREATE POLICY "Public can view religions" ON public.religions
  FOR SELECT USING (true);

-- Super admins can manage religions
CREATE POLICY "Super admins can manage religions" ON public.religions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add religion column to profiles table
ALTER TABLE public.profiles ADD COLUMN religion TEXT;

-- Insert common religions as seed data
INSERT INTO public.religions (label, key) VALUES
  ('Hinduism', 'hinduism'),
  ('Islam', 'islam'),
  ('Christianity', 'christianity'),
  ('Sikhism', 'sikhism'),
  ('Buddhism', 'buddhism'),
  ('Jainism', 'jainism'),
  ('Other', 'other');