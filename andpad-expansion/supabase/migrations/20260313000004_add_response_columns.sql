-- 反響種別・反響区分・反響区分詳細カラムを追加
ALTER TABLE deals ADD COLUMN IF NOT EXISTS response_type text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS response_category text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS response_category_detail text;
CREATE INDEX IF NOT EXISTS idx_deals_response_category ON deals (response_category);
