-- Add new columns for multi-slot booking feature
ALTER TABLE public.food_slots
ADD COLUMN reason text,
ADD COLUMN sponsor_for text,
ADD COLUMN amount numeric DEFAULT 0,
ADD COLUMN payment_status text DEFAULT 'YET_TO_PAY';