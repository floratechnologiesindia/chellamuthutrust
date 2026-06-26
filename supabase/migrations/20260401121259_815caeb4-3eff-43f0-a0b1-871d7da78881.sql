ALTER TABLE public.food_slots ADD COLUMN IF NOT EXISTS report_sent_at timestamptz DEFAULT NULL;
ALTER TABLE public.kind_donations ADD COLUMN IF NOT EXISTS report_sent_at timestamptz DEFAULT NULL;
ALTER TABLE public.needs ADD COLUMN IF NOT EXISTS report_sent_at timestamptz DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS report_sent_at timestamptz DEFAULT NULL;