-- 会社管理アカウントの案件を顧客住所から店舗エリアに振り分け
-- store_nameが地域店舗(本社/松本/長野/上田/伊那)に該当しない場合、顧客住所で判定

CREATE OR REPLACE FUNCTION resolve_store_name(
  original_store text,
  cust_address text,
  cust_prefecture text
)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    -- 既に地域店舗に該当する場合はそのまま返す
    WHEN original_store ~ '本社|松本' THEN original_store
    WHEN original_store ~ '長野' THEN original_store
    WHEN original_store ~ '上田' THEN original_store
    WHEN original_store ~ '伊那' THEN original_store
    -- 会社管理アカウント → 顧客住所から判定
    -- 本社/松本エリア（中信）
    WHEN COALESCE(cust_address, '') ~ '松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町'
      THEN '本社（住所判定）'
    -- 長野エリア（北信）
    WHEN COALESCE(cust_address, '') ~ '長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村'
      THEN '長野（住所判定）'
    -- 上田エリア（東信）
    WHEN COALESCE(cust_address, '') ~ '上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村'
      THEN '上田（住所判定）'
    -- 伊那エリア（南信）
    WHEN COALESCE(cust_address, '') ~ '伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村'
      THEN '伊那（住所判定）'
    -- 県外・住所なし → その他
    ELSE COALESCE(original_store, '不明')
  END
$$;

-- get_inquiry_summary_all を更新: 会社管理アカウントは住所で振り分け
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
      resolve_store_name(d.store_name, cu.address, cu.prefecture) AS store_name
    FROM deals d
    LEFT JOIN customers cu ON cu.andpad_id = d.customer_andpad_id
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
      resolve_store_name(d.store_name, NULL, NULL) AS store_name
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
