
-- Update existing AAKAASH entry
UPDATE homes SET name = 'AAKAASH - Special School', 
  address = 'Janadeepam Building M.S.Chellamuthu Gardens, 4/130, Ayuthampatti, A. Valayapatti panchayat, Alagar Kovil(post), Melur (TK), Madurai (Dt)',
  contact_details = 'Email: aakaash@msctrust.org | Phone: 9500969660',
  pincode = '625301'
WHERE id = '50cbdd0b-bef0-4ab8-9c68-976a5a3150aa';

-- Insert 14 new homes
INSERT INTO homes (trust_id, name, type, address, city, state, country, pincode, contact_details) VALUES
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'MSCT&RF Central Office & Bodhi', 'mixed', '4/130, Ayuthampatti, A. Valayapatti panchayat, Alagar Kovil(post), Melur (TK), Madurai (Dt)', 'Madurai', 'Tamil Nadu', 'India', '625301', 'Email: info@msctrust.org | Phone: 9629911348'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Halfway Home', 'mixed', 'Amma Mandapam, Nayakanpatti Village, Aalgarkovil Mail Road, Alagarkovil Post, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625301', 'Email: halfwayhome.mdu@msctrust.org | Phone: 9629911350'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'De-Addiction Centre - 30 Bedded', 'others', '19 A, Sudalaimuthu Pillai Lane, East Sandhai Pettai, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625009', 'Email: dactrishulmsctrust@gmail.com | Phone: 9629911354'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Home for Adult Persons with Mental Ill - Palani', 'others', 'Puthu Dharapuram Road, Ramakrishna Hostel Or Mananalakapagam, Indra Nagar, Palani', 'Palani', 'Tamil Nadu', 'India', '624601', 'Email: mihome.palani@msctrust.org | Phone: 8754006598'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Shakthi Press - VTC for Mentally Ill', 'others', 'Ramaiah Street, Shenoy Nagar, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625020', 'Email: placements@msctrust.org | Phone: 9629904488'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Home for Mentally Ill - Madurai', 'others', 'Angayarkanni Kalyanamandapam, Ayyanar Kovil Street, Aruldoos Puram, Opp to Corporation Water Tank, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625001', 'Email: mihome.mdu@msctrust.org | Phone: 9600286222'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Home for Adult MR', 'others', 'East Panchayat Union, Kalyana Mahal, Perungudi Panchayat, Tirumohur Post, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625006', 'Email: mrhome.mdu@msctrust.org | Phone: 9500969070'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'MS Chellamuthu Institute of Mental Health', 'others', 'Plot No:7, 5th Street, Lake Area, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625107', 'Email: admin@mscimhr.org | Phone: 9629911357'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Home for Mentally Ill - Ervadi', 'others', 'Govt Hospital Building Home for Mentally Ill, Ervadi, Ramanathapuram', 'Ramanathapuram', 'Tamil Nadu', 'India', '623517', 'Email: mihome.erwadi@msctrust.org | Phone: 9500969071'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Community Based Rehabilitation', 'others', 'Shakthi Nagar 2nd Street, Kannanthel Road, Iyer Bungalow, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625014', 'Email: cmhp@msctrust.org | Phone: 9629911346'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Emergency Care & Recovery Centre (ECRC)', 'others', 'The Government Thoracic Hospital (TB Hospital), New Austinpatti, Thoppur, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625008', 'Email: ecrc.mdu@msctrust.org | Phone: 9626969132'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Happy Schooling', 'special_children', 'Plot No:7, 5th Street, Lake Area, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625107', 'Email: selva.mscimhr@gmail.com | Phone: 9843117117'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Magilchi - Chennai', 'others', 'Gurunak College, Velachery, Chennai', 'Chennai', 'Tamil Nadu', 'India', '600042', 'Email: magilchi.che@msctrust.org | Phone: 9159864221'),
('1a48b16c-b567-4b39-97ec-c34fac76c250', 'Magilchi Madurai', 'others', '643, K.K.Nagar, Madurai', 'Madurai', 'Tamil Nadu', 'India', '625020', 'Email: magilchi.mdu@msctrust.org | Phone: 9087646449');

-- Add demo photos for ALL homes (existing + new) using picsum placeholder images
INSERT INTO home_photos (home_id, url, caption, display_order, is_primary) 
SELECT h.id, 'https://picsum.photos/seed/' || encode(h.name::bytea, 'hex') || '1/800/600', 'Campus view', 0, true
FROM homes h WHERE h.trust_id = '1a48b16c-b567-4b39-97ec-c34fac76c250';

INSERT INTO home_photos (home_id, url, caption, display_order, is_primary)
SELECT h.id, 'https://picsum.photos/seed/' || encode(h.name::bytea, 'hex') || '2/800/600', 'Facility overview', 1, false
FROM homes h WHERE h.trust_id = '1a48b16c-b567-4b39-97ec-c34fac76c250';

INSERT INTO home_photos (home_id, url, caption, display_order, is_primary)
SELECT h.id, 'https://picsum.photos/seed/' || encode(h.name::bytea, 'hex') || '3/800/600', 'Activities area', 2, false
FROM homes h WHERE h.trust_id = '1a48b16c-b567-4b39-97ec-c34fac76c250';
