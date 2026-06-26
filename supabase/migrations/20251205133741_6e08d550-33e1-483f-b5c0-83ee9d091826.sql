-- Create enum for time slots
CREATE TYPE food_time_slot AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- Create enum for food slot status
CREATE TYPE food_slot_status AS ENUM ('NEED', 'BOOKED', 'PAID');

-- Create food_slots table
CREATE TABLE public.food_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot food_time_slot NOT NULL,
  status food_slot_status NOT NULL DEFAULT 'NEED',
  note TEXT,
  max_sponsors_allowed INTEGER DEFAULT 1,
  current_sponsors_count INTEGER DEFAULT 0,
  donor_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one slot per home/date/time_slot
  UNIQUE(home_id, date, time_slot)
);

-- Enable RLS
ALTER TABLE public.food_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view food slots" ON public.food_slots 
FOR SELECT USING (true);

CREATE POLICY "Admins can manage food slots in their trust" ON public.food_slots 
FOR ALL USING (
  trust_id IN (SELECT trust_id FROM profiles WHERE id = auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Wardens can manage food slots in their home" ON public.food_slots 
FOR ALL USING (
  home_id IN (SELECT home_id FROM profiles WHERE id = auth.uid()) 
  AND has_role(auth.uid(), 'warden'::app_role)
);

CREATE POLICY "Super admins can manage all food slots" ON public.food_slots 
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Donors can update their booked slots" ON public.food_slots
FOR UPDATE USING (
  donor_id = auth.uid()
);

-- Trigger for updated_at
CREATE TRIGGER update_food_slots_updated_at 
BEFORE UPDATE ON public.food_slots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();