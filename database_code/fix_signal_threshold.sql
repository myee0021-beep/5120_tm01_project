-- Rebuild signal_threshold in the shape the site reads (same as public/signal_threshold.json).
-- The live table was created with other columns (indicator, band_low, band_med, band_high, ...) and is empty,
-- so it is dropped and created again. Values are the D46 bands signed on 26 September 2026.
BEGIN;

DROP TABLE IF EXISTS signal_threshold;

CREATE TABLE signal_threshold (
  signal text NOT NULL,
  band text NOT NULL,
  lower_bound integer NOT NULL,
  score integer NOT NULL,
  decision text NOT NULL,
  signed_date date,
  PRIMARY KEY (signal, band)
);

INSERT INTO signal_threshold(signal,band,lower_bound,score,decision,signed_date) VALUES
('records','low',1,1,'D46','2026-09-26'),('records','medium',50,2,'D46','2026-09-26'),('records','high',500,3,'D46','2026-09-26'),
('complaints','low',1,1,'D46','2026-09-26'),('complaints','medium',50,2,'D46','2026-09-26'),('complaints','high',500,3,'D46','2026-09-26'),
('attractants','low',1,1,'D46','2026-09-26'),('attractants','medium',2,2,'D46','2026-09-26'),('attractants','high',4,3,'D46','2026-09-26'),
('combined','low',0,1,'D46','2026-09-26'),('combined','medium',3,2,'D46','2026-09-26'),('combined','high',6,3,'D46','2026-09-26'),
('min_records','minimum',30,0,'D46','2026-09-26');

COMMIT;

-- Check: 13 rows
SELECT signal, band, lower_bound, score, decision, signed_date FROM signal_threshold ORDER BY signal, score;
