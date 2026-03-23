-- モデルハウス来場記録テーブル
CREATE TABLE model_house_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date date NOT NULL,
  customer_name text NOT NULL,
  customer_type text,
  consideration text,
  has_land text,
  plan text,
  land_area text,
  current_address text,
  occupation text,
  income text,
  media text,
  migration_trigger text,
  notes text,
  has_appointment text,
  appointment_content text,
  staff1 text,
  transfer_staff text,
  staff2 text,
  business_type text NOT NULL DEFAULT '新築',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE model_house_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON model_house_visits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON model_house_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
