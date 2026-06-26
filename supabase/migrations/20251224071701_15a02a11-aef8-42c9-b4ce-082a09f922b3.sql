-- Create food_slot_pricing table
CREATE TABLE public.food_slot_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot text NOT NULL UNIQUE,
  label text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_slot_pricing ENABLE ROW LEVEL SECURITY;

-- Public can view pricing
CREATE POLICY "Public can view food slot pricing" 
ON public.food_slot_pricing FOR SELECT 
USING (true);

-- Super admins can manage pricing
CREATE POLICY "Super admins can manage food slot pricing" 
ON public.food_slot_pricing FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default pricing data
INSERT INTO public.food_slot_pricing (time_slot, label, price, description) VALUES
  ('MORNING', 'Breakfast', 0, 'Morning breakfast sponsorship'),
  ('AFTERNOON', 'Lunch', 0, 'Afternoon lunch sponsorship'),
  ('EVENING', 'Dinner', 0, 'Evening dinner sponsorship'),
  ('REFRESHMENTS', 'Refreshments', 0, 'Refreshments/snacks sponsorship');

-- Create trigger for updated_at
CREATE TRIGGER update_food_slot_pricing_updated_at
BEFORE UPDATE ON public.food_slot_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();