-- フィルタ選択肢に店舗一覧を追加
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
     FROM (SELECT DISTINCT response_category AS t FROM deals WHERE response_category IS NOT NULL) sub),
    'stores',
    (SELECT coalesce(json_agg(t ORDER BY t), '[]'::json)
     FROM (SELECT DISTINCT store_name AS t FROM deals WHERE store_name IS NOT NULL AND store_name <> '') sub)
  );
$$;

-- 集計にstore_nameを追加
CREATE OR REPLACE FUNCTION get_inquiry_summary_all()
RETURNS json
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  WITH deduped AS (
    SELECT DISTINCT ON (d.customer_andpad_id, d.deal_category)
      d.id,
      d.inquiry_date,
      d.deal_category,
      d.customer_andpad_id,
      d.response_category,
      d.response_category_detail,
      d.store_name
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NOT NULL
    ORDER BY d.customer_andpad_id, d.deal_category, d.inquiry_date ASC
  ),
  no_cust AS (
    SELECT
      d.id,
      d.inquiry_date,
      d.deal_category,
      d.customer_andpad_id,
      d.response_category,
      d.response_category_detail,
      d.store_name
    FROM deals d
    WHERE d.inquiry_date IS NOT NULL
      AND d.inquiry_date >= '2019-09-01'
      AND d.customer_andpad_id IS NULL
  ),
  combined AS (
    SELECT * FROM deduped
    UNION ALL
    SELECT * FROM no_cust
  ),
  contracted_ids AS (
    SELECT DISTINCT customer_andpad_id AS cid
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
  ),
  with_flag AS (
    SELECT
      c.*,
      CASE WHEN ci.cid IS NOT NULL THEN 1 ELSE 0 END AS is_contracted
    FROM combined c
    LEFT JOIN contracted_ids ci ON ci.cid = c.customer_andpad_id
  ),
  summary AS (
    SELECT
      to_char(w.inquiry_date, 'YYYY-MM') AS period,
      COALESCE(w.deal_category, 'その他') AS deal_category,
      COALESCE(w.store_name, '不明') AS store_name,
      COALESCE(w.response_category, '未分類') AS response_category,
      COALESCE(w.response_category_detail, '未分類') AS response_category_detail,
      count(*)::bigint AS cnt,
      sum(w.is_contracted)::bigint AS contracted
    FROM with_flag w
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY 1, 2, 3, 4, 5
  )
  SELECT COALESCE(json_agg(row_to_json(summary)), '[]'::json) FROM summary;
$$;
