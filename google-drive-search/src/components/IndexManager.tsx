import { useState, useEffect, useCallback } from "react";
import {
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  HardDrive,
} from "lucide-react";
import {
  startIndexing,
  getIndexStatus,
  getDriveSources,
  addDriveSource,
  removeDriveSource,
} from "../lib/api";

interface DriveSource {
  id: number;
  drive_id: string;
  name: string;
}

export default function IndexManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [drives, setDrives] = useState<DriveSource[]>([]);
  const [newDriveUrl, setNewDriveUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getIndexStatus();
      setStatus(data);
    } catch {
      // サーバー未起動時は無視
    }
  }, []);

  const fetchDrives = useCallback(async () => {
    try {
      const data = await getDriveSources();
      setDrives(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDrives();
  }, [fetchStatus, fetchDrives]);

  useEffect(() => {
    if (!status?.is_running) return;
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, [status?.is_running, fetchStatus]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = await startIndexing();
      if (result.error) {
        alert(result.error);
      } else {
        setTimeout(fetchStatus, 500);
      }
    } catch (err: any) {
      alert("インデックス開始に失敗: " + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriveUrl.trim()) return;
    setIsAdding(true);
    setDriveError(null);
    try {
      const data = await addDriveSource(newDriveUrl.trim());
      setDrives(data);
      setNewDriveUrl("");
    } catch (err: any) {
      setDriveError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDrive = async (driveId: string) => {
    const data = await removeDriveSource(driveId);
    setDrives(data);
  };

  const progress =
    status?.total_files > 0
      ? Math.round((status.processed_files / status.total_files) * 100)
      : 0;

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database size={16} />
          <span>管理</span>
          {status?.total_indexed !== undefined && (
            <span className="text-xs text-slate-400">
              ({status.total_indexed}件登録済み)
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-3">
          {/* ドライブ管理 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <HardDrive size={12} />
              検索対象ドライブ
            </h3>

            {drives.length > 0 ? (
              <ul className="space-y-1">
                {drives.map((d) => (
                  <li
                    key={d.drive_id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--color-surface-hover)] text-sm"
                  >
                    <span className="truncate" title={d.drive_id}>
                      {d.name}
                    </span>
                    <button
                      onClick={() => handleRemoveDrive(d.drive_id)}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                まだドライブが登録されていません
              </p>
            )}

            <form onSubmit={handleAddDrive} className="flex gap-2">
              <input
                type="text"
                value={newDriveUrl}
                onChange={(e) => setNewDriveUrl(e.target.value)}
                placeholder="ドライブURL or ID"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={isAdding || !newDriveUrl.trim()}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-sm disabled:opacity-50 hover:bg-[var(--color-accent-hover)] transition-all"
              >
                <Plus size={16} />
              </button>
            </form>

            {driveError && (
              <p className="text-xs text-red-600">{driveError}</p>
            )}
          </div>

          {/* インデックス */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            {status?.is_running ? (
              <div className="space-y-2">
                {status.phase === "scanning" ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-warning)]">
                      ドライブをスキャン中...
                    </span>
                    <span>{status.scanned_files || 0}件 発見</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-warning)]">
                      画像を処理中...
                    </span>
                    <span>
                      {status.processed_files} / {status.total_files}
                    </span>
                  </div>
                )}
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[var(--color-accent)] h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                {status?.last_completed_at && (
                  <p className="text-xs text-slate-500">
                    最終実行:{" "}
                    {new Date(status.last_completed_at).toLocaleString("ja-JP")}
                  </p>
                )}
                {status?.error && (
                  <p className="text-xs text-red-600">
                    エラー: {status.error}
                  </p>
                )}
              </>
            )}

            <button
              onClick={handleStart}
              disabled={status?.is_running || isStarting || drives.length === 0}
              className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 transition-all text-slate-700"
            >
              <RefreshCw
                size={14}
                className={status?.is_running ? "animate-spin" : ""}
              />
              {status?.is_running ? "実行中..." : "インデックスを作成"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
