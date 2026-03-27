-- 支店振分管理テーブル
CREATE TABLE IF NOT EXISTS branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name TEXT NOT NULL,
  branch_class TEXT NOT NULL,
  municipality TEXT NOT NULL,
  category TEXT DEFAULT '共通',
  sort_order INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branch_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to branch_assignments" ON branch_assignments FOR ALL USING (true) WITH CHECK (true);

-- 初期データ: 長野県全77市町村（共通カテゴリ）

-- 本社/松本（中信エリア: 松本地域+北アルプス地域+木曽地域）19市町村
INSERT INTO branch_assignments (branch_name, branch_class, municipality, category, sort_order) VALUES
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '松本', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '塩尻', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '安曇野', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '麻績', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '生坂', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '山形', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '朝日', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '筑北', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '大町', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '池田', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '松川村', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '白馬', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '小谷', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '木曽', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '上松', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '南木曽', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '木祖', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '王滝', '共通', 1),
('本社/松本', 'bg-slate-100 text-slate-600 border-slate-200', '大桑', '共通', 1);

-- 長野（北信エリア: 長野地域+北信地域）15市町村
INSERT INTO branch_assignments (branch_name, branch_class, municipality, category, sort_order) VALUES
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '長野', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '須坂', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '千曲', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '坂城', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '小布施', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '高山', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '小川', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '信濃', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '飯綱', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '中野', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '飯山', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '山ノ内', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '木島平', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '野沢温泉', '共通', 2),
('長野', 'bg-amber-50 text-amber-700 border-amber-200', '栄', '共通', 2);

-- 上田（東信エリア: 上田地域+佐久地域）15市町村
INSERT INTO branch_assignments (branch_name, branch_class, municipality, category, sort_order) VALUES
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '上田', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '東御', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '青木', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '長和', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '佐久', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '小諸', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '軽井沢', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '御代田', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '立科', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '小海', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '佐久穂', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '川上', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '南牧', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '南相木', '共通', 3),
('上田', 'bg-emerald-50 text-emerald-700 border-emerald-200', '北相木', '共通', 3);

-- 伊那（上伊那+諏訪エリア）13市町村
INSERT INTO branch_assignments (branch_name, branch_class, municipality, category, sort_order) VALUES
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '岡谷', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '諏訪', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '茅野', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '下諏訪', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '富士見', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '原村', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '伊那', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '駒ヶ根', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '辰野', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '箕輪', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '飯島', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '南箕輪', '共通', 4),
('伊那', 'bg-rose-50 text-rose-700 border-rose-200', '宮田', '共通', 4);

-- 飯田（下伊那エリア）15市町村
INSERT INTO branch_assignments (branch_name, branch_class, municipality, category, sort_order) VALUES
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '飯田', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '松川町', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '高森', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '阿南', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '阿智', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '平谷', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '根羽', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '下條', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '売木', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '天龍', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '泰阜', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '喬木', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '豊丘', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '大鹿', '共通', 5),
('飯田', 'bg-violet-50 text-violet-700 border-violet-200', '中川', '共通', 5);
