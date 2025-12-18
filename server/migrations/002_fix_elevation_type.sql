-- Fix elevation column to accept decimal values
-- Change from INTEGER to DECIMAL to store precise elevation values

ALTER TABLE repeaters 
  ALTER COLUMN elev TYPE DECIMAL(10,2);

