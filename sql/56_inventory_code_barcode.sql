-- Migration: Unique item_code constraint per license + barcode column
-- Ensures no duplicate codes within the same institution

-- Step 1: Clean up any existing duplicate item_codes within same license
-- (set them to NULL to allow the unique constraint to be created)
UPDATE public.inventory_items a
SET item_code = NULL
WHERE item_code IS NOT NULL
  AND item_code != ''
  AND EXISTS (
    SELECT 1 FROM public.inventory_items b
    WHERE b.license_id = a.license_id
      AND b.item_code = a.item_code
      AND b.id < a.id  -- keep the oldest, null the newer
  );

-- Step 2: Unique constraint for item_code per license
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_item_code_unique
  ON public.inventory_items (license_id, item_code)
  WHERE item_code IS NOT NULL AND item_code != '';

-- Step 3: Add barcode column
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Step 4: Unique constraint for barcode per license
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_unique
  ON public.inventory_items (license_id, barcode)
  WHERE barcode IS NOT NULL AND barcode != '';

-- Step 5: Populate barcode for existing items that have item_code
UPDATE public.inventory_items
SET barcode = item_code
WHERE barcode IS NULL
  AND item_code IS NOT NULL
  AND item_code != '';

-- Permissions
GRANT ALL ON TABLE public.inventory_items TO anon;
GRANT ALL ON TABLE public.inventory_items TO authenticated;
