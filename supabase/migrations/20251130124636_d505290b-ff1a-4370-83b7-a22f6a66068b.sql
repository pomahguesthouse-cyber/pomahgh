-- Drop invoice-related tables
DROP TABLE IF EXISTS invoice_logs CASCADE;
DROP TABLE IF EXISTS invoice_templates CASCADE;

-- Remove invoice-related columns from bookings table
ALTER TABLE bookings 
  DROP COLUMN IF EXISTS invoice_number,
  DROP COLUMN IF EXISTS last_invoice_sent_at;

-- Remove invoice-related columns from hotel_settings table
ALTER TABLE hotel_settings 
  DROP COLUMN IF EXISTS auto_send_invoice,
  DROP COLUMN IF EXISTS invoice_footer_text;

-- Drop the invoice number generator function
DROP FUNCTION IF EXISTS generate_invoice_number();