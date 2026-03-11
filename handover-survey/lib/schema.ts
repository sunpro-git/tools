import { z } from "zod";

const scoreField = z
  .number({ invalid_type_error: "スコアを選択してください" })
  .min(0)
  .max(10);

// 「該当なし」を含むスコア: -1 = 該当なし, 0〜10 = スコア
const optionalScoreField = z
  .number({ invalid_type_error: "スコアを選択してください" })
  .min(-1)
  .max(10);

export const surveySchema = z.object({
  // お客様情報
  customer_name: z.string().min(1, "お名前を入力してください"),
  customer_number: z.string().min(1, "お客様番号を入力してください"),
  staff_name: z.string().min(1, "担当者名を入力してください"),
  email: z
    .string()
    .email("正しいメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
  google_account_name: z.string().optional(),

  // Q1: 選定理由
  q1_selection_reason: z.string().optional(),

  // Q2: 他社比較
  q2_competitor: z.string().optional(),

  // Q3: NPS推奨度
  q3_nps_score: scoreField,
  q3_nps_comment: z.string().optional(),

  // Q4: 工事内容の満足度
  q4_construction_score: scoreField,
  q4_construction_comment: z.string().optional(),

  // Q5: リフォームアドバイザー（営業）の対応
  q5_advisor_score: scoreField,
  q5_advisor_comment: z.string().optional(),

  // Q6: インテリアコーディネーターの対応
  q6_coordinator_score: optionalScoreField,
  q6_coordinator_comment: z.string().optional(),

  // Q7: 設計担当の対応
  q7_design_score: optionalScoreField,
  q7_design_comment: z.string().optional(),

  // Q8: 施工管理担当の対応
  q8_site_manager_score: optionalScoreField,
  q8_site_manager_comment: z.string().optional(),

  // Q9: 施工パートナー（職人）の対応
  q9_craftsman_score: optionalScoreField,
  q9_craftsman_comment: z.string().optional(),

  // Q10: 自由意見
  q10_free_comment: z.string().optional(),
});

export type SurveyFormData = z.infer<typeof surveySchema>;
