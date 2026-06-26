-- Create sub_subcategories table for 3-level hierarchy
CREATE TABLE public.sub_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add sub_subcategory_id column to needs table
ALTER TABLE public.needs ADD COLUMN sub_subcategory_id UUID REFERENCES public.sub_subcategories(id);

-- Enable RLS on sub_subcategories
ALTER TABLE public.sub_subcategories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sub_subcategories
CREATE POLICY "Public can view sub_subcategories"
ON public.sub_subcategories
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage sub_subcategories"
ON public.sub_subcategories
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed Impact Programs category and structure
-- First, get or create Impact Programs category
INSERT INTO public.categories (key, label, description, icon, is_active)
VALUES ('impact_programs', 'Impact Programs', 'All types of impact programs including child help, camps, and functions', 'Heart', true)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, icon = EXCLUDED.icon;

-- Create subcategories for Impact Programs
WITH impact_cat AS (
  SELECT id FROM public.categories WHERE key = 'impact_programs'
)
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT impact_cat.id, vals.label, vals.description, true
FROM impact_cat,
(VALUES 
  ('Child Help', 'All help specifically for children'),
  ('Camps', 'All types of camps or events organized by the trust'),
  ('Functions & Programs', 'Any events, celebrations, or activities conducted in the home')
) AS vals(label, description)
ON CONFLICT DO NOTHING;

-- Create sub-subcategories for Child Help
WITH child_help AS (
  SELECT s.id FROM public.subcategories s
  JOIN public.categories c ON s.category_id = c.id
  WHERE c.key = 'impact_programs' AND s.label = 'Child Help'
)
INSERT INTO public.sub_subcategories (subcategory_id, label, description, is_active)
SELECT child_help.id, vals.label, vals.description, true
FROM child_help,
(VALUES 
  ('Food Support for Children', 'Nutritional support and meals for children'),
  ('Education Support', 'General educational assistance'),
  ('Tuition Fees', 'School and college tuition fee support'),
  ('Medical Support', 'Healthcare and medical expenses for children'),
  ('Clothing & Uniforms', 'Clothes and school uniforms'),
  ('Daily Essentials', 'Day-to-day essential items'),
  ('School Supplies', 'Books, stationery, and educational materials'),
  ('Special Needs Support', 'Support for children with special needs')
) AS vals(label, description);

-- Create sub-subcategories for Camps
WITH camps AS (
  SELECT s.id FROM public.subcategories s
  JOIN public.categories c ON s.category_id = c.id
  WHERE c.key = 'impact_programs' AND s.label = 'Camps'
)
INSERT INTO public.sub_subcategories (subcategory_id, label, description, is_active)
SELECT camps.id, vals.label, vals.description, true
FROM camps,
(VALUES 
  ('Medical Camp', 'General health checkup camps'),
  ('Eye Camp', 'Eye examination and treatment camps'),
  ('Dental Camp', 'Dental care and treatment camps'),
  ('Nutrition Camp', 'Nutrition awareness and supplementation camps'),
  ('Awareness Camp', 'Educational and awareness programs'),
  ('Recreational Camp', 'Fun and recreational activities')
) AS vals(label, description);

-- Create sub-subcategories for Functions & Programs
WITH functions AS (
  SELECT s.id FROM public.subcategories s
  JOIN public.categories c ON s.category_id = c.id
  WHERE c.key = 'impact_programs' AND s.label = 'Functions & Programs'
)
INSERT INTO public.sub_subcategories (subcategory_id, label, description, is_active)
SELECT functions.id, vals.label, vals.description, true
FROM functions,
(VALUES 
  ('Birthday Celebrations', 'Birthday parties and celebrations'),
  ('Festival Celebrations', 'Festival events and celebrations'),
  ('Cultural Programs', 'Cultural events and performances'),
  ('Special Day Events', 'Special occasions and commemorations'),
  ('Annual Day', 'Annual day celebrations'),
  ('Motivational Session', 'Motivational talks and sessions')
) AS vals(label, description);