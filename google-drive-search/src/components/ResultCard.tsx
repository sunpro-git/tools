import { ExternalLink, FolderOpen } from "lucide-react";

interface Props {
  name: string;
  driveFileId?: string;
  thumbnailUrl?: string | null;
  webViewLink?: string | null;
  folderPath?: string | null;
  matchType?: "md5" | "phash";
  distance?: number;
  similarity?: number;
}

export default function ResultCard({
  name,
  thumbnailUrl,
  webViewLink,
  folderPath,
  matchType,
  distance,
  similarity,
}: Props) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-all group">
      {/* サムネイル */}
      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="text-slate-400 text-xs p-4 text-center">
            No preview
          </div>
        )}
      </div>

      {/* 情報 */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium truncate" title={name}>
          {name}
        </p>

        {folderPath && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <FolderOpen size={12} />
            <span className="truncate" title={folderPath}>
              {folderPath}
            </span>
          </div>
        )}

        {/* バッジ */}
        <div className="flex items-center gap-2">
          {matchType === "md5" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
              MD5完全一致
            </span>
          )}
          {matchType === "phash" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
              pHash一致 (距離: {distance})
            </span>
          )}
          {similarity !== undefined && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                similarity > 0.8
                  ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                  : similarity > 0.5
                    ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {(similarity * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Driveリンク */}
        {webViewLink && (
          <a
            href={webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          >
            <ExternalLink size={12} />
            Driveで開く
          </a>
        )}
      </div>
    </div>
  );
}
