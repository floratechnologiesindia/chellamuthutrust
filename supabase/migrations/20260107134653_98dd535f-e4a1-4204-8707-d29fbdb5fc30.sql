-- Add declaration fields to corpus_fund_contributions table
ALTER TABLE public.corpus_fund_contributions
ADD COLUMN IF NOT EXISTS donor_address text,
ADD COLUMN IF NOT EXISTS donor_pan text,
ADD COLUMN IF NOT EXISTS contribution_mode text,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS declaration_agreed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS declaration_agreed_at timestamp with time zone;