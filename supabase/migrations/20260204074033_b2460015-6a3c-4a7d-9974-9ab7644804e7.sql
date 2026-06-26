-- Add foreign key constraint from profiles.home_id to homes.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_home_id_fkey 
FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE SET NULL;

-- Add foreign key constraint from profiles.trust_id to trusts.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_trust_id_fkey 
FOREIGN KEY (trust_id) REFERENCES public.trusts(id) ON DELETE SET NULL;