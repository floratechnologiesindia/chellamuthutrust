-- Add approval_status column to needs table
-- This is separate from the existing 'status' column which tracks sponsorship status
ALTER TABLE needs 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'PENDING';

-- Add comment for clarity
COMMENT ON COLUMN needs.approval_status IS 'Tracks admin approval: PENDING, APPROVED, REJECTED. Separate from sponsorship status.';