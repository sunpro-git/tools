-- イベントテーブルにカラム追加: サムネイル、ブランド、GoogleMap、開催店舗
DO $$ BEGIN
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

-- サムネイル用ストレージバケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-thumbnails', 'event-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシー
DROP POLICY IF EXISTS "event_thumbnails_select" ON storage.objects;
DROP POLICY IF EXISTS "event_thumbnails_insert" ON storage.objects;
DROP POLICY IF EXISTS "event_thumbnails_delete" ON storage.objects;
CREATE POLICY "event_thumbnails_select" ON storage.objects FOR SELECT USING (bucket_id = 'event-thumbnails');
CREATE POLICY "event_thumbnails_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-thumbnails');
CREATE POLICY "event_thumbnails_delete" ON storage.objects FOR DELETE USING (bucket_id = 'event-thumbnails');
