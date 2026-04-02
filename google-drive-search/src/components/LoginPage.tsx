import { ShieldAlert } from "lucide-react";

interface Props {
  onLogin: () => void;
  error?: string | null;
}

export default function LoginPage({ onLogin, error }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full mx-4">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 text-center space-y-6">
          {/* アイコン */}
          <div className="flex justify-center">
            <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" className="w-16 h-16" />
          </div>

          {/* タイトル */}
          <div>
            <h1 className="text-xl font-bold">Google Drive 画像検索</h1>
            <p className="text-sm text-slate-500 mt-2">
              ログインして利用を開始してください
            </p>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Googleログインボタン */}
          <button
            onClick={onLogin}
            className="w-full py-3 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Googleアカウントでログイン
          </button>

          <p className="text-xs text-slate-400">
            Googleアカウントでログインしてください
          </p>
        </div>
      </div>
    </div>
  );
}
