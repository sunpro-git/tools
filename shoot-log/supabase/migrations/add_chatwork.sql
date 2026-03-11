-- staffsテーブルにchatwork_account_idカラムを追加
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS chatwork_account_id TEXT DEFAULT '';

-- アプリ設定テーブルを作成
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チャットワークルームIDの初期値を挿入
INSERT INTO app_settings (key, value) VALUES ('chatwork_room_id', '')
ON CONFLICT (key) DO NOTHING;

-- app_settingsにRLSを設定（anonでも読み書き可能）
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'app_settings_all') THEN
    CREATE POLICY app_settings_all ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
