-- Supabaseダッシュボードの SQL Editor で実行してください
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- お客様情報
  customer_name TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  email TEXT,
  google_account_name TEXT,

  -- Q1: 選定理由
  q1_selection_reason TEXT,

  -- Q2: 他社比較
  q2_competitor TEXT,

  -- Q3: NPS推奨度 (0-10)
  q3_nps_score INTEGER CHECK (q3_nps_score BETWEEN 0 AND 10),
  q3_nps_comment TEXT,

  -- Q4: 工事内容の満足度 (0-10)
  q4_construction_score INTEGER CHECK (q4_construction_score BETWEEN 0 AND 10),
  q4_construction_comment TEXT,

  -- Q5: リフォームアドバイザーの対応 (0-10)
  q5_advisor_score INTEGER CHECK (q5_advisor_score BETWEEN 0 AND 10),
  q5_advisor_comment TEXT,

  -- Q6: インテリアコーディネーターの対応 (-1=該当なし, 0-10)
  q6_coordinator_score INTEGER CHECK (q6_coordinator_score BETWEEN -1 AND 10),
  q6_coordinator_comment TEXT,

  -- Q7: 設計担当の対応 (-1=該当なし, 0-10)
  q7_design_score INTEGER CHECK (q7_design_score BETWEEN -1 AND 10),
  q7_design_comment TEXT,

  -- Q8: 施工管理担当の対応 (-1=該当なし, 0-10)
  q8_site_manager_score INTEGER CHECK (q8_site_manager_score BETWEEN -1 AND 10),
  q8_site_manager_comment TEXT,

  -- Q9: 施工パートナーの対応 (-1=該当なし, 0-10)
  q9_craftsman_score INTEGER CHECK (q9_craftsman_score BETWEEN -1 AND 10),
  q9_craftsman_comment TEXT,

  -- Q10: 自由意見
  q10_free_comment TEXT
);

-- RLS（Row Level Security）を有効化
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- アンケート送信を許可するポリシー（匿名ユーザーからのINSERTを許可）
CREATE POLICY "Allow anonymous insert" ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);
