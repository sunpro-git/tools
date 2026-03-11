import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { surveySchema } from "@/lib/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // バリデーション
    const result = surveySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "入力内容に不備があります", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // スコアの変換: -1（該当なし）はnullとして保存
    const toScore = (v: number | null | undefined) =>
      v === -1 || v === null || v === undefined ? null : v;

    // Supabaseに保存
    const supabase = getSupabase();
    const { error } = await supabase.from("survey_responses").insert({
      customer_name: data.customer_name,
      customer_number: data.customer_number,
      staff_name: data.staff_name,
      email: data.email || null,
      google_account_name: data.google_account_name || null,
      q1_selection_reason: data.q1_selection_reason || null,
      q2_competitor: data.q2_competitor || null,
      q3_nps_score: data.q3_nps_score,
      q3_nps_comment: data.q3_nps_comment || null,
      q4_construction_score: data.q4_construction_score,
      q4_construction_comment: data.q4_construction_comment || null,
      q5_advisor_score: data.q5_advisor_score,
      q5_advisor_comment: data.q5_advisor_comment || null,
      q6_coordinator_score: toScore(data.q6_coordinator_score),
      q6_coordinator_comment: data.q6_coordinator_comment || null,
      q7_design_score: toScore(data.q7_design_score),
      q7_design_comment: data.q7_design_comment || null,
      q8_site_manager_score: toScore(data.q8_site_manager_score),
      q8_site_manager_comment: data.q8_site_manager_comment || null,
      q9_craftsman_score: toScore(data.q9_craftsman_score),
      q9_craftsman_comment: data.q9_craftsman_comment || null,
      q10_free_comment: data.q10_free_comment || null,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "データの保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
