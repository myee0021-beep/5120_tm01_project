BEGIN;

CREATE TABLE IF NOT EXISTS signal_threshold (
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
('min_records','minimum',30,0,'D46','2026-09-26')
ON CONFLICT(signal,band) DO UPDATE SET lower_bound=EXCLUDED.lower_bound,score=EXCLUDED.score,decision=EXCLUDED.decision,signed_date=EXCLUDED.signed_date;

CREATE SEQUENCE IF NOT EXISTS community_report_seq START 1;
CREATE TABLE IF NOT EXISTS community_report (
  id text PRIMARY KEY,
  species text,
  kind text,
  state text,
  district text,
  week date,
  time text,
  did jsonb NOT NULL DEFAULT '[]'::jsonb,
  worked jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  photo_key text,
  status text NOT NULL CHECK(status IN ('submitted','held','published','deleted')),
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  decided_at timestamptz,
  hold_until timestamptz,
  reason text
);
CREATE INDEX IF NOT EXISTS community_report_public_idx ON community_report(status,state,district,week DESC);
CREATE INDEX IF NOT EXISTS community_report_hold_idx ON community_report(status,hold_until) WHERE status='held';

CREATE TABLE IF NOT EXISTS community_review_log (
  id bigserial PRIMARY KEY,
  ref text NOT NULL,
  decision text NOT NULL,
  reason text NOT NULL,
  at timestamptz NOT NULL DEFAULT NOW(),
  role text NOT NULL DEFAULT 'Reviewer'
);
CREATE INDEX IF NOT EXISTS community_review_log_ref_idx ON community_review_log(ref,at DESC);

COMMIT;
