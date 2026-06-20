/*
# Make payment-screenshots bucket public

Allows public URL generation for payment screenshots.
Admin can view them directly via publicUrl.
*/
UPDATE storage.buckets
SET public = true
WHERE id = 'payment-screenshots';
