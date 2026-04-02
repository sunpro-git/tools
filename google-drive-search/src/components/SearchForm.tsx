import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Search, X } from "lucide-react";

type SearchMode = "exact" | "similar" | "both";

interface Props {
  onSearch: (file: File, mode: SearchMode) => void;
  isSearching: boolean;
  modelProgress: number | null;
}

export default function SearchForm({
  onSearch,
  isSearching,
  modelProgress,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<SearchMode>("both");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const clearFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [preview]);

  // クリップボード貼り付け（Ctrl+V）
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) handleFile(f);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) handleFile(f);
    },
    [handleFile]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) onSearch(file, mode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ドラッグ&ドロップエリア */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {preview ? (
          <div className="relative flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute top-0 right-0 p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
            <img
              src={preview}
              alt="プレビュー"
              className="max-h-48 rounded-lg object-contain"
            />
            <p className="text-sm text-slate-500">{file?.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Upload size={40} className="opacity-50" />
            <p>画像をドラッグ&ドロップ</p>
            <p className="text-sm">クリックして選択 / Ctrl+Vでクリップボードの画像を貼り付け</p>
          </div>
        )}
      </div>

      {/* 検索モード選択 */}
      <div className="flex gap-2">
        {(
          [
            ["both", "両方"],
            ["exact", "完全一致"],
            ["similar", "類似画像"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${mode === value ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface)] text-slate-600 hover:bg-[var(--color-surface-hover)]"}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 検索ボタン */}
      <button
        type="submit"
        disabled={!file || isSearching}
        className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center justify-center gap-2 transition-all"
      >
        {isSearching ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {modelProgress !== null && modelProgress < 100
              ? `AIモデル読み込み中... ${Math.round(modelProgress)}%`
              : "検索中..."}
          </>
        ) : (
          <>
            <Search size={18} />
            検索する
          </>
        )}
      </button>
    </form>
  );
}
