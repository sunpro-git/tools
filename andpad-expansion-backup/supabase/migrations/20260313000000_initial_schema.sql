-- ANDPAD集計ダッシュボード: 初期スキーマ

-- 既存テーブルをクリーンアップ（依存関係順）
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS csv_imports CASCADE;

-- CSVインポート履歴
CREATE TABLE csv_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  table_name text NOT NULL,
  row_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 顧客
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  andpad_id text UNIQUE,
  name text NOT NULL,
  name_kana text,
  customer_type text,
  postal_code text,
  prefecture text,
  address text,
  phone1 text,
  phone2 text,
  email text,
  fax text,
  rank text,
  classification text,
  gender text,
  birth_date date,
  staff_store text,
  staff_name text,
  referrer text,
  dm_allowed text,
  notes text,
  source text,
  first_contact_date date,
  csv_import_id uuid REFERENCES csv_imports(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_customers_andpad_id ON customers(andpad_id);
CREATE INDEX idx_customers_staff_name ON customers(staff_name);
CREATE INDEX idx_customers_source ON customers(source);

-- 物件
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  andpad_id text UNIQUE,
  management_id text,
  customer_id uuid REFERENCES customers(id),
  property_type text,
  name text NOT NULL,
  name_kana text,
  room_number text,
  address_type text,
  postal_code text,
  prefecture text,
  address text,
  latitude text,
  longitude text,
  phone text,
  access text,
  built_date text,
  floor_area text,
  layout text,
  structure text,
  total_units text,
  notes text,
  csv_import_id uuid REFERENCES csv_imports(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_properties_andpad_id ON properties(andpad_id);
CREATE INDEX idx_properties_customer_id ON properties(customer_id);

-- 案件
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  andpad_id text UNIQUE,
  management_id text,
  inquiry_number text,
  name text NOT NULL,
  deal_type text,
  store_code text,
  store_name text,
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  property_id uuid REFERENCES properties(id),
  staff_name text,
  source text,
  status text DEFAULT '問い合わせ'
    CHECK (status IN ('問い合わせ', '商談', '見積', '受注', '着工', '施工中', '完工', '失注', 'その他')),
  estimate_amount bigint,
  order_amount bigint,
  inquiry_date date,
  meeting_date date,
  estimate_date date,
  order_date date,
  start_date date,
  completion_date date,
  lost_date date,
  category text,
  notes text,
  csv_import_id uuid REFERENCES csv_imports(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_deals_andpad_id ON deals(andpad_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_source ON deals(source);
CREATE INDEX idx_deals_staff_name ON deals(staff_name);
CREATE INDEX idx_deals_order_date ON deals(order_date);
CREATE INDEX idx_deals_completion_date ON deals(completion_date);
CREATE INDEX idx_deals_inquiry_date ON deals(inquiry_date);
CREATE INDEX idx_deals_store_name ON deals(store_name);

-- 契約
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  andpad_id text UNIQUE,
  deal_id uuid REFERENCES deals(id),
  deal_management_id text,
  contract_number text,
  inquiry_number text,
  deal_name text,
  deal_type text,
  store_code text,
  store_name text,
  contract_name text,
  contract_type text,
  estimate_id text,
  sales_amount_tax_included bigint,
  sales_amount_tax_excluded bigint,
  cost_amount bigint,
  reserve_cost bigint,
  gross_profit bigint,
  gross_profit_rate numeric(10, 6),
  is_main_contract boolean DEFAULT false,
  contract_date date,
  tax_rate numeric(5, 2),
  csv_import_id uuid REFERENCES csv_imports(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contracts_andpad_id ON contracts(andpad_id);
CREATE INDEX idx_contracts_deal_id ON contracts(deal_id);
CREATE INDEX idx_contracts_contract_date ON contracts(contract_date);
CREATE INDEX idx_contracts_store_name ON contracts(store_name);
