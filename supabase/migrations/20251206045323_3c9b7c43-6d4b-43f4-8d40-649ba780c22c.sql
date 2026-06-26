
-- Seed sample needs for Food Distribution, Need List, Trust Welfare, and Corpus Fund
INSERT INTO needs (home_id, trust_id, category_id, subcategory_id, date, quantity, unit, help_mode, description, donation_mode, required_amount, required_product_qty, product_name, product_unit, status)
VALUES
  -- FOOD DISTRIBUTION
  -- Breakfast (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'd0ac524f-43e9-4eb5-bc1d-4c325edc09b0', 'ab4bdf0e-0c58-4f12-8ab2-e3fb130e68c7', CURRENT_DATE + 3, 50, 'meals', 'ONE_TIME', 'Healthy breakfast for 50 children including milk, eggs, bread and fruits', 'MONEY_ONLY', 5000, 0, NULL, NULL, 'OPEN'),
  
  -- Lunch - Special Meals (Both modes)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'd0ac524f-43e9-4eb5-bc1d-4c325edc09b0', '1ceb98d4-297f-4d10-b493-26f05352a856', CURRENT_DATE + 8, 75, 'meals', 'ONE_TIME', 'Special festive lunch with biryani and sweets for Pongal celebration', 'BOTH', 12000, 75, 'Festive Meal Pack', 'packs', 'OPEN'),
  
  -- Dinner (Recurring, Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'd0ac524f-43e9-4eb5-bc1d-4c325edc09b0', '7ceb75ed-5c18-4194-b6a5-721a6d3060d0', CURRENT_DATE + 2, 50, 'meals', 'RECURRING', 'Daily dinner sponsorship for 50 residents - rice, sambar, vegetables and curd', 'MONEY_ONLY', 3500, 0, NULL, NULL, 'OPEN'),

  -- NEED LIST
  -- Bedding (Product Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'cd7ed953-1d28-4760-ba36-0297167fd054', '5173734a-da05-49c9-b7ff-f3d5b6ae48f8', CURRENT_DATE + 12, 25, 'sets', 'ONE_TIME', 'Complete bedding sets with mattress, pillow, bed sheet and blanket', 'PRODUCT_ONLY', 0, 25, 'Bedding Set', 'sets', 'OPEN'),
  
  -- Clothing (Both modes, PARTIAL)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'cd7ed953-1d28-4760-ba36-0297167fd054', 'f86b6d1b-f6f1-4871-9a2c-4ee71c7f05d4', CURRENT_DATE + 6, 40, 'sets', 'ONE_TIME', 'Winter clothing sets - sweaters, jackets and warm pants for children', 'BOTH', 20000, 40, 'Winter Clothing Set', 'sets', 'PARTIAL'),
  
  -- Toiletries (Product Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'cd7ed953-1d28-4760-ba36-0297167fd054', '2a547a47-8504-4b0d-bec7-f3a290b7e04c', CURRENT_DATE + 4, 60, 'kits', 'ONE_TIME', 'Monthly toiletry kits with soap, shampoo, toothpaste, toothbrush and towel', 'PRODUCT_ONLY', 0, 60, 'Toiletry Kit', 'kits', 'OPEN'),
  
  -- Electronics (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'cd7ed953-1d28-4760-ba36-0297167fd054', '9fa74bdf-71da-4485-ba0d-48f5b99b8185', CURRENT_DATE + 20, 10, 'units', 'ONE_TIME', 'Study tablets for online learning and educational apps for senior students', 'MONEY_ONLY', 80000, 0, NULL, NULL, 'OPEN'),
  
  -- Stationery (Product Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'cd7ed953-1d28-4760-ba36-0297167fd054', '16e6207f-74af-40ea-9ca7-aeb7e791f681', CURRENT_DATE + 9, 50, 'kits', 'ONE_TIME', 'Complete stationery kits with notebooks, pens, pencils, erasers and rulers', 'PRODUCT_ONLY', 0, 50, 'Stationery Kit', 'kits', 'OPEN'),

  -- TRUST WELFARE
  -- Medical Support (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'aa68fd5f-6b1e-406b-a65e-1d525cdf4956', 'b1dd97e9-5f60-4e16-aae4-0fa67b134af5', CURRENT_DATE + 15, 1, 'fund', 'ONE_TIME', 'Emergency medical fund for surgeries and critical care treatments', 'MONEY_ONLY', 150000, 0, NULL, NULL, 'OPEN'),
  
  -- Emergency Relief (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'aa68fd5f-6b1e-406b-a65e-1d525cdf4956', '148a298a-8554-4312-aca7-1b58f2865eca', CURRENT_DATE + 1, 1, 'fund', 'ONE_TIME', 'Emergency relief fund for natural disaster victims and displaced families', 'MONEY_ONLY', 50000, 0, NULL, NULL, 'OPEN'),
  
  -- Education Support (Recurring)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'aa68fd5f-6b1e-406b-a65e-1d525cdf4956', '1306b595-dac1-40ff-b4b9-61b2bc89715e', CURRENT_DATE + 5, 5, 'scholarships', 'RECURRING', 'Monthly education scholarships for bright students from underprivileged backgrounds', 'MONEY_ONLY', 25000, 0, NULL, NULL, 'OPEN'),

  -- CORPUS FUND
  -- One-time Contribution (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'e9a6ae7f-87fe-4f7f-b5bb-0fcbc750adf0', '1d0ef482-99ac-487c-b268-9816daadf78e', CURRENT_DATE + 30, 1, 'contribution', 'ONE_TIME', 'Build the trust corpus fund to ensure long-term sustainability of operations', 'MONEY_ONLY', 500000, 0, NULL, NULL, 'OPEN'),
  
  -- Recurring Contribution (Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', 'e9a6ae7f-87fe-4f7f-b5bb-0fcbc750adf0', 'edcafde0-d3fc-4c05-bf52-c3f922226aa2', CURRENT_DATE + 1, 1, 'contribution', 'RECURRING', 'Monthly recurring contributions to grow the trust endowment fund', 'MONEY_ONLY', 10000, 0, NULL, NULL, 'OPEN');

-- Update PARTIAL needs with some progress
UPDATE needs 
SET collected_amount = 8000, fulfilled_product_qty = 15, current_sponsors_count = 3 
WHERE description LIKE '%Winter clothing sets%';
