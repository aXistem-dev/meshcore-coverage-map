-- Increase lat/lon precision to support more decimal places
-- Change from DECIMAL(10,4) to DECIMAL(11,8) for centimeter-level precision

ALTER TABLE repeaters 
  ALTER COLUMN lat TYPE DECIMAL(11,8),
  ALTER COLUMN lon TYPE DECIMAL(11,8);

