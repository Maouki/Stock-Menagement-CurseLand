-- =====================================================================
-- Stock Management System — Initial Schema
-- Run this in the Supabase SQL Editor (or via Supabase CLI)
-- =====================================================================

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id            BIGSERIAL PRIMARY KEY,
  barcode       TEXT        DEFAULT '',
  main_category TEXT        DEFAULT '',
  sub_category  TEXT        DEFAULT '',
  name          TEXT        NOT NULL,
  brand         TEXT        DEFAULT '',
  lab           TEXT        DEFAULT '',
  lot           TEXT        DEFAULT '',
  expiry        DATE,
  initial_stock INTEGER     DEFAULT 0 CHECK (initial_stock >= 0),
  current_stock INTEGER     DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INTEGER     DEFAULT 10 CHECK (min_stock >= 0),
  group_name    TEXT        DEFAULT 'รายการสินค้า',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments table (daily incoming stock log)
CREATE TABLE IF NOT EXISTS public.shipments (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT      NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      INTEGER     NOT NULL CHECK (quantity > 0),
  shipment_date DATE        DEFAULT CURRENT_DATE,
  notes         TEXT        DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_name          ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_main_category ON public.products (main_category);
CREATE INDEX IF NOT EXISTS idx_products_group_name    ON public.products (group_name);
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON public.products (current_stock);
CREATE INDEX IF NOT EXISTS idx_shipments_product_id   ON public.shipments (product_id);
CREATE INDEX IF NOT EXISTS idx_shipments_date         ON public.shipments (shipment_date);

-- Auto-update updated_at on products
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security (allow all for anon — tighten for production)
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_all"  ON public.products;
DROP POLICY IF EXISTS "shipments_all" ON public.shipments;

CREATE POLICY "products_all"  ON public.products  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shipments_all" ON public.shipments FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (full row tracking required for INSERT/UPDATE/DELETE events)
ALTER TABLE public.products  REPLICA IDENTITY FULL;
ALTER TABLE public.shipments REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication (safe — ignores error if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
-- NOTE: If the DO block still fails, enable Realtime manually:
-- Supabase Dashboard → Table Editor → select table → turn on Realtime toggle

-- =====================================================================
-- Sample data (optional — remove if importing from Excel)
-- =====================================================================
INSERT INTO public.products
  (barcode, main_category, sub_category, name, brand, lab, lot, expiry, initial_stock, current_stock, min_stock, group_name)
VALUES
  ('1234567890001', 'Liquid', 'Syrup', 'น้ำเชื่อมสตรอว์เบอร์รี่', 'ParkIn', 'Lab A', 'L001', '2027-06-30', 100, 45, 20, 'รายการสินค้า'),
  ('1234567890002', 'Liquid', 'Syrup', 'น้ำเชื่อมมะนาว', 'ParkIn', 'Lab A', 'L002', '2027-03-15', 80, 8, 20, 'รายการสินค้า'),
  ('1234567890003', 'Dry', 'Powder', 'ผงชาเขียว', 'Matcha Co', 'Lab B', 'M003', '2026-12-31', 50, 0, 10, 'รายการสินค้า'),
  ('1234567890004', 'Liquid', 'Base', 'ครีมเบส', 'BasePro', 'Lab A', 'B004', '2027-09-20', 60, 30, 15, 'รายการสินค้า'),
  ('1234567890005', 'Dry', 'Topping', 'ไข่มุกดำ', 'Pearl', 'Lab C', 'P005', '2026-11-01', 200, 150, 50, 'รายการสินค้า')
ON CONFLICT DO NOTHING;
