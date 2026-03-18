-- 反響集計RPC: LANGUAGE sql + statement_timeout版
-- plpgsqlだとPostgRESTのスキーマキャッシュ問題が起きるためsqlに戻す
-- IN (SELECT ...) → LEFT JOIN に変更

DROP FUNCTION IF EXISTS get_inquiry_summary_json(text, text[]);

CREATE FUNCTION get_inquiry_summary_json(
  p_deal_type text DEFAULT NULL,
  p_response_categories text[] DEFAULT NULL
)
RETURNS json
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  WITH deduped AS (
    SELECT DISTINCT ON (d.customer_andpad_id, d.deal_category)
      d.id,
      d.inquiry_date,
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
  with_flag AS (
    SELECT
      f.*,
      CASE WHEN ci.cid IS NOT NULL THEN 1 ELSE 0 END AS is_contracted
    FROM filtered f
    LEFT JOIN contracted_ids ci ON ci.cid = f.d_cust_id
  ),
  summary AS (
    SELECT
      to_char(w.inquiry_date, 'YYYY-MM') AS period,
      COALESCE(w.d_resp_cat, '未分類') AS response_category,
      COALESCE(w.d_resp_detail, '未分類') AS response_category_detail,
      count(*)::bigint AS cnt,
      sum(w.is_contracted)::bigint AS contracted
    FROM with_flag w
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3
  )
  SELECT COALESCE(json_agg(row_to_json(summary)), '[]'::json) FROM summary;
$$;
