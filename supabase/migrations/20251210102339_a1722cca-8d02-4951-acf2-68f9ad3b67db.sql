-- Add aadhar_number and requires_80g columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS aadhar_number text,
ADD COLUMN IF NOT EXISTS requires_80g boolean DEFAULT false;