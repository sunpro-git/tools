-- 担当者の所属課マスタ（期間管理）
CREATE TABLE IF NOT EXISTS staff_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  department text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_dept_name ON staff_departments(staff_name);
CREATE INDEX IF NOT EXISTS idx_staff_dept_department ON staff_departments(department);
CREATE INDEX IF NOT EXISTS idx_staff_dept_dates ON staff_departments(start_date, end_date);

-- RLS
ALTER TABLE staff_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can all" ON staff_departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
