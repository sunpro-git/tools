-- 検算用: 案件種別ごとの全案件数（反響日あり）と重複排除後の件数を返す

CREATE OR REPLACE FUNCTION get_inquiry_verify_counts()
RETURNS json
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  WITH raw_counts AS (
    SELECT
      COALESCE(deal_category, 'その他') AS deal_category,
      count(*) AS raw_total
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
    GROUP BY 1
  ),
  deduped_with_cust AS (
    SELECT DISTINCT ON (customer_andpad_id, deal_category)
      COALESCE(deal_category, 'その他') AS deal_category
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NOT NULL
    ORDER BY customer_andpad_id, deal_category, inquiry_date ASC
  ),
  deduped_no_cust AS (
    SELECT COALESCE(deal_category, 'その他') AS deal_category
    FROM deals
    WHERE inquiry_date IS NOT NULL
      AND inquiry_date >= '2019-09-01'
      AND customer_andpad_id IS NULL
  ),
  deduped_all AS (
    SELECT deal_category FROM deduped_with_cust
    UNION ALL
    SELECT deal_category FROM deduped_no_cust
  ),
  deduped_counts AS (
    SELECT deal_category, count(*) AS deduped_total
    FROM deduped_all
    GROUP BY 1
  )
  SELECT COALESCE(json_agg(json_build_object(
    'deal_category', r.deal_category,
    'raw_total', r.raw_total,
    'deduped_total', COALESCE(d.deduped_total, 0),
    'duplicates', r.raw_total - COALESCE(d.deduped_total, 0)
  ) ORDER BY r.deal_category), '[]'::json)
  FROM raw_counts r
  LEFT JOIN deduped_counts d ON d.deal_category = r.deal_category;
$$;
