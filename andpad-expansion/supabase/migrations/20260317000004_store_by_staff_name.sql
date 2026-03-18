-- 担当者が「会社管理」の案件を顧客住所で店舗振り分け
-- 以前のstore_name判定ではなく、staff_nameで判定するよう変更

-- 1. 以前の住所判定分を元に戻す（再判定するため）
UPDATE deals
SET store_name = '品質管理・アフターセールス'
WHERE store_name LIKE '%会社管理';

-- ただし元のstore_nameがわからないので、直接staff_nameベースで再設定

-- 2. 担当者が「会社管理」の案件を顧客住所で振り分け
UPDATE deals d
SET store_name = sub.new_store
FROM (
  SELECT
    d2.id,
    CASE
      WHEN cu.address ~ '松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町'
        THEN '本社　会社管理'
      WHEN cu.address ~ '長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村'
        THEN '長野　会社管理'
      WHEN cu.address ~ '上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村'
        THEN '上田　会社管理'
      WHEN cu.address ~ '伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村'
        THEN '伊那　会社管理'
      ELSE NULL
    END AS new_store
  FROM deals d2
  LEFT JOIN customers cu ON cu.andpad_id = d2.customer_andpad_id
  WHERE d2.staff_name LIKE '%会社管理%'
) sub
WHERE d.id = sub.id
  AND sub.new_store IS NOT NULL;

-- 3. RPCも担当者ベースに更新
CREATE OR REPLACE FUNCTION resolve_store_name(
  original_store text,
  cust_address text,
  cust_prefecture text
)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(original_store, '不明')
$$;

-- RPCのget_inquiry_summary_allを更新: resolve_store_nameを使わず直接store_nameを使用
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
  contracted AS (
    SELECT DISTINCT ON (customer_andpad_id)
      customer_andpad_id AS cid,
      order_amount
    FROM deals
    WHERE order_date IS NOT NULL
      AND customer_andpad_id IS NOT NULL
    ORDER BY customer_andpad_id, order_date ASC
  ),
  with_flag AS (
    SELECT
      c.*,
      CASE WHEN ct.cid IS NOT NULL THEN 1 ELSE 0 END AS is_contracted,
      COALESCE(ct.order_amount, 0) AS contract_amount
    FROM combined c
    LEFT JOIN contracted ct ON ct.cid = c.customer_andpad_id
  ),
  summary AS (
    SELECT
      to_char(w.inquiry_date, 'YYYY-MM') AS period,
      COALESCE(w.deal_category, 'その他') AS deal_category,
      COALESCE(w.store_name, '不明') AS store_name,
      COALESCE(w.response_category, '未分類') AS response_category,
      COALESCE(w.response_category_detail, '未分類') AS response_category_detail,
      count(*)::bigint AS cnt,
      sum(w.is_contracted)::bigint AS contracted,
      sum(CASE WHEN w.is_contracted = 1 THEN w.contract_amount ELSE 0 END)::bigint AS contract_amount
    FROM with_flag w
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY 1, 2, 3, 4, 5
  )
  SELECT COALESCE(json_agg(row_to_json(summary)), '[]'::json) FROM summary;
$$;
