-- departments に business_type を追加
ALTER TABLE departments ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT '新築';
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE departments ADD CONSTRAINT departments_name_btype_unique UNIQUE (name, business_type);

-- 既存データを新築として、リフォーム用に同じ部門を複製
INSERT INTO departments (name, sort_order, business_type)
SELECT name, sort_order, 'リフォーム' FROM departments WHERE business_type = '新築'
ON CONFLICT (name, business_type) DO NOTHING;

-- staff_departments に business_type を追加
ALTER TABLE staff_departments ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT '新築';

-- targets テーブルを作成（未作成の場合）
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sn_year integer NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  month text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  business_type text NOT NULL DEFAULT '新築',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT targets_sn_year_dept_cat_month_btype_key
    UNIQUE (sn_year, department, category, month, business_type)
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can all" ON targets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
