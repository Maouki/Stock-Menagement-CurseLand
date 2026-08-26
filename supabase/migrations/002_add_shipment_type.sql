-- Add type column to shipments (in = รับเข้า, out = จ่ายออก)
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'in' CHECK (type IN ('in', 'out'));

UPDATE public.shipments SET type = 'in' WHERE type IS NULL;
