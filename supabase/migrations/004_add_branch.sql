-- Add branch column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'ปาร์คอิน';

-- Assign existing products to Park In branch
UPDATE products SET branch = 'ปาร์คอิน' WHERE branch IS NULL OR branch = '';
