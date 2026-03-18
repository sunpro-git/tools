-- 反響集計用RPC v4: statement_timeout延長 + シンプルなDISTINCT ON
-- COALESCEを排除してインデックスを直接活用

-- 2. 重複排除済み月別集計
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
SET statement_timeout = '30s'
AS $$
BEGIN
  #variable_conflict use_column
  RETURN QUERY
  WITH deduped AS (
    SELECT DISTINCT ON (customer_andpad_id, deal_category)
      id,
      inquiry_date,
      deal_category,
      customer_andpad_id,
      response_category AS resp_cat,
      response_category_detail AS resp_cat_detail
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
    ORDER BY customer_andpad_id, deal_category, inquiry_date ASC
  ),
  no_cust AS (
    SELECT
      id,
      inquiry_date,
      deal_category,
      customer_andpad_id,
      response_category AS resp_cat,
      response_category_detail AS resp_cat_detail
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
  ),
  combined AS (
    SELECT * FROM deduped
    UNION ALL
    SELECT * FROM no_cust
  ),
  filtered AS (
    SELECT * FROM combined
    WHERE (p_response_categories IS NULL OR resp_cat = ANY(p_response_categories))
  ),
  contracted_ids AS (
    SELECT DISTINCT customer_andpad_id
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR deal_category = p_deal_type)
  )
  SELECT
    to_char(f.inquiry_date, 'YYYY-MM'),
    COALESCE(f.resp_cat, '未分類'),
    COALESCE(f.resp_cat_detail, '未分類'),
    count(*)::bigint,
    count(*) FILTER (
      WHERE f.customer_andpad_id IN (SELECT ci.customer_andpad_id FROM contracted_ids ci)
    )::bigint
  FROM filtered f
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3;
END;
$$;

-- 3. 詳細一覧
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
SET statement_timeout = '30s'
AS $$
BEGIN
  #variable_conflict use_column
  RETURN QUERY
  WITH deduped AS (
    SELECT DISTINCT ON (d2.customer_andpad_id, d2.deal_category)
      d2.customer_name,
      d2.name AS deal_name,
      d2.deal_category,
      d2.response_category AS resp_cat,
      d2.response_category_detail AS resp_cat_detail,
      d2.inquiry_date,
      d2.order_date,
      d2.store_name,
      d2.staff_name,
      d2.andpad_id,
      d2.customer_andpad_id
    FROM deals d2
    WHERE d2.inquiry_date IS NOT NULL
      AND d2.inquiry_date >= '2019-09-01'
      AND d2.customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR d2.deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(d2.inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(d2.inquiry_date, 'YYYY-MM') <= p_period_to)
    ORDER BY d2.customer_andpad_id, d2.deal_category, d2.inquiry_date ASC
  ),
  no_cust AS (
    SELECT
      d2.customer_name,
      d2.name AS deal_name,
      d2.deal_category,
      d2.response_category AS resp_cat,
      d2.response_category_detail AS resp_cat_detail,
      d2.inquiry_date,
      d2.order_date,
      d2.store_name,
      d2.staff_name,
      d2.andpad_id,
      d2.customer_andpad_id
    FROM deals d2
    WHERE d2.inquiry_date IS NOT NULL
      AND d2.inquiry_date >= '2019-09-01'
      AND d2.customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR d2.deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(d2.inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(d2.inquiry_date, 'YYYY-MM') <= p_period_to)
  ),
  combined AS (
    SELECT * FROM deduped
    UNION ALL
    SELECT * FROM no_cust
  )
  SELECT
    c.customer_name,
    c.deal_name,
    c.deal_category,
    COALESCE(c.resp_cat, '未分類'),
    COALESCE(c.resp_cat_detail, '未分類'),
    c.inquiry_date,
    c.order_date,
    c.store_name,
    c.staff_name,
    c.andpad_id
  FROM combined c
  WHERE (p_response_categories IS NULL OR c.resp_cat = ANY(p_response_categories))
  ORDER BY c.inquiry_date DESC;
END;
$$;
