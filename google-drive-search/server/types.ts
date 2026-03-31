export interface ImageRecord {
  id: number;
  drive_file_id: string;
  name: string;
  mime_type: string;
  md5_hash: string | null;
  phash: string | null;
  embedding: string | null; // JSON array of numbers
  thumbnail_url: string | null;
  web_view_link: string | null;
  file_size: number | null;
  folder_path: string | null;
  created_at: string;
  indexed_at: string;
}

export interface IndexStatus {
  is_running: boolean;
  phase: string | null; // "scanning" | "processing" | null
  total_files: number;
  processed_files: number;
  scanned_files: number;
  last_completed_at: string | null;
  error: string | null;
}

export interface SearchResult {
  image: ImageRecord;
  match_type: "md5" | "phash";
  distance?: number;
}

export interface SimilarResult {
  image: ImageRecord;
  similarity: number;
}

export interface SearchResponse {
  exact: SearchResult[];
  similar: SimilarResult[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  parents?: string[];
}
