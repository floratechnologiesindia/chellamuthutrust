-- Create donor_categories table
CREATE TABLE public.donor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donor_categories ENABLE ROW LEVEL SECURITY;

-- Public can view donor categories (for dropdown)
CREATE POLICY "Public can view donor categories" ON public.donor_categories
  FOR SELECT USING (true);

-- Super admins can manage donor categories
CREATE POLICY "Super admins can manage donor categories" ON public.donor_categories
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Remove existing CHECK constraint from profiles if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_donor_category_check;

-- Insert seed data for existing categories
INSERT INTO public.donor_categories (key, label, description, color) VALUES
  ('monthly', 'Monthly Donor', 'Donors who contribute on a monthly basis', 'green'),
  ('yearly', 'Yearly Donor', 'Donors who contribute annually', 'purple'),
  ('public', 'Public Donor', 'General public donors', 'orange'),
  ('csr', 'CSR', 'Corporate Social Responsibility donors', 'red');