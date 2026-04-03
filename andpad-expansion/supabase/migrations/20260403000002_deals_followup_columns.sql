-- 追客管理用カスタムカラムをdealsテーブルに追加
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_migration text;        -- 移住
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_floor_area text;       -- 坪数
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_meeting_status text;   -- 最新打合わせ状況
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_next_schedule text;    -- 次回の予定
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_competitor text;       -- 競合
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_finance_consult text;  -- 資金相談
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_no_plan text;          -- 無P
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_coop_appoint text;     -- 協ア
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_line_works text;       -- LINE WORKS
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_discovery text;        -- 発掘
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_basic_info text;       -- 基本情報
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_plan text;             -- 計画
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_self_fund_loan text;   -- 自己資金ローン審査
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_decision_maker text;   -- 決定者
