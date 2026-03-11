"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { surveySchema, type SurveyFormData } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScoreSelector } from "@/components/score-selector";

function SectionCard({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-primary px-5 py-3">
        <h2 className="text-white font-bold text-base">
          {number && <span className="mr-2">{number}</span>}
          {title}
        </h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

export function SurveyForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      customer_name: "",
      customer_number: "",
      staff_name: "",
      email: "",
      google_account_name: "",
      q1_selection_reason: "",
      q2_competitor: "",
      q3_nps_comment: "",
      q4_construction_comment: "",
      q5_advisor_comment: "",
      q6_coordinator_comment: "",
      q7_design_comment: "",
      q8_site_manager_comment: "",
      q9_craftsman_comment: "",
      q10_free_comment: "",
    },
  });

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "送信に失敗しました");
      }

      router.push("/thanks");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "送信中にエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* お客様情報 */}
      <SectionCard title="お客様情報">
        <div className="space-y-3">
          <div>
            <Label htmlFor="customer_name">
              お名前（ご契約者様のフルネーム）{" "}
              <span className="text-red-500 text-xs">*必須</span>
            </Label>
            <Input
              id="customer_name"
              placeholder="例：山田 太郎"
              {...register("customer_name")}
            />
            <FieldError message={errors.customer_name?.message} />
          </div>
          <div>
            <Label htmlFor="customer_number">
              お客様番号 <span className="text-red-500 text-xs">*必須</span>
            </Label>
            <Input
              id="customer_number"
              placeholder="例：A-12345"
              {...register("customer_number")}
            />
            <FieldError message={errors.customer_number?.message} />
          </div>
          <div>
            <Label htmlFor="staff_name">
              担当者名 <span className="text-red-500 text-xs">*必須</span>
            </Label>
            <Input
              id="staff_name"
              placeholder="例：佐藤 花子"
              {...register("staff_name")}
            />
            <FieldError message={errors.staff_name?.message} />
          </div>
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="例：yamada@example.com"
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="google_account_name">Googleアカウントの名前</Label>
            <Input
              id="google_account_name"
              placeholder="例：yamada taro"
              {...register("google_account_name")}
            />
          </div>
        </div>
      </SectionCard>

      {/* Q1: 選定理由 */}
      <SectionCard number="Q1" title="選定理由">
        <p className="text-sm text-gray-600">
          サンプロをお選びいただいた理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={4}
          {...register("q1_selection_reason")}
        />
      </SectionCard>

      {/* Q2: 他社比較 */}
      <SectionCard number="Q2" title="他社比較">
        <p className="text-sm text-gray-600">
          最後まで迷われた他社があれば教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q2_competitor")}
        />
      </SectionCard>

      {/* Q3: NPS推奨度 */}
      <SectionCard number="Q3" title="お知り合いへのオススメ度">
        <p className="text-sm text-gray-600">
          親しい友人や家族にサンプロをどの程度オススメしたいですか？
        </p>
        <Controller
          name="q3_nps_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="全く薦めない"
              rightLabel="強く薦める"
            />
          )}
        />
        <FieldError message={errors.q3_nps_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          オススメするとしたら、どんな会社だったと紹介しますか？
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q3_nps_comment")}
        />
      </SectionCard>

      {/* Q4: 工事内容の満足度 */}
      <SectionCard number="Q4" title="工事内容の満足度">
        <p className="text-sm text-gray-600">
          工事内容の満足度を教えてください。
        </p>
        <Controller
          name="q4_construction_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
            />
          )}
        />
        <FieldError message={errors.q4_construction_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q4_construction_comment")}
        />
      </SectionCard>

      {/* Q5: リフォームアドバイザー（営業）の対応 */}
      <SectionCard number="Q5" title="リフォームアドバイザーの対応">
        <p className="text-sm text-gray-600">
          リフォームアドバイザー（営業担当）の対応はいかがでしたか？
        </p>
        <Controller
          name="q5_advisor_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
            />
          )}
        />
        <FieldError message={errors.q5_advisor_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q5_advisor_comment")}
        />
      </SectionCard>

      {/* Q6: インテリアコーディネーターの対応 */}
      <SectionCard number="Q6" title="インテリアコーディネーターの対応">
        <p className="text-sm text-gray-600">
          インテリアコーディネーターの対応はいかがでしたか？
        </p>
        <Controller
          name="q6_coordinator_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
              showNA
            />
          )}
        />
        <FieldError message={errors.q6_coordinator_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q6_coordinator_comment")}
        />
      </SectionCard>

      {/* Q7: 設計担当の対応 */}
      <SectionCard number="Q7" title="設計担当の対応">
        <p className="text-sm text-gray-600">
          設計担当の対応はいかがでしたか？
        </p>
        <Controller
          name="q7_design_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
              showNA
            />
          )}
        />
        <FieldError message={errors.q7_design_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q7_design_comment")}
        />
      </SectionCard>

      {/* Q8: 施工管理担当の対応 */}
      <SectionCard number="Q8" title="施工管理担当の対応">
        <p className="text-sm text-gray-600">
          施工管理担当（現場監督）の対応はいかがでしたか？
        </p>
        <Controller
          name="q8_site_manager_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
              showNA
            />
          )}
        />
        <FieldError message={errors.q8_site_manager_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q8_site_manager_comment")}
        />
      </SectionCard>

      {/* Q9: 施工パートナー（職人）の対応 */}
      <SectionCard number="Q9" title="施工パートナーの対応">
        <p className="text-sm text-gray-600">
          施工パートナー（職人）の対応はいかがでしたか？
        </p>
        <Controller
          name="q9_craftsman_score"
          control={control}
          render={({ field }) => (
            <ScoreSelector
              value={field.value ?? null}
              onChange={field.onChange}
              leftLabel="不満"
              rightLabel="大変満足"
              showNA
            />
          )}
        />
        <FieldError message={errors.q9_craftsman_score?.message} />
        <p className="text-sm text-gray-600 mt-2">
          上記の点数を選んだ理由を教えてください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={3}
          {...register("q9_craftsman_comment")}
        />
      </SectionCard>

      {/* Q10: 自由意見 */}
      <SectionCard number="Q10" title="ご意見・ご感想">
        <p className="text-sm text-gray-600">
          その他、ご意見・ご感想などありましたらお聞かせください。
        </p>
        <Textarea
          placeholder="ご自由にお書きください"
          rows={5}
          {...register("q10_free_comment")}
        />
      </SectionCard>

      {/* 送信ボタン */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {submitError}
        </div>
      )}

      <div className="text-center pb-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full max-w-xs h-12 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          {isSubmitting ? "送信中..." : "アンケートを送信する"}
        </Button>
      </div>
    </form>
  );
}
