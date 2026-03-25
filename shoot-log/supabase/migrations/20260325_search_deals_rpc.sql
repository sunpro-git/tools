-- 案件検索用RPC関数（statement_timeoutを延長してilike検索を可能にする）
CREATE OR REPLACE FUNCTION search_deals(
  keyword TEXT DEFAULT '',
  category_filter TEXT DEFAULT '',
  staff_filter TEXT DEFAULT '',
  contract_from TEXT DEFAULT '',
  contract_to TEXT DEFAULT '',
  handover_from TEXT DEFAULT '',
  handover_to TEXT DEFAULT '',
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  andpad_id INT,
  customer_andpad_id INT,
  name TEXT,
  customer_name TEXT,
  deal_category TEXT,
  category TEXT,
  role_sales TEXT,
  role_ic TEXT,
  role_construction TEXT,
  order_date TEXT,
  handover_date_actual TEXT,
  handover_date_planned TEXT,
  order_amount TEXT,
  label_office TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- タイムアウトを15秒に延長
  SET LOCAL statement_timeout = '15s';

  RETURN QUERY
  SELECT
    d.id, d.andpad_id, d.customer_andpad_id,
    d.name, d.customer_name, d.deal_category, d.category,
    d.role_sales, d.role_ic, d.role_construction,
    d.order_date::TEXT, d.handover_date_actual::TEXT, d.handover_date_planned::TEXT,
    d.order_amount::TEXT, d.label_office
  FROM deals d
  WHERE d.deal_category IN ('新築', 'リフォーム')
    AND (keyword = '' OR d.name ILIKE '%' || keyword || '%' OR d.customer_name ILIKE '%' || keyword || '%')
    AND (category_filter = '' OR d.deal_category = category_filter)
    AND (staff_filter = '' OR d.role_sales ILIKE '%' || staff_filter || '%' OR d.role_ic ILIKE '%' || staff_filter || '%' OR d.role_construction ILIKE '%' || staff_filter || '%')
    AND (contract_from = '' OR d.order_date >= contract_from || '-01')
    AND (contract_to = '' OR d.order_date <= contract_to || '-31')
    AND (handover_from = '' OR d.handover_date_actual >= handover_from || '-01')
    AND (handover_to = '' OR d.handover_date_actual <= handover_to || '-31')
  ORDER BY d.order_date DESC NULLS LAST
  LIMIT max_results;
END;
$$;
