-- eventsテーブル（shoot-logと共有）にandpad-expansion用カラムを追加
-- 既存カラムには触れない（shoot-logのデータを保護）
DO $$ BEGIN
  -- andpad-expansion用カラム（既存になければ追加）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_url') THEN
    ALTER TABLE events ADD COLUMN event_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_type') THEN
    ALTER TABLE events ADD COLUMN event_type text DEFAULT 'その他';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='division') THEN
    ALTER TABLE events ADD COLUMN division text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='brand') THEN
    ALTER TABLE events ADD COLUMN brand text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='area1') THEN
    ALTER TABLE events ADD COLUMN area1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='area2') THEN
    ALTER TABLE events ADD COLUMN area2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='address') THEN
    ALTER TABLE events ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='dates') THEN
    ALTER TABLE events ADD COLUMN dates date[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='target_visitors') THEN
    ALTER TABLE events ADD COLUMN target_visitors integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='promotion_cost') THEN
    ALTER TABLE events ADD COLUMN promotion_cost integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_insert') THEN
    ALTER TABLE events ADD COLUMN cost_insert integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_posting') THEN
    ALTER TABLE events ADD COLUMN cost_posting integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_web') THEN
    ALTER TABLE events ADD COLUMN cost_web integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_dm') THEN
    ALTER TABLE events ADD COLUMN cost_dm integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cost_other') THEN
    ALTER TABLE events ADD COLUMN cost_other integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='thumbnail_url') THEN
    ALTER TABLE events ADD COLUMN thumbnail_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='google_map_url') THEN
    ALTER TABLE events ADD COLUMN google_map_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='store_name') THEN
    ALTER TABLE events ADD COLUMN store_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='note') THEN
    ALTER TABLE events ADD COLUMN note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
    ALTER TABLE events ADD COLUMN status text DEFAULT 'published';
  END IF;
END $$;

-- event_visitorsテーブル（shoot-logでは未使用、andpad-expansion用）
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

CREATE INDEX IF NOT EXISTS idx_event_visitors_event_id ON event_visitors(event_id);

-- event_visitors RLS（存在しない場合のみ）
ALTER TABLE event_visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_visitors_select" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_insert" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_update" ON event_visitors;
DROP POLICY IF EXISTS "event_visitors_delete" ON event_visitors;
CREATE POLICY "event_visitors_select" ON event_visitors FOR SELECT USING (true);
CREATE POLICY "event_visitors_insert" ON event_visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "event_visitors_update" ON event_visitors FOR UPDATE USING (true);
CREATE POLICY "event_visitors_delete" ON event_visitors FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';
