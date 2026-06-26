
-- Seed sample Impact Programs needs with various donation modes
INSERT INTO needs (home_id, trust_id, category_id, subcategory_id, sub_subcategory_id, date, quantity, unit, help_mode, description, donation_mode, required_amount, required_product_qty, product_name, product_unit, status)
VALUES
  -- Child Help - Education Support (Money Only, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', 'a0599a6c-be55-4e49-b974-2cfe7297cf67', '4729200a-a756-49fb-880d-825cd010e91b', CURRENT_DATE + 7, 25, 'students', 'ONE_TIME', 'School fees support for 25 underprivileged children for the upcoming academic year', 'MONEY_ONLY', 75000, 0, NULL, NULL, 'OPEN'),
  
  -- Child Help - Clothing & Uniforms (Product Only, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', 'a0599a6c-be55-4e49-b974-2cfe7297cf67', 'db965f4c-bd40-466a-bc73-73cda5d2b46e', CURRENT_DATE + 14, 50, 'sets', 'ONE_TIME', 'School uniform sets needed for children - includes shirt, pants, shoes and socks', 'PRODUCT_ONLY', 0, 50, 'School Uniform Set', 'sets', 'OPEN'),
  
  -- Child Help - School Supplies (Both modes, PARTIAL)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', 'a0599a6c-be55-4e49-b974-2cfe7297cf67', '02ea5ce3-e4c3-429c-9c24-f0464e8661e4', CURRENT_DATE + 10, 30, 'kits', 'ONE_TIME', 'Complete school supply kits with notebooks, pens, pencils, geometry box and bags', 'BOTH', 15000, 30, 'School Supply Kit', 'kits', 'PARTIAL'),
  
  -- Camps - Medical Camp (Money Only, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', '17085063-9c4c-48c1-9f34-c18e04b84aa5', 'b1fd4cd9-7666-4517-85a8-7ca724053da1', CURRENT_DATE + 21, 100, 'beneficiaries', 'ONE_TIME', 'Free medical camp with general checkup, blood tests and medicines for 100 residents', 'MONEY_ONLY', 50000, 0, NULL, NULL, 'OPEN'),
  
  -- Camps - Nutrition Camp (Both modes, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', '17085063-9c4c-48c1-9f34-c18e04b84aa5', 'f2e0e845-6b71-41e8-91d8-26678357c020', CURRENT_DATE + 28, 75, 'children', 'ONE_TIME', 'Nutrition awareness camp with health supplements and nutritious food packages', 'BOTH', 25000, 75, 'Nutrition Package', 'packages', 'OPEN'),
  
  -- Functions - Birthday Celebrations (Both modes, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', '1197b656-eb74-4896-90ab-18e16cbd18d0', 'f11c8c1d-1479-4b4f-bf71-17ec0ed3a21f', CURRENT_DATE + 5, 15, 'children', 'ONE_TIME', 'Monthly birthday celebration for December-born children with cake, gifts and decorations', 'BOTH', 10000, 15, 'Birthday Gift Box', 'boxes', 'OPEN'),
  
  -- Functions - Annual Day (Money Only, OPEN)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', '1197b656-eb74-4896-90ab-18e16cbd18d0', 'ba35e7d1-ca27-4fd0-a9e6-e123289107fd', CURRENT_DATE + 45, 1, 'event', 'ONE_TIME', 'Annual Day celebration with cultural performances, prizes and dinner for all residents', 'MONEY_ONLY', 100000, 0, NULL, NULL, 'OPEN'),
  
  -- Child Help - Tuition Fees (Recurring, Money Only)
  ('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '9ae418a7-6190-41d9-98d7-e233574cb4d8', 'a0599a6c-be55-4e49-b974-2cfe7297cf67', '6cb181e0-17aa-452c-b710-45211e9d8056', CURRENT_DATE + 1, 10, 'students', 'RECURRING', 'Monthly tuition fees for 10 students attending coaching classes', 'MONEY_ONLY', 15000, 0, NULL, NULL, 'OPEN');

-- Update the PARTIAL need to show some progress
UPDATE needs 
SET collected_amount = 5000, fulfilled_product_qty = 12, current_sponsors_count = 2 
WHERE description LIKE '%Complete school supply kits%';
