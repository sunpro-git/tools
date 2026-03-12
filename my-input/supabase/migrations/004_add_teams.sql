-- =============================================
-- 004: チーム管理機能
-- =============================================

-- 1. teams テーブル
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to teams" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to teams" ON public.teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to teams" ON public.teams
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to teams" ON public.teams
  FOR DELETE USING (true);

-- 2. users に team_id カラム追加
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users (team_id);

-- 3. users に UPDATE ポリシーがなければ追加
CREATE POLICY "Allow update access to users" ON public.users
  FOR UPDATE USING (true);
