-- 既存の会社管理アカウント案件のstore_nameを顧客住所で振り分け
-- 地域店舗にマッチしないstore_nameを「○○　会社管理」に更新

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
  WHERE d2.store_name IS NOT NULL
    AND d2.store_name !~ '本社|松本|長野|上田|伊那'
) sub
WHERE d.id = sub.id
  AND sub.new_store IS NOT NULL;

-- RPCのresolve_store_nameも「○○　会社管理」形式に更新
CREATE OR REPLACE FUNCTION resolve_store_name(
  original_store text,
  cust_address text,
  cust_prefecture text
)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN original_store ~ '本社|松本' THEN original_store
    WHEN original_store ~ '長野' THEN original_store
    WHEN original_store ~ '上田' THEN original_store
    WHEN original_store ~ '伊那' THEN original_store
    WHEN COALESCE(cust_address, '') ~ '松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町'
      THEN '本社　会社管理'
    WHEN COALESCE(cust_address, '') ~ '長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村'
      THEN '長野　会社管理'
    WHEN COALESCE(cust_address, '') ~ '上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村'
      THEN '上田　会社管理'
    WHEN COALESCE(cust_address, '') ~ '伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村'
      THEN '伊那　会社管理'
    ELSE COALESCE(original_store, '不明')
  END
$$;
