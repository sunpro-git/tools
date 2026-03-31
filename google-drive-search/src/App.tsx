import { useState } from "react";
import { ImageIcon, LogOut } from "lucide-react";
import SearchForm from "./components/SearchForm";
import ResultGrid from "./components/ResultGrid";
import IndexStatus from "./components/IndexStatus";
import LoginPage from "./components/LoginPage";
import { searchImages } from "./lib/api";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { user, isLoading, isDomainAllowed, signInWithGoogle, signOut } =
    useAuth();

  const [results, setResults] = useState<{
    exact: any[];
    similar: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return <LoginPage onLogin={signInWithGoogle} />;
  }

  // ドメイン不許可
  if (!isDomainAllowed) {
    return (
      <LoginPage
        onLogin={async () => {
          await signOut();
          await signInWithGoogle();
        }}
        error={`このアカウント（${user.email}）では利用できません。社内アカウントでログインしてください。`}
      />
    );
  }

  const handleSearch = async (
    file: File,
    mode: "exact" | "similar" | "both"
  ) => {
    setIsSearching(true);
    setError(null);
    setResults(null);
    setModelProgress(0);

    try {
      const data = await searchImages(file, mode, (progress) => {
        setModelProgress(progress);
      });
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
      setModelProgress(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ImageIcon size={28} className="text-[var(--color-accent)]" />
            <h1 className="text-2xl font-bold">Google Drive 画像検索</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user.email}</span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-slate-400 hover:text-slate-600 transition-colors"
              title="ログアウト"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
          {/* 左カラム: 検索フォーム */}
          <div className="space-y-4">
            <SearchForm
              onSearch={handleSearch}
              isSearching={isSearching}
              modelProgress={modelProgress}
            />
            <IndexStatus />
          </div>

          {/* 右カラム: 検索結果 */}
          <div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            {results && (
              <ResultGrid exact={results.exact} similar={results.similar} />
            )}

            {!results && !error && !isSearching && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
                <ImageIcon size={48} className="opacity-30 mb-4" />
                <p>画像をアップロードして検索</p>
                <p className="text-sm mt-1">
                  完全一致と類似画像を同時に検索できます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
