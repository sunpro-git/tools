-- DISTINCT ON (customer_andpad_id, deal_category) WHERE deal_category = X 用の最適インデックス
-- deal_categoryを先頭にすることで、特定の案件種別のDISTINCT ONが高速になる
CREATE INDEX IF NOT EXISTS idx_deals_cat_cust_inq
  ON deals (deal_category, customer_andpad_id, inquiry_date ASC)
  WHERE inquiry_date IS NOT NULL AND inquiry_date >= '2019-09-01' AND customer_andpad_id IS NOT NULL;

-- customer_andpad_idがNULLの行用
CREATE INDEX IF NOT EXISTS idx_deals_cat_nocust_inq
  ON deals (deal_category, inquiry_date ASC)
  WHERE inquiry_date IS NOT NULL AND inquiry_date >= '2019-09-01' AND customer_andpad_id IS NULL;

-- 契約者検索用
CREATE INDEX IF NOT EXISTS idx_deals_contracted_cat
  ON deals (deal_category, customer_andpad_id)
  WHERE order_date IS NOT NULL AND customer_andpad_id IS NOT NULL;
