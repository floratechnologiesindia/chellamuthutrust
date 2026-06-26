-- Seed sample needs
INSERT INTO needs (trust_id, home_id, category_id, date, quantity, unit, description, help_mode, status, max_sponsors_allowed, current_sponsors_count, created_by) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '4bb683ab-b0ef-4a8a-8993-4b0f7289ad32', CURRENT_DATE + 2, 50, 'kg', 'Rice for monthly supplies', 'ONE_TIME', 'OPEN', 3, 0, '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '4bb683ab-b0ef-4a8a-8993-4b0f7289ad32', CURRENT_DATE + 5, 20, 'liters', 'Cooking oil for kitchen', 'ONE_TIME', 'OPEN', 2, 1, '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '71743faf-482e-4488-9439-020d6b6512db', CURRENT_DATE + 7, 30, 'sets', 'School notebooks and stationery', 'ONE_TIME', 'PARTIAL', 5, 2, '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'a2d07ba2-ea6e-4d30-a293-4f4fa726e9ef', CURRENT_DATE + 10, 25, 'sets', 'School uniforms for children', 'ONE_TIME', 'OPEN', 4, 0, 'f1499e0a-b634-4709-b9aa-f559a11c7f7d'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'cca0fb60-12fa-4ac9-8d16-143c436ea32a', CURRENT_DATE + 3, 1, 'visit', 'Monthly health checkup by doctor', 'RECURRING', 'OPEN', 1, 0, '6e2ba1f1-314b-460e-a13d-d78e4944859d'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '4f6e1b9a-4da3-425b-9b9e-07eafdaf1286', CURRENT_DATE + 15, 10, 'items', 'Sports equipment - cricket bats and balls', 'ONE_TIME', 'OPEN', 2, 0, 'f1499e0a-b634-4709-b9aa-f559a11c7f7d'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'a49b86f6-cc7a-4916-8ad0-3a6fe4686744', CURRENT_DATE + 1, 1, 'month', 'Electricity bill sponsorship', 'RECURRING', 'FULLY_SPONSORED', 1, 1, '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '92b2a374-8059-46da-8dcb-b99d55099181', CURRENT_DATE + 20, 1, 'project', 'Roof repair for dormitory building', 'ONE_TIME', 'PARTIAL', 10, 3, '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2');

-- Seed sample tasks
INSERT INTO tasks (trust_id, home_id, title, description, assigned_to, assigned_by, due_date, priority, status) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Follow up with Mr. Sharma for donation', 'Call Mr. Sharma regarding his pledge for education sponsorship', '958dcef9-a7ff-49c5-9fe8-bdf818cde3f8', '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2', CURRENT_DATE + 2, 'high', 'OPEN'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Prepare monthly inventory report', 'Create detailed inventory report for food supplies', 'f1499e0a-b634-4709-b9aa-f559a11c7f7d', '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2', CURRENT_DATE + 5, 'medium', 'IN_PROGRESS'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Coordinate with school for admission', 'Arrange admission documents for 5 new children', '6e2ba1f1-314b-460e-a13d-d78e4944859d', 'f1499e0a-b634-4709-b9aa-f559a11c7f7d', CURRENT_DATE + 7, 'high', 'OPEN'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Organize birthday celebration', 'Plan birthday party for children born in December', '958dcef9-a7ff-49c5-9fe8-bdf818cde3f8', 'f1499e0a-b634-4709-b9aa-f559a11c7f7d', CURRENT_DATE + 10, 'low', 'OPEN'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Contact vendor for roof repair', 'Get quotations from 3 vendors for dormitory roof repair', '958dcef9-a7ff-49c5-9fe8-bdf818cde3f8', '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2', CURRENT_DATE - 1, 'high', 'OPEN'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', 'Update donor database', 'Add new donors from last month event to database', 'f1499e0a-b634-4709-b9aa-f559a11c7f7d', '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2', CURRENT_DATE + 3, 'medium', 'COMPLETED'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', NULL, 'Review quarterly financial report', 'Review and approve Q4 financial statements', 'f1499e0a-b634-4709-b9aa-f559a11c7f7d', '8cd78f4d-02ce-4629-b772-a2f0d40e3dd2', CURRENT_DATE + 15, 'high', 'OPEN');

-- Seed corpus fund contributions
INSERT INTO corpus_fund_contributions (trust_id, donor_id, donor_name, amount, contribution_date, purpose, notes) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 100000, CURRENT_DATE - 30, 'Education Endowment', 'Annual contribution for education fund'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', NULL, 'Ramesh Kumar', 50000, CURRENT_DATE - 60, 'Building Fund', 'Contribution for new building project'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', NULL, 'Lakshmi Foundation', 250000, CURRENT_DATE - 90, 'General Corpus', 'CSR contribution'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', NULL, 'Venkatesh Iyer', 75000, CURRENT_DATE - 15, 'Medical Fund', 'In memory of late parents'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 25000, CURRENT_DATE - 5, 'Infrastructure', 'For roof repair project'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', NULL, 'Priya Mehta', 150000, CURRENT_DATE - 120, 'Education Endowment', 'Scholarship fund contribution');

-- Seed kind donations
INSERT INTO kind_donations (trust_id, home_id, donor_id, donor_name, item_type, item_description, quantity, estimated_value, received_date, notes) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 'Food Items', '50 kg Rice, 20 kg Dal, 10 liters Oil', 1, 5000, CURRENT_DATE - 10, 'Monthly grocery donation'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'ABC Textiles', 'Clothing', 'School uniforms - shirts and pants', 30, 15000, CURRENT_DATE - 20, 'Annual uniform donation'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Bookworm Store', 'Books & Stationery', 'Notebooks, pens, pencils, geometry boxes', 50, 8000, CURRENT_DATE - 5, 'Back to school supplies'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Dr. Raghavan Clinic', 'Medical Supplies', 'First aid kits, basic medicines, vitamins', 10, 12000, CURRENT_DATE - 45, 'Medical camp supplies'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Sports World', 'Toys & Games', 'Cricket sets, footballs, carrom boards', 15, 20000, CURRENT_DATE - 30, 'Sports day donation'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Home Furnish Co', 'Furniture', 'Study tables and chairs', 20, 40000, CURRENT_DATE - 60, 'Study room furniture'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Meena Devi', 'Food Items', 'Fruits and sweets for Diwali', 1, 3000, CURRENT_DATE - 3, 'Festival donation'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', NULL, 'Tech Solutions Ltd', 'Electronics', 'Laptops for computer lab', 5, 150000, CURRENT_DATE - 90, 'CSR donation for digital education');

-- Seed some donations
INSERT INTO donations (trust_id, home_id, donor_id, amount_pledged, sponsorship_type, payment_mode, start_date, status, occasion_type, occasion_note) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 5000, 'ONE_TIME', 'online', CURRENT_DATE - 15, 'COMPLETED', 'birthday', 'Birthday celebration sponsorship'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'ff834382-4186-4ba1-9c56-bd8baa5c04ae', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 2000, 'RECURRING', 'online', CURRENT_DATE - 60, 'ACTIVE', NULL, 'Monthly food sponsorship');