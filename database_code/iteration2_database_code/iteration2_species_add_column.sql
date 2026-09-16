ALTER TABLE species
ADD COLUMN date_read DATE;
UPDATE species
SET date_read = '2026-09-14';