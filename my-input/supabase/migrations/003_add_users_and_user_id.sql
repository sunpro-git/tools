-- =============================================
-- 003: ユーザー管理 + いいね機能
-- =============================================

-- 1. users テーブル
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete access to users" ON public.users
  FOR DELETE USING (true);

-- 2. 初期ユーザー登録
INSERT INTO public.users (name) VALUES
  ('イモト'),
  ('カトウ'),
  ('ムラコシ'),
  ('オカハラ')
ON CONFLICT (name) DO NOTHING;

-- 3. contents に user_id カラム追加
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_contents_user_id ON public.contents (user_id);

-- 4. 既存データをイモトに割り当て
UPDATE public.contents
SET user_id = (SELECT id FROM public.users WHERE name = 'イモト')
WHERE user_id IS NULL;

-- 5. NOT NULL 制約を追加
ALTER TABLE public.contents ALTER COLUMN user_id SET NOT NULL;

-- 6. いいねテーブル
CREATE TABLE IF NOT EXISTS public.content_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, user_id)
);

ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to content_likes" ON public.content_likes
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_content_likes_content_id ON public.content_likes (content_id);
CREATE INDEX IF NOT EXISTS idx_content_likes_user_id ON public.content_likes (user_id);
