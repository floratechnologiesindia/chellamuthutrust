-- Add donate_on_behalf_of column to food_slots table
ALTER TABLE public.food_slots
ADD COLUMN donate_on_behalf_of text;