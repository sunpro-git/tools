import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function ThanksPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-3">
            アンケートにご協力いただき
            <br />
            ありがとうございました
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed">
            いただいた貴重なご意見は、今後のサービス向上に
            <br />
            役立ててまいります。
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              このページを閉じていただいて問題ございません。
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
