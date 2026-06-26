-- Create home_types table for dynamic home type management
CREATE TABLE public.home_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view home types"
ON public.home_types
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage home types"
ON public.home_types
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed with existing enum values
INSERT INTO public.home_types (key, label, description, icon) VALUES
  ('children_home', 'Children Home', 'Home for children', 'Baby'),
  ('old_age_home', 'Old Age Home', 'Home for elderly residents', 'Heart'),
  ('mixed', 'Mixed', 'Home for both children and elderly', 'Users'),
  ('others', 'Others', 'Other types of homes', 'Home');