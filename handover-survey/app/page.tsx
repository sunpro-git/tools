import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SurveyForm } from "@/components/survey-form";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* リード文 */}
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              この度はお引渡し、誠におめでとうございます
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              お忙しいところ恐れ入りますが、今後のサービス向上のため、
              アンケートにご協力いただけますと幸いです。
              <br />
              いただいたご意見は、より良い住まいづくりに活かしてまいります。
            </p>
          </div>
        </div>

        {/* フォーム */}
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <SurveyForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
