-- 002: UIに追加された新カラムを反映

-- catalog_items に新カラム追加
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS size TEXT DEFAULT '';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS paper_type TEXT DEFAULT '';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS supplier TEXT DEFAULT '';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS data_storage TEXT DEFAULT '';

-- catalog_reprints に新カラム追加（納品先・発注先）
ALTER TABLE catalog_reprints ADD COLUMN IF NOT EXISTS delivery_to TEXT DEFAULT '';
ALTER TABLE catalog_reprints ADD COLUMN IF NOT EXISTS supplier TEXT DEFAULT '';

-- 増刷リクエストテーブル作成
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

-- RLS
ALTER TABLE catalog_reprint_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_reprint_requests_all ON catalog_reprint_requests FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_catalog_reprint_requests_item ON catalog_reprint_requests(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_reprint_requests_status ON catalog_reprint_requests(status);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_reprint_requests;
