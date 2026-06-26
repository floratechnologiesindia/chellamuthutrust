-- Add display_order column to categories, subcategories, and sub_subcategories tables
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.sub_subcategories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for efficient ordering
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_display_order ON public.subcategories(display_order);
CREATE INDEX IF NOT EXISTS idx_sub_subcategories_display_order ON public.sub_subcategories(display_order);