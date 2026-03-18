-- eventsテーブルに不足カラムがあれば追加
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='area1') THEN
    ALTER TABLE events ADD COLUMN area1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='area2') THEN
    ALTER TABLE events ADD COLUMN area2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='address') THEN
    ALTER TABLE events ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='target_visitors') THEN
    ALTER TABLE events ADD COLUMN target_visitors integer DEFAULT 0;
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
END $$;

NOTIFY pgrst, 'reload schema';
