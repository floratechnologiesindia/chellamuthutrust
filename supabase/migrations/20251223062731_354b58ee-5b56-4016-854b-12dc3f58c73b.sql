-- Add gender-specific capacity columns
ALTER TABLE public.homes 
ADD COLUMN capacity_children_male INTEGER DEFAULT 0,
ADD COLUMN capacity_children_female INTEGER DEFAULT 0,
ADD COLUMN capacity_elderly_male INTEGER DEFAULT 0,
ADD COLUMN capacity_elderly_female INTEGER DEFAULT 0;

-- Migrate existing data: put existing capacity into male columns
UPDATE public.homes 
SET 
  capacity_children_male = COALESCE(capacity_children, 0),
  capacity_elderly_male = COALESCE(capacity_old_age, 0);

-- Drop old columns (the new columns will be used for totals via computed values in code)
ALTER TABLE public.homes 
DROP COLUMN capacity_children,
DROP COLUMN capacity_old_age;