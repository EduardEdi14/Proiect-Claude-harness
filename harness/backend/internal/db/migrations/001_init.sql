-- Libra Maker — initial schema.
-- Run once against the target database:
--   psql $DATABASE_URL -f 001_init.sql
--
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.

-- Extension for UUID generation (Postgres 13+ has gen_random_uuid() built-in).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- users ----------

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    username      TEXT,
    department    TEXT,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- sessions (projects) ----------

CREATE TABLE IF NOT EXISTS sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id       TEXT NOT NULL,
    project_name   TEXT NOT NULL,
    description    TEXT NOT NULL,
    workspace_path TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'queued',
    ticket_id      INTEGER,
    duration_sec   INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,
    handed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx  ON sessions (status);

-- Keep updated_at current automatically.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
