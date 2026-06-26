-- Update foreign key constraints on needs table to use ON DELETE SET NULL
-- This allows categories to be deleted while preserving the needs records

-- Drop existing constraints and recreate with ON DELETE SET NULL
ALTER TABLE needs DROP CONSTRAINT IF EXISTS needs_category_id_fkey;
ALTER TABLE needs ADD CONSTRAINT needs_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Make category_id nullable since it can now be SET NULL
ALTER TABLE needs ALTER COLUMN category_id DROP NOT NULL;

-- Update subcategory foreign key
ALTER TABLE needs DROP CONSTRAINT IF EXISTS needs_subcategory_id_fkey;
ALTER TABLE needs ADD CONSTRAINT needs_subcategory_id_fkey 
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL;

-- Update sub_subcategory foreign key  
ALTER TABLE needs DROP CONSTRAINT IF EXISTS needs_sub_subcategory_id_fkey;
ALTER TABLE needs ADD CONSTRAINT needs_sub_subcategory_id_fkey 
  FOREIGN KEY (sub_subcategory_id) REFERENCES sub_subcategories(id) ON DELETE SET NULL;

-- Also update subcategories to cascade delete when parent category is deleted
ALTER TABLE subcategories DROP CONSTRAINT IF EXISTS subcategories_category_id_fkey;
ALTER TABLE subcategories ADD CONSTRAINT subcategories_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- Update sub_subcategories to cascade delete when parent subcategory is deleted
ALTER TABLE sub_subcategories DROP CONSTRAINT IF EXISTS sub_subcategories_subcategory_id_fkey;
ALTER TABLE sub_subcategories ADD CONSTRAINT sub_subcategories_subcategory_id_fkey
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE;