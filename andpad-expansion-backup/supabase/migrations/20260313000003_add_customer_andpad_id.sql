-- 案件テーブルに顧客ANDPADIDを追加（重複排除用）
ALTER TABLE deals ADD COLUMN IF NOT EXISTS customer_andpad_id text;
CREATE INDEX IF NOT EXISTS idx_deals_customer_andpad_id ON deals (customer_andpad_id);
