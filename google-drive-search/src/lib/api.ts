import { supabase } from "./supabase";
import { computeEmbedding } from "./embedder";
import crypto from "crypto-js";

// --- 検索 ---

export async function searchImages(
  file: File,
  mode: "exact" | "similar" | "both",
  onModelProgress?: (progress: number) => void
) {
  const exact: any[] = [];
  const similar: any[] = [];

  // 完全一致検索（MD5）
  if (mode === "exact" || mode === "both") {
    const buffer = await file.arrayBuffer();
    const wordArray = crypto.lib.WordArray.create(buffer as any);
    const md5 = crypto.MD5(wordArray).toString();

    const { data: md5Matches } = await supabase
      .from("image_index")
      .select("*")
      .eq("md5_hash", md5);

    for (const img of md5Matches || []) {
      exact.push({ ...img, match_type: "md5", distance: 0 });
    }
  }

  // 類似画像検索（CLIP embedding + pgvector）
  if (mode === "similar" || mode === "both") {
    const embedding = await computeEmbedding(file, onModelProgress);

    const { data: results, error } = await supabase.rpc(
      "search_similar_images",
      {
        query_embedding: "[" + embedding.join(",") + "]",
        match_count: 20,
      }
    );

    if (error) throw new Error(error.message);

    const SIMILARITY_THRESHOLD = 0.5; // 50%未満は除外
    for (const r of results || []) {
      if (r.similarity < SIMILARITY_THRESHOLD) continue;
      if (exact.some((e) => e.drive_file_id === r.drive_file_id)) continue;
      similar.push(r);
    }
  }

  return { exact, similar };
}

// --- ドライブ管理 ---

export async function getDriveSources() {
  const { data, error } = await supabase
    .from("drive_sources")
    .select("*")
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- インデックスステータス ---

export async function getIndexStatus() {
  const { data, error } = await supabase
    .from("index_status")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("image_index")
    .select("*", { count: "exact", head: true });

  return { ...data, total_indexed: count ?? 0 };
}
