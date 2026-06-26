-- Add year_established and supported_by columns to homes table
ALTER TABLE public.homes ADD COLUMN year_established INTEGER;
ALTER TABLE public.homes ADD COLUMN supported_by TEXT;