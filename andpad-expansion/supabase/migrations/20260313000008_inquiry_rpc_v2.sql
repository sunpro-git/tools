-- 反響集計用RPC v2: パフォーマンス改善版
-- フィルタをDISTINCT ON前に適用し、インデックスを活用

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_deals_inquiry_date ON deals (inquiry_date)
  WHERE inquiry_date IS NOT NULL AND inquiry_date >= '2019-09-01';
CREATE INDEX IF NOT EXISTS idx_deals_customer_category ON deals (customer_andpad_id, deal_category);
CREATE INDEX IF NOT EXISTS idx_deals_order_date ON deals (order_date)
  WHERE order_date IS NOT NULL;

-- 2. 重複排除済み月別集計（高速版）
-- フィルタを先に適用してからDISTINCT ON
CREATE OR REPLACE FUNCTION get_inquiry_summary(
  p_deal_type text DEFAULT NULL,
  p_response_categories text[] DEFAULT NULL
)
RETURNS TABLE(
  period text,
  response_category text,
  response_category_detail text,
  cnt bigint,
  contracted bigint
)
LANGUAGE sql STABLE
AS $$
  WITH base AS (
    SELECT *
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
      AND (p_response_categories IS NULL OR response_category = ANY(p_response_categories))
  ),
  deduped AS (
    SELECT DISTINCT ON (
      COALESCE(customer_andpad_id, 'noid_' || id::text),
      COALESCE(deal_category, 'その他')
    )
      id,
      inquiry_date,
      deal_category,
      customer_andpad_id,
      response_category,
      response_category_detail
    FROM base
    ORDER BY
      COALESCE(customer_andpad_id, 'noid_' || id::text),
      COALESCE(deal_category, 'その他'),
      inquiry_date ASC
  ),
  contracted_ids AS (
    SELECT DISTINCT customer_andpad_id
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
  )
  SELECT
    to_char(d.inquiry_date, 'YYYY-MM') AS period,
    COALESCE(d.response_category, '未分類') AS response_category,
    COALESCE(d.response_category_detail, '未分類') AS response_category_detail,
    count(*) AS cnt,
    count(*) FILTER (
      WHERE d.customer_andpad_id IS NOT NULL
        AND d.customer_andpad_id IN (SELECT customer_andpad_id FROM contracted_ids)
    ) AS contracted
  FROM deduped d
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3;
$$;

-- 3. 詳細一覧（高速版）
CREATE OR REPLACE FUNCTION get_inquiry_deals(
  p_deal_type text DEFAULT NULL,
  p_response_categories text[] DEFAULT NULL,
  p_period_from text DEFAULT NULL,
  p_period_to text DEFAULT NULL
)
RETURNS TABLE(
  customer_name text,
  deal_name text,
  deal_category text,
  response_category text,
  response_category_detail text,
  inquiry_date date,
  order_date date,
  store_name text,
  staff_name text,
  andpad_id text
)
LANGUAGE sql STABLE
AS $$
  WITH base AS (
    SELECT *
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
      AND (p_response_categories IS NULL OR response_category = ANY(p_response_categories))
      AND (p_period_from IS NULL OR to_char(inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(inquiry_date, 'YYYY-MM') <= p_period_to)
  ),
  deduped AS (
    SELECT DISTINCT ON (
      COALESCE(customer_andpad_id, 'noid_' || id::text),
      COALESCE(deal_category, 'その他')
    )
      customer_name,
      name AS deal_name,
      deal_category,
      customer_andpad_id,
      response_category,
      response_category_detail,
      inquiry_date,
      order_date,
      store_name,
      staff_name,
      andpad_id
    FROM base
    ORDER BY
      COALESCE(customer_andpad_id, 'noid_' || id::text),
      COALESCE(deal_category, 'その他'),
      inquiry_date ASC
  )
  SELECT
    d.customer_name,
    d.deal_name,
    d.deal_category,
    COALESCE(d.response_category, '未分類'),
    COALESCE(d.response_category_detail, '未分類'),
    d.inquiry_date,
    d.order_date,
    d.store_name,
    d.staff_name,
    d.andpad_id
  FROM deduped d
  ORDER BY d.inquiry_date DESC;
$$;
