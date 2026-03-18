-- 案件種別カラムを追加
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_category text;
CREATE INDEX IF NOT EXISTS idx_deals_deal_category ON deals (deal_category);
