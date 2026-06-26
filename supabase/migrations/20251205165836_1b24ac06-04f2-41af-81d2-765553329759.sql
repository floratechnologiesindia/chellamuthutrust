-- First delete existing needs that reference old categories
DELETE FROM public.needs;

-- Delete existing categories
DELETE FROM public.categories;

-- Insert the 6 new categories
INSERT INTO public.categories (key, label, description, icon, is_active) VALUES
  ('food_distribution', 'Food Distribution', 'Meal sponsorships and food-related needs', 'utensils', true),
  ('trust_welfare', 'Trust Welfare', 'General trust welfare and support needs', 'heart', true),
  ('need_list', 'Need List', 'General needs and requirements listing', 'list', true),
  ('ready_for_any_help', 'Ready for Any Help', 'Flexible help requests for any support', 'hand-helping', true),
  ('corpus_fund', 'Corpus Fund', 'Corpus fund contributions and investments', 'piggy-bank', true),
  ('kind_donation', 'Kind Donation', 'In-kind donations of goods and materials', 'gift', true);