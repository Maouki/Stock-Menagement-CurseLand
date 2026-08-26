-- Finance records table (daily income & expenses)
CREATE TABLE IF NOT EXISTS public.finance_records (
  id          BIGSERIAL PRIMARY KEY,
  record_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  source      TEXT          NOT NULL, -- 'boardgame' | 'restaurant' | 'grab' | 'expense'
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  net_amount  NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  notes       TEXT          DEFAULT '',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_date   ON public.finance_records (record_date);
CREATE INDEX IF NOT EXISTS idx_finance_type   ON public.finance_records (type);

ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_all" ON public.finance_records;
CREATE POLICY "finance_all" ON public.finance_records FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_read"   ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_read"   ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');
