import ResultCard from "./ResultCard";

interface ExactResult {
  id: number;
  name: string;
  drive_file_id: string;
  thumbnail_url: string | null;
  web_view_link: string | null;
  folder_path: string | null;
  match_type: "md5" | "phash";
  distance: number;
}

interface SimilarResult {
  id: number;
  name: string;
  drive_file_id: string;
  thumbnail_url: string | null;
  web_view_link: string | null;
  folder_path: string | null;
  similarity: number;
}

interface Props {
  exact: ExactResult[];
  similar: SimilarResult[];
}

export default function ResultGrid({ exact, similar }: Props) {
  if (exact.length === 0 && similar.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        一致する画像が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 完全一致 */}
      {exact.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-success)]" />
            完全一致 ({exact.length}件)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {exact.map((item) => (
              <ResultCard
                key={item.id}
                name={item.name}
                driveFileId={item.drive_file_id}
                thumbnailUrl={item.thumbnail_url}
                webViewLink={item.web_view_link}
                folderPath={item.folder_path}
                matchType={item.match_type}
                distance={item.distance}
              />
            ))}
          </div>
        </div>
      )}

      {/* 類似画像 */}
      {similar.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
            類似画像 ({similar.length}件)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similar.map((item) => (
              <ResultCard
                key={item.id}
                name={item.name}
                driveFileId={item.drive_file_id}
                thumbnailUrl={item.thumbnail_url}
                webViewLink={item.web_view_link}
                folderPath={item.folder_path}
                similarity={item.similarity}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
