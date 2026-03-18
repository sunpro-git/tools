-- 反響集計用RPC: 重複排除済みの集計データを返す

-- 1. フィルタ選択肢（案件種別・反響区分の一覧）
CREATE OR REPLACE FUNCTION get_inquiry_filters()
RETURNS json
LANGUAGE sql STABLE
AS $$
  SELECT json_build_object(
    'deal_types',
    (SELECT coalesce(json_agg(t ORDER BY t), '[]'::json)
     FROM (SELECT DISTINCT deal_category AS t FROM deals WHERE deal_category IS NOT NULL) sub),
    'response_categories',
    (SELECT coalesce(json_agg(t ORDER BY t), '[]'::json)
     FROM (SELECT DISTINCT response_category AS t FROM deals WHERE response_category IS NOT NULL) sub)
  );
$$;

-- 2. 重複排除済み月別集計
-- 同一顧客×同一案件種別は反響日が最も早い1件のみ残す
-- 返却: period(YYYY-MM), response_category, response_category_detail, cnt, contracted
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
  WITH deduped AS (
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
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
    ORDER BY
      COALESCE(customer_andpad_id, 'noid_' || id::text),
      COALESCE(deal_category, 'その他'),
      inquiry_date ASC
  ),
  filtered AS (
    SELECT *
    FROM deduped
    WHERE (p_deal_type IS NULL OR deal_category = p_deal_type)
      AND (p_response_categories IS NULL OR response_category = ANY(p_response_categories))
  ),
  contracted_keys AS (
    SELECT DISTINCT customer_andpad_id, COALESCE(deal_category, 'その他') AS dc
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
  )
  SELECT
    to_char(f.inquiry_date, 'YYYY-MM') AS period,
    COALESCE(f.response_category, '未分類') AS response_category,
    COALESCE(f.response_category_detail, '未分類') AS response_category_detail,
    count(*) AS cnt,
    count(*) FILTER (
      WHERE f.customer_andpad_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM contracted_keys ck
          WHERE ck.customer_andpad_id = f.customer_andpad_id
            AND ck.dc = COALESCE(f.deal_category, 'その他')
        )
    ) AS contracted
  FROM filtered f
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3;
$$;

-- 3. 詳細一覧（期間指定でオンデマンド取得）
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
  WITH deduped AS (
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
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
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
  WHERE (p_deal_type IS NULL OR d.deal_category = p_deal_type)
    AND (p_response_categories IS NULL OR d.response_category = ANY(p_response_categories))
    AND (p_period_from IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') >= p_period_from)
    AND (p_period_to IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') <= p_period_to)
  ORDER BY d.inquiry_date DESC;
$$;
