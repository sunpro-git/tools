import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IndexStatus } from "../types.js";

let supabase: SupabaseClient;

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  supabase = createClient(url, key);
  return supabase;
}

// initDb is now a no-op (tables managed by migration)
export async function initDb() {
  getSupabase();
}

// --- Image CRUD ---

export async function upsertImage(data: {
  drive_file_id: string;
  name: string;
  mime_type: string;
  md5_hash?: string;
  phash?: string;
  embedding?: number[];
  thumbnail_url?: string;
  web_view_link?: string;
  file_size?: number;
  folder_path?: string;
  source_drive_id?: string;
}) {
  const { error } = await getSupabase()
    .from("image_index")
    .upsert(
      {
        drive_file_id: data.drive_file_id,
        name: data.name,
        mime_type: data.mime_type,
        md5_hash: data.md5_hash ?? null,
        phash: data.phash ?? null,
        embedding: data.embedding
          ? JSON.stringify(data.embedding)
          : null,
        thumbnail_url: data.thumbnail_url ?? null,
        web_view_link: data.web_view_link ?? null,
        file_size: data.file_size ?? null,
        folder_path: data.folder_path ?? null,
        source_drive_id: data.source_drive_id ?? null,
        indexed_at: new Date().toISOString(),
      },
      { onConflict: "drive_file_id" }
    );

  if (error) throw new Error(`upsertImage: ${error.message}`);
}

export async function imageExists(driveFileId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("image_index")
    .select("id")
    .eq("drive_file_id", driveFileId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function findByMd5(md5: string) {
  const { data, error } = await getSupabase()
    .from("image_index")
    .select("*")
    .eq("md5_hash", md5);
  if (error) throw new Error(`findByMd5: ${error.message}`);
  return data ?? [];
}

export async function getAllWithPhash() {
  const { data, error } = await getSupabase()
    .from("image_index")
    .select("*")
    .not("phash", "is", null);
  if (error) throw new Error(`getAllWithPhash: ${error.message}`);
  return data ?? [];
}

export async function searchSimilarImages(
  queryEmbedding: number[],
  matchCount: number = 20
) {
  const { data, error } = await getSupabase().rpc("search_similar_images", {
    query_embedding: "[" + queryEmbedding.join(",") + "]",
    match_count: matchCount,
  });
  if (error) throw new Error(`searchSimilarImages: ${error.message}`);
  return data ?? [];
}

export async function getTotalImageCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("image_index")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`getTotalImageCount: ${error.message}`);
  return count ?? 0;
}

// --- Index Status ---

export async function getIndexStatus(): Promise<IndexStatus> {
  const { data, error } = await getSupabase()
    .from("index_status")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(`getIndexStatus: ${error.message}`);
  return data as IndexStatus;
}

export async function updateIndexStatus(updates: Partial<IndexStatus>) {
  const { error } = await getSupabase()
    .from("index_status")
    .update(updates)
    .eq("id", 1);
  if (error) throw new Error(`updateIndexStatus: ${error.message}`);
}

// --- Drive Sources ---

export async function addDriveSource(driveId: string, name: string) {
  const { error } = await getSupabase()
    .from("drive_sources")
    .upsert({ drive_id: driveId, name }, { onConflict: "drive_id" });
  if (error) throw new Error(`addDriveSource: ${error.message}`);
}

export async function removeDriveSource(driveId: string) {
  const { error } = await getSupabase()
    .from("drive_sources")
    .delete()
    .eq("drive_id", driveId);
  if (error) throw new Error(`removeDriveSource: ${error.message}`);
}

export async function getAllDriveSources() {
  const { data, error } = await getSupabase()
    .from("drive_sources")
    .select("*")
    .order("created_at");
  if (error) throw new Error(`getAllDriveSources: ${error.message}`);
  return data ?? [];
}
