-- Create home_photos table for storing multiple photos per home
CREATE TABLE public.home_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view home photos" ON public.home_photos FOR SELECT USING (true);

CREATE POLICY "Super admins can manage home photos" ON public.home_photos FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage photos for homes in their trust" ON public.home_photos FOR ALL 
  USING (
    (home_id IN (SELECT h.id FROM homes h WHERE h.trust_id IN (SELECT p.trust_id FROM profiles p WHERE p.id = auth.uid()))) 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Create storage bucket for home photos
INSERT INTO storage.buckets (id, name, public) VALUES ('home-photos', 'home-photos', true);

-- Storage RLS policies
CREATE POLICY "Public can view home photos" ON storage.objects FOR SELECT USING (bucket_id = 'home-photos');

CREATE POLICY "Super admins can upload home photos" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'home-photos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can upload home photos" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'home-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can delete home photos" ON storage.objects FOR DELETE 
  USING (bucket_id = 'home-photos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete home photos" ON storage.objects FOR DELETE 
  USING (bucket_id = 'home-photos' AND has_role(auth.uid(), 'admin'::app_role));