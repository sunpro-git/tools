-- andpad-expansion用イベントテーブルをshoot-logのeventsテーブルと分離する
-- shoot-logが使うeventsテーブルは触らない

-- inquiry_events テーブル作成
CREATE TABLE IF NOT EXISTS inquiry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_url text,
  event_type text NOT NULL DEFAULT 'その他',
  division text[] DEFAULT '{}',
  brand text,
  area1 text,
  area2 text,
  address text,
  dates date[] DEFAULT '{}',
  target_visitors integer DEFAULT 0,
  promotion_cost integer DEFAULT 0,
  cost_insert integer DEFAULT 0,
  cost_posting integer DEFAULT 0,
  cost_web integer DEFAULT 0,
  cost_dm integer DEFAULT 0,
  cost_other integer DEFAULT 0,
  thumbnail_url text,
  google_map_url text,
  store_name text,
  note text,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- inquiry_event_visitors テーブル作成
CREATE TABLE IF NOT EXISTS inquiry_event_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES inquiry_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_kana text,
  phone text,
  email text,
  postal_code text,
  address text,
  customer_type text DEFAULT '新規'
    CHECK (customer_type IN ('新規', '既存')),
  media_source text,
  reservation_date date,
  visit_date date,
  has_next_appointment boolean DEFAULT false,
  next_appointment_date date,
  next_appointment_note text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_inquiry_event_visitors_event_id ON inquiry_event_visitors(event_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_events_status ON inquiry_events(status);

-- RLS
ALTER TABLE inquiry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_event_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiry_events_select" ON inquiry_events;
DROP POLICY IF EXISTS "inquiry_events_insert" ON inquiry_events;
DROP POLICY IF EXISTS "inquiry_events_update" ON inquiry_events;
DROP POLICY IF EXISTS "inquiry_events_delete" ON inquiry_events;
CREATE POLICY "inquiry_events_select" ON inquiry_events FOR SELECT USING (true);
CREATE POLICY "inquiry_events_insert" ON inquiry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiry_events_update" ON inquiry_events FOR UPDATE USING (true);
CREATE POLICY "inquiry_events_delete" ON inquiry_events FOR DELETE USING (true);

DROP POLICY IF EXISTS "inquiry_event_visitors_select" ON inquiry_event_visitors;
DROP POLICY IF EXISTS "inquiry_event_visitors_insert" ON inquiry_event_visitors;
DROP POLICY IF EXISTS "inquiry_event_visitors_update" ON inquiry_event_visitors;
DROP POLICY IF EXISTS "inquiry_event_visitors_delete" ON inquiry_event_visitors;
CREATE POLICY "inquiry_event_visitors_select" ON inquiry_event_visitors FOR SELECT USING (true);
CREATE POLICY "inquiry_event_visitors_insert" ON inquiry_event_visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiry_event_visitors_update" ON inquiry_event_visitors FOR UPDATE USING (true);
CREATE POLICY "inquiry_event_visitors_delete" ON inquiry_event_visitors FOR DELETE USING (true);

-- 既存のevent_visitorsテーブルからデータ移行（存在する場合）
-- event_visitorsが存在し、inquiry_event_visitorsが空の場合のみ移行
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='event_visitors') THEN
    INSERT INTO inquiry_event_visitors (id, event_id, name, name_kana, phone, email, postal_code, address, customer_type, media_source, reservation_date, visit_date, has_next_appointment, next_appointment_date, next_appointment_note, note, created_at)
    SELECT id, event_id, name, name_kana, phone, email, postal_code, address, customer_type, media_source, reservation_date, visit_date, has_next_appointment, next_appointment_date, next_appointment_note, note, created_at
    FROM event_visitors
    WHERE event_id IN (SELECT id FROM inquiry_events)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
