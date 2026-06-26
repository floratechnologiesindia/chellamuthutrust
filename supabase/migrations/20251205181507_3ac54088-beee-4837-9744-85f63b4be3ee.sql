-- Insert subcategories for each category
-- Food Distribution subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'Breakfast', 'Morning meal sponsorship', true FROM public.categories WHERE key = 'food_distribution'
UNION ALL
SELECT id, 'Lunch', 'Afternoon meal sponsorship', true FROM public.categories WHERE key = 'food_distribution'
UNION ALL
SELECT id, 'Dinner', 'Evening meal sponsorship', true FROM public.categories WHERE key = 'food_distribution'
UNION ALL
SELECT id, 'Snacks', 'Snacks and refreshments', true FROM public.categories WHERE key = 'food_distribution'
UNION ALL
SELECT id, 'Special Meals', 'Festival or celebration meals', true FROM public.categories WHERE key = 'food_distribution';

-- Trust Welfare subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'Medical Support', 'Healthcare and medical expenses', true FROM public.categories WHERE key = 'trust_welfare'
UNION ALL
SELECT id, 'Education Support', 'Educational fees and materials', true FROM public.categories WHERE key = 'trust_welfare'
UNION ALL
SELECT id, 'Housing Support', 'Shelter and accommodation needs', true FROM public.categories WHERE key = 'trust_welfare'
UNION ALL
SELECT id, 'Emergency Relief', 'Urgent and emergency assistance', true FROM public.categories WHERE key = 'trust_welfare';

-- Need List subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'Clothing', 'Clothes and garments', true FROM public.categories WHERE key = 'need_list'
UNION ALL
SELECT id, 'Bedding', 'Mattresses, pillows, blankets', true FROM public.categories WHERE key = 'need_list'
UNION ALL
SELECT id, 'Toiletries', 'Personal hygiene items', true FROM public.categories WHERE key = 'need_list'
UNION ALL
SELECT id, 'Stationery', 'Books, pens, notebooks', true FROM public.categories WHERE key = 'need_list'
UNION ALL
SELECT id, 'Electronics', 'Fans, lights, appliances', true FROM public.categories WHERE key = 'need_list';

-- Ready for Any Help subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'General Support', 'Flexible general assistance', true FROM public.categories WHERE key = 'ready_for_any_help'
UNION ALL
SELECT id, 'Event Sponsorship', 'Sponsor events and gatherings', true FROM public.categories WHERE key = 'ready_for_any_help'
UNION ALL
SELECT id, 'Festival Celebration', 'Festival and holiday celebrations', true FROM public.categories WHERE key = 'ready_for_any_help';

-- Corpus Fund subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'Fixed Deposit', 'Long-term fixed contributions', true FROM public.categories WHERE key = 'corpus_fund'
UNION ALL
SELECT id, 'Recurring Contribution', 'Regular monthly/yearly contributions', true FROM public.categories WHERE key = 'corpus_fund'
UNION ALL
SELECT id, 'One-time Contribution', 'Single corpus fund donation', true FROM public.categories WHERE key = 'corpus_fund';

-- Kind Donation subcategories
INSERT INTO public.subcategories (category_id, label, description, is_active)
SELECT id, 'Food Items', 'Rice, groceries, provisions', true FROM public.categories WHERE key = 'kind_donation'
UNION ALL
SELECT id, 'Clothing Items', 'New or gently used clothes', true FROM public.categories WHERE key = 'kind_donation'
UNION ALL
SELECT id, 'Medical Supplies', 'Medicines and medical equipment', true FROM public.categories WHERE key = 'kind_donation'
UNION ALL
SELECT id, 'Educational Materials', 'Books, computers, learning aids', true FROM public.categories WHERE key = 'kind_donation'
UNION ALL
SELECT id, 'Household Items', 'Furniture, utensils, appliances', true FROM public.categories WHERE key = 'kind_donation';