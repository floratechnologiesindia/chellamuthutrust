-- Add new columns for donor information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS working_sector TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS donor_type TEXT;

-- Add comments for clarity
COMMENT ON COLUMN profiles.working_sector IS 'Employment sector: private, govt, or others';
COMMENT ON COLUMN profiles.designation IS 'Job title/designation';
COMMENT ON COLUMN profiles.donor_type IS 'Donor nationality type: indian, nri, or foreigner';