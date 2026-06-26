-- Seed comprehensive food calendar demo data for December 2025
-- Using correct IDs:
-- Home: ff834382-4186-4ba1-9c56-bd8baa5c04ae (Sunshine Children Home)
-- Trust: 1a48b16c-b567-4b39-97ec-c34fac76c250 (Chellamuthu Charitable Trust)
-- Donor: 0dbe0949-e68f-4dc8-8137-556bf7b8e67f (Donor Demo)

INSERT INTO food_slots (home_id, trust_id, date, time_slot, status, donor_id, note, max_sponsors_allowed, current_sponsors_count) VALUES
-- Past Week (Dec 1-5): Completed sponsorships showing success
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-01', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Breakfast sponsored by local business', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-01', 'AFTERNOON', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Lunch - Monthly donor commitment', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-01', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Dinner sponsored', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-02', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Special breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-02', 'AFTERNOON', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-03', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Birthday celebration breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-03', 'AFTERNOON', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Birthday celebration lunch', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-03', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Birthday celebration dinner', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-04', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-04', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Awaiting payment confirmation', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-05', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Weekly recurring sponsor', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-05', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', NULL, 1, 1),

-- Current Week (Dec 6-12): Active mix showing real-time management
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-06', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Saturday breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-06', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Payment pending', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-06', 'EVENING', 'NEED', NULL, 'Dinner requirement - looking for sponsor', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-07', 'MORNING', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Sunday brunch booked', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-07', 'AFTERNOON', 'NEED', NULL, 'Sunday lunch needed', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-07', 'EVENING', 'NEED', NULL, 'Sunday dinner needed', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-08', 'MORNING', 'NEED', NULL, 'Breakfast requirement', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-08', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Lunch committed', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-08', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Dinner sponsored', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-09', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Tuesday breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-09', 'AFTERNOON', 'NEED', NULL, 'Lunch sponsor needed', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-09', 'EVENING', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Dinner booked', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-10', 'MORNING', 'NEED', NULL, 'Wednesday breakfast', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-10', 'AFTERNOON', 'NEED', NULL, 'Wednesday lunch', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-10', 'EVENING', 'NEED', NULL, 'Wednesday dinner', 1, 0),

-- Mid Month (Dec 11-20): Upcoming opportunities
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-11', 'MORNING', 'NEED', NULL, 'Thursday breakfast needed', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-11', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Early booking for lunch', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-12', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-12', 'AFTERNOON', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-12', 'EVENING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-14', 'MORNING', 'NEED', NULL, 'Sunday breakfast', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-14', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Ancestor remembrance lunch', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-14', 'EVENING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-15', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-15', 'AFTERNOON', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-18', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-18', 'EVENING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-20', 'MORNING', 'NEED', NULL, 'Weekend breakfast', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-20', 'AFTERNOON', 'NEED', NULL, NULL, 1, 0),

-- Christmas Week (Dec 21-25): Special festival planning
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-24', 'MORNING', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Eve breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-24', 'AFTERNOON', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Eve lunch celebration', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-24', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Eve special dinner', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-25', 'MORNING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Day breakfast feast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-25', 'AFTERNOON', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Day grand lunch', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-25', 'EVENING', 'PAID', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'Christmas Day celebration dinner', 1, 1),

-- New Year Week (Dec 26-31): Upcoming opportunities
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-26', 'MORNING', 'NEED', NULL, 'Post-Christmas breakfast', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-26', 'AFTERNOON', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-27', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-28', 'AFTERNOON', 'NEED', NULL, 'Weekend lunch', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-29', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-29', 'EVENING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-30', 'MORNING', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-30', 'AFTERNOON', 'NEED', NULL, NULL, 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-31', 'MORNING', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'New Year Eve breakfast', 1, 1),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-31', 'AFTERNOON', 'NEED', NULL, 'New Year Eve lunch - sponsor needed', 1, 0),
('ff834382-4186-4ba1-9c56-bd8baa5c04ae', '1a48b16c-b567-4b39-97ec-c34fac76c250', '2025-12-31', 'EVENING', 'BOOKED', '0dbe0949-e68f-4dc8-8137-556bf7b8e67f', 'New Year Eve celebration dinner', 1, 1);