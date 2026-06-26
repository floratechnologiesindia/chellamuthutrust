-- Add referred_by column to profiles table
ALTER TABLE public.profiles ADD COLUMN referred_by TEXT;
COMMENT ON COLUMN public.profiles.referred_by IS 'Reference - who referred this donor';