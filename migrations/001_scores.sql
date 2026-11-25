BEGIN;
CREATE SCHEMA IF NOT EXISTS multisynq;
CREATE TABLE IF NOT EXISTS multisynq.scores (
  id text PRIMARY KEY,
  initials text NOT NULL CHECK (char_length(btrim(initials)) BETWEEN 1 AND 32),
  score double precision NOT NULL CHECK (score >= 0 AND score < 'Infinity'::double precision),
  avatar_url text CHECK (char_length(avatar_url) <= 2048),
  wpm double precision CHECK (wpm >= 0 AND wpm < 'Infinity'::double precision),
  accuracy double precision CHECK (accuracy BETWEEN 0 AND 100),
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_ranking_idx ON multisynq.scores
  ((score * 2 + COALESCE(accuracy, 0) + COALESCE(wpm, 0) * 1.5) DESC, timestamp ASC, id ASC);
-- Backend connections use the schema owner; Supabase browser roles get no access.
REVOKE ALL ON SCHEMA multisynq FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA multisynq FROM PUBLIC;
ALTER TABLE multisynq.scores ENABLE ROW LEVEL SECURITY;
COMMIT;
