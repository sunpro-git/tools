-- 部門マスタテーブル
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can all" ON departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 初期データ投入
INSERT INTO departments (name, sort_order) VALUES
  ('中信1課', 1),
  ('中信2課', 2),
  ('北信3課', 3),
  ('東信4課', 4),
  ('南信5課', 5)
ON CONFLICT (name) DO NOTHING;
