-- 現調日(実績)カラムを追加
ALTER TABLE deals ADD COLUMN IF NOT EXISTS survey_date_actual text;
