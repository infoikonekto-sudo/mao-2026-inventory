-- Create storage bucket for delivery signatures
-- This will store signature images as PNG files

-- Create bucket (run this in Supabase SQL Editor or Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-signatures', 'delivery-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for delivery-signatures bucket

-- Policy: Allow authenticated users to upload signatures
CREATE POLICY "Allow authenticated users to upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-signatures');

-- Policy: Allow authenticated users to read signatures
CREATE POLICY "Allow users to read signatures from their license"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-signatures');

-- Policy: Allow users to delete their own signatures or admins
CREATE POLICY "Allow users to delete own signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'delivery-signatures'
  AND (
    auth.uid() = owner
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
);
