-- Require a logged-in user (Supabase Auth) for all data access.
-- Before this, policies allowed the anon key full access, so the login screen
-- could be bypassed by calling the API directly.
--
-- Create users in: Supabase Dashboard → Authentication → Users → Add user
--   Email:    <username>@curseland.app   (log in with just "<username>")
--   Password: <password>
--   ✔ Auto Confirm User

-- products / shipments / finance_records
DROP POLICY IF EXISTS "products_all"  ON public.products;
DROP POLICY IF EXISTS "shipments_all" ON public.shipments;
DROP POLICY IF EXISTS "finance_all"   ON public.finance_records;

CREATE POLICY "products_all"  ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shipments_all" ON public.shipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "finance_all"   ON public.finance_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stock_transfers (created outside the migrations; only touch it if present)
DO $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.stock_transfers') IS NOT NULL THEN
    ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname = 'public' AND tablename = 'stock_transfers' LOOP
      EXECUTE format('DROP POLICY %I ON public.stock_transfers', pol.policyname);
    END LOOP;
    CREATE POLICY "transfers_all" ON public.stock_transfers
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Receipt uploads: only logged-in users may upload/delete.
-- (Reading stays public because the bucket is public and images are shown via public URL.)
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'receipts');
