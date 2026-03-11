-- コンテンツテーブル作成
CREATE TABLE IF NOT EXISTS public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('note', 'x', 'instagram', 'youtube', 'other')),
  title TEXT,
  full_text TEXT,
  summary TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contents_platform ON public.contents (platform);
CREATE INDEX IF NOT EXISTS idx_contents_category ON public.contents (category);
CREATE INDEX IF NOT EXISTS idx_contents_status ON public.contents (status);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON public.contents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_tags ON public.contents USING GIN (tags);

-- RLSを有効化
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

-- ⚠️ セキュリティ警告:
-- 現在のポリシーはanon keyで全操作（SELECT/INSERT/UPDATE/DELETE）を許可しています。
-- anon keyはフロントエンドのバンドルに含まれるため、第三者がデータを操作可能です。
-- 本番環境では必ず以下のいずれかを実施してください:
--   1. Supabase Auth を導入し、認証済みユーザーのみ操作を許可する
--   2. 最低限、DELETEを制限するポリシーに変更する
--
-- 例: 認証ユーザーのみに制限する場合
--   CREATE POLICY "Authenticated access" ON public.contents
--     FOR ALL TO authenticated
--     USING (true) WITH CHECK (true);

-- 開発用: 全アクセス許可（本番では変更すること）
CREATE POLICY "Allow all access" ON public.contents
  FOR ALL
  USING (true)
  WITH CHECK (true);
