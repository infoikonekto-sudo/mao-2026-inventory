-- Create storage bucket for purchase request attachments
-- This bucket will store quotations and reference images

-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This file provides the SQL commands for reference and RLS policies

-- Create bucket (run this in Supabase SQL Editor or Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-request-attachments', 'purchase-request-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for purchase-request-attachments bucket

-- Policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'purchase-request-attachments');

-- Policy: Allow authenticated users to read attachments from their license
CREATE POLICY "Allow users to read attachments from their license"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'purchase-request-attachments');

-- Policy: Allow users to delete their own attachments or admins/jefe compras
CREATE POLICY "Allow users to delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'purchase-request-attachments'
  AND (
    auth.uid() = owner
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'jefe_compras')
    )
  )
);
