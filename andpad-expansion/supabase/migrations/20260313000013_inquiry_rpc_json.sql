-- 反響集計RPC: JSON一括返却版（PostgREST 1000行制限を回避）

CREATE OR REPLACE FUNCTION get_inquiry_summary_json(
  p_deal_type text DEFAULT NULL,
  p_response_categories text[] DEFAULT NULL
)
RETURNS json
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
  ),
  summary AS (
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
    ORDER BY 1, 2, 3
  )
  SELECT COALESCE(json_agg(row_to_json(summary)), '[]'::json) FROM summary;
$$;
