-- ============================================================
-- Athlete Tracker — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Daily log
CREATE TABLE IF NOT EXISTS daily_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date UNIQUE NOT NULL,
  sleep_hrs       numeric(4,1),
  hrv_ms          integer,
  rhr_bpm         integer,
  weight_kg       numeric(5,2),
  fatigue         integer CHECK (fatigue BETWEEN 1 AND 10),
  mood            integer CHECK (mood BETWEEN 1 AND 10),
  soreness        integer CHECK (soreness BETWEEN 1 AND 10),
  nrs_notes       text,
  protein_g       integer,
  carbs_g         integer,
  fat_g           integer,
  calories_kcal   integer,
  sugar_notes     text,
  activity_type   text,
  duration_min    integer,
  tss             integer,
  distance_km     numeric(6,1),
  training_notes  text,
  created_at      timestamptz DEFAULT now()
);

-- Goals (single row)
CREATE TABLE IF NOT EXISTS goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_km_offset    numeric DEFAULT 0,
  weight_start        numeric DEFAULT 100,
  weight_target       numeric DEFAULT 95,
  ftp_watts           integer DEFAULT 285
);

-- Races
CREATE TABLE IF NOT EXISTS races (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  date          date NOT NULL,
  distance_km   numeric,
  elevation_m   integer,
  completed     boolean DEFAULT false
);

-- ============================================================
-- Row Level Security — allow all access (single-user app)
-- ============================================================
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all daily_log" ON daily_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all goals"     ON goals     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all races"     ON races     FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed Data
-- ============================================================

-- Goals row
INSERT INTO goals (annual_km_offset, weight_start, weight_target, ftp_watts)
VALUES (0, 100, 95, 285);

-- Race to the Sea
INSERT INTO races (name, date, distance_km, elevation_m, completed)
VALUES ('Race to the Sea', '2026-09-05', 160, 2400, false);
