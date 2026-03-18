-- v4 fix: 列名衝突回避版（エイリアスで対処）

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
LANGUAGE sql STABLE
AS $$
  WITH deduped AS (
    SELECT DISTINCT ON (d.customer_andpad_id, d.deal_category)
      d.id,
      d.inquiry_date,
      d.deal_category AS d_deal_category,
      d.customer_andpad_id AS d_cust_id,
      d.response_category AS d_resp_cat,
      d.response_category_detail AS d_resp_detail
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR d.deal_category = p_deal_type)
    ORDER BY d.customer_andpad_id, d.deal_category, d.inquiry_date ASC
  ),
  no_cust AS (
    SELECT
      d.id,
      d.inquiry_date,
      d.deal_category AS d_deal_category,
      d.customer_andpad_id AS d_cust_id,
      d.response_category AS d_resp_cat,
      d.response_category_detail AS d_resp_detail
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR d.deal_category = p_deal_type)
  ),
  combined AS (
    SELECT * FROM deduped
    UNION ALL
    SELECT * FROM no_cust
  ),
  filtered AS (
    SELECT * FROM combined c
    WHERE (p_response_categories IS NULL OR c.d_resp_cat = ANY(p_response_categories))
  ),
  contracted_ids AS (
    SELECT DISTINCT d.customer_andpad_id AS cid
    FROM deals d
    WHERE d.order_date IS NOT NULL
      AND d.customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR d.deal_category = p_deal_type)
  )
  SELECT
    to_char(f.inquiry_date, 'YYYY-MM') AS period,
    COALESCE(f.d_resp_cat, '未分類') AS response_category,
    COALESCE(f.d_resp_detail, '未分類') AS response_category_detail,
    count(*)::bigint AS cnt,
    count(*) FILTER (
      WHERE f.d_cust_id IN (SELECT ci.cid FROM contracted_ids ci)
    )::bigint AS contracted
  FROM filtered f
  GROUP BY 1, 2, 3
  ORDER BY 1, 2, 3;
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
LANGUAGE sql STABLE
AS $$
  WITH deduped AS (
    SELECT DISTINCT ON (d.customer_andpad_id, d.deal_category)
      d.customer_name AS d_cust_name,
      d.name AS d_deal_name,
      d.deal_category AS d_deal_cat,
      d.response_category AS d_resp_cat,
      d.response_category_detail AS d_resp_detail,
      d.inquiry_date AS d_inq_date,
      d.order_date AS d_order_date,
      d.store_name AS d_store,
      d.staff_name AS d_staff,
      d.andpad_id AS d_andpad
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NOT NULL
      AND (p_deal_type IS NULL OR d.deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') <= p_period_to)
    ORDER BY d.customer_andpad_id, d.deal_category, d.inquiry_date ASC
  ),
  no_cust AS (
    SELECT
      d.customer_name AS d_cust_name,
      d.name AS d_deal_name,
      d.deal_category AS d_deal_cat,
      d.response_category AS d_resp_cat,
      d.response_category_detail AS d_resp_detail,
      d.inquiry_date AS d_inq_date,
      d.order_date AS d_order_date,
      d.store_name AS d_store,
      d.staff_name AS d_staff,
      d.andpad_id AS d_andpad
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NULL
      AND (p_deal_type IS NULL OR d.deal_category = p_deal_type)
      AND (p_period_from IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') >= p_period_from)
      AND (p_period_to IS NULL OR to_char(d.inquiry_date, 'YYYY-MM') <= p_period_to)
  ),
  combined AS (
    SELECT * FROM deduped
    UNION ALL
    SELECT * FROM no_cust
  )
  SELECT
    c.d_cust_name AS customer_name,
    c.d_deal_name AS deal_name,
    c.d_deal_cat AS deal_category,
    COALESCE(c.d_resp_cat, '未分類') AS response_category,
    COALESCE(c.d_resp_detail, '未分類') AS response_category_detail,
    c.d_inq_date AS inquiry_date,
    c.d_order_date AS order_date,
    c.d_store AS store_name,
    c.d_staff AS staff_name,
    c.d_andpad AS andpad_id
  FROM combined c
  WHERE (p_response_categories IS NULL OR c.d_resp_cat = ANY(p_response_categories))
  ORDER BY c.d_inq_date DESC;
$$;
