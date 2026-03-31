import { useState, useEffect, useCallback } from "react";
import { Database, ChevronDown, ChevronUp } from "lucide-react";
import { getIndexStatus, getDriveSources } from "../lib/api";

interface DriveSource {
  id: number;
  drive_id: string;
  name: string;
}

export default function IndexStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [drives, setDrives] = useState<DriveSource[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statusData, drivesData] = await Promise.all([
        getIndexStatus(),
        getDriveSources(),
      ]);
      setStatus(statusData);
      setDrives(drivesData);
    } catch {
      // Supabase未接続時は無視
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database size={16} />
          <span>データベース情報</span>
          {status?.total_indexed !== undefined && (
            <span className="text-xs text-slate-400">
              ({status.total_indexed}件登録済み)
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)] pt-3">
          {/* 登録ドライブ一覧 */}
          {drives.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                検索対象ドライブ
              </p>
              {drives.map((d) => (
                <p
                  key={d.drive_id}
                  className="text-sm py-1 px-2 rounded bg-[var(--color-surface-hover)]"
                >
                  {d.name}
                </p>
              ))}
            </div>
          )}

          {/* ステータス */}
          {status?.is_running && (
            <div className="space-y-1">
              <p className="text-sm text-[var(--color-warning)]">
                {status.phase === "scanning"
                  ? `スキャン中... ${status.scanned_files || 0}件発見`
                  : `処理中... ${status.processed_files}/${status.total_files}`}
              </p>
              {status.total_files > 0 && (
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[var(--color-accent)] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round((status.processed_files / status.total_files) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {status?.last_completed_at && !status?.is_running && (
            <p className="text-xs text-slate-500">
              最終インデックス:{" "}
              {new Date(status.last_completed_at).toLocaleString("ja-JP")}
            </p>
          )}

          <p className="text-xs text-slate-400">
            インデックス作成は CLI から実行: <code className="bg-slate-100 px-1 rounded">npm run index</code>
          </p>
        </div>
      )}
    </div>
  );
}
