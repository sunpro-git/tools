ALTER TABLE deals ADD COLUMN IF NOT EXISTS followup_active boolean NOT NULL DEFAULT false;
