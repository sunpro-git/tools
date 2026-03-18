-- イベント集計: イベントと来場者テーブル

-- イベント
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'その他',
  division text[] DEFAULT '{}',
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
  note text,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 来場者
CREATE TABLE IF NOT EXISTS event_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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

-- 既存テーブルに不足カラムがあれば追加
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
    ALTER TABLE events ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_visitors_event_id ON event_visitors(event_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
CREATE POLICY "events_delete" ON events FOR DELETE USING (true);

DROP POLICY IF EXISTS "event_visitors_select" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_insert" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_update" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_delete" ON event_visitors;
CREATE POLICY "event_visitors_select" ON event_visitors FOR SELECT USING (true);
CREATE POLICY "event_visitors_insert" ON event_visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "event_visitors_update" ON event_visitors FOR UPDATE USING (true);
CREATE POLICY "event_visitors_delete" ON event_visitors FOR DELETE USING (true);
