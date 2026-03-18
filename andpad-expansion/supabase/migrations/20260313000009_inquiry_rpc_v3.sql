-- 反響集計用RPC v3: DISTINCT ON廃止、GROUP BY + MIN + JOIN で高速化
-- 同一顧客×同一案件種別の最初の反響を特定し、そのレコードの反響区分で集計

-- 重複排除の高速化に必要なインデックス
CREATE INDEX IF NOT EXISTS idx_deals_cust_cat_inq ON deals (customer_andpad_id, deal_category, inquiry_date ASC)
  WHERE inquiry_date IS NOT NULL AND inquiry_date >= '2019-09-01';

-- 2. 重複排除済み月別集計（v3: 高速版）
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH first_ids AS (
    -- customer_andpad_idがある行: 顧客×種別ごとに最も早い反響のIDを取得
    SELECT DISTINCT ON (customer_andpad_id, COALESCE(deal_category, 'その他'))
      id
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
    ORDER BY customer_andpad_id, COALESCE(deal_category, 'その他'), inquiry_date ASC
  ),
  no_cust_ids AS (
    -- customer_andpad_idがNULLの行: 各行がユニーク（重複排除なし）
    SELECT id
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
  ),
  all_ids AS (
    SELECT id FROM first_ids
    UNION ALL
    SELECT id FROM no_cust_ids
  ),
  deduped AS (
    SELECT d.id, d.inquiry_date, d.deal_category, d.customer_andpad_id,
           d.response_category, d.response_category_detail
    FROM deals d
    INNER JOIN all_ids a ON a.id = d.id
    WHERE (p_response_categories IS NULL OR d.response_category = ANY(p_response_categories))
  ),
  contracted_ids AS (
    SELECT DISTINCT customer_andpad_id
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
  )
  SELECT
    to_char(d.inquiry_date, 'YYYY-MM'),
    COALESCE(d.response_category, '未分類'),
    COALESCE(d.response_category_detail, '未分類'),
    count(*)::bigint,
    count(*) FILTER (
      WHERE d.customer_andpad_id IS NOT NULL
        AND d.customer_andpad_id IN (SELECT ci.customer_andpad_id FROM contracted_ids ci)
    )::bigint
  FROM deduped d
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3;
END;
$$;

-- 3. 詳細一覧（v3: 高速版）
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH first_ids AS (
    SELECT DISTINCT ON (customer_andpad_id, COALESCE(deal_category, 'その他'))
      id
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(inquiry_date, 'YYYY-MM') <= p_period_to)
    ORDER BY customer_andpad_id, COALESCE(deal_category, 'その他'), inquiry_date ASC
  ),
  no_cust_ids AS (
    SELECT id
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(inquiry_date, 'YYYY-MM') <= p_period_to)
  ),
  all_ids AS (
    SELECT id FROM first_ids
    UNION ALL
    SELECT id FROM no_cust_ids
  )
  SELECT
    d.customer_name,
    d.name,
    d.deal_category,
    COALESCE(d.response_category, '未分類'),
    COALESCE(d.response_category_detail, '未分類'),
    d.inquiry_date,
    d.order_date,
    d.store_name,
    d.staff_name,
    d.andpad_id
  FROM deals d
  INNER JOIN all_ids a ON a.id = d.id
  WHERE (p_response_categories IS NULL OR d.response_category = ANY(p_response_categories))
  ORDER BY d.inquiry_date DESC;
END;
$$;
