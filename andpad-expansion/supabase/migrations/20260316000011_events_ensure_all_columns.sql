-- eventsテーブルの全カラムを確実に存在させる
DO $$ BEGIN
  -- 元テーブル定義のカラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='name') THEN
    ALTER TABLE events ADD COLUMN name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_type') THEN
    ALTER TABLE events ADD COLUMN event_type text NOT NULL DEFAULT 'その他';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='division') THEN
    ALTER TABLE events ADD COLUMN division text[] DEFAULT '{}';
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='note') THEN
    ALTER TABLE events ADD COLUMN note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
    ALTER TABLE events ADD COLUMN status text NOT NULL DEFAULT 'published';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='created_at') THEN
    ALTER TABLE events ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
    ALTER TABLE events ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  -- 新規追加カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='thumbnail_url') THEN
    ALTER TABLE events ADD COLUMN thumbnail_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='brand') THEN
    ALTER TABLE events ADD COLUMN brand text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='google_map_url') THEN
    ALTER TABLE events ADD COLUMN google_map_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='store_name') THEN
    ALTER TABLE events ADD COLUMN store_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_url') THEN
    ALTER TABLE events ADD COLUMN event_url text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
