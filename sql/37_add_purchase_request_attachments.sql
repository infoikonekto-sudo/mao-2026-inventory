-- Add attachment_url field to purchase_requests table
-- This will store the URL of uploaded quotations/images from Supabase Storage

ALTER TABLE purchase_requests
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

COMMENT ON COLUMN purchase_requests.attachment_url IS 'URL of optional attachment (quotation/image) uploaded to Supabase Storage';
