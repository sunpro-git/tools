-- カタログ管理ツール テーブル定義（最新版）

-- カタログアイテム
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  genre TEXT NOT NULL CHECK (genre IN ('新築', 'リフォーム', '不動産', 'ソリューション', '共通')),
  "group" TEXT DEFAULT 'パンフレット',
  stock INTEGER,
  next_reprint_date DATE,
  last_reprint_date DATE,
  last_reprint_qty INTEGER,
  last_reprint_cost INTEGER,
  data_url TEXT DEFAULT '',
  delivery_to TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  size TEXT DEFAULT '',
  paper_type TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  data_storage TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 増刷履歴
CREATE TABLE IF NOT EXISTS catalog_reprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  reprint_date DATE NOT NULL,
  cost INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  file_url TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  delivery_to TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 増刷リクエスト
CREATE TABLE IF NOT EXISTS catalog_reprint_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  department TEXT DEFAULT '',
  requester_name TEXT DEFAULT '',
  locations TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by TEXT DEFAULT ''
);

-- アプリ設定 (key-value)
CREATE TABLE IF NOT EXISTS catalog_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト設定
INSERT INTO catalog_settings (key, value) VALUES
  ('chatwork_room_id', ''),
  ('chatwork_api_token', ''),
  ('chatwork_notify_days_before', '7'),
  ('chatwork_notify_enabled', 'true'),
  ('app_password', 'catalog1234')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_items_all ON catalog_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE catalog_reprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_reprints_all ON catalog_reprints FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE catalog_reprint_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_reprint_requests_all ON catalog_reprint_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE catalog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_settings_all ON catalog_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_items;
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_reprints;
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_reprint_requests;

-- Index
CREATE INDEX IF NOT EXISTS idx_catalog_reprints_item ON catalog_reprints(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_genre ON catalog_items(genre);
CREATE INDEX IF NOT EXISTS idx_catalog_items_group ON catalog_items("group");
CREATE INDEX IF NOT EXISTS idx_catalog_items_next_reprint ON catalog_items(next_reprint_date);
CREATE INDEX IF NOT EXISTS idx_catalog_reprint_requests_item ON catalog_reprint_requests(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_reprint_requests_status ON catalog_reprint_requests(status);
