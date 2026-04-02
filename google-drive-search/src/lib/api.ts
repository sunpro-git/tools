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
    console.log("[Search] Computing MD5...");
    try {
      const buffer = await file.arrayBuffer();
      const wordArray = crypto.lib.WordArray.create(buffer as any);
      const md5 = crypto.MD5(wordArray).toString();
      console.log("[Search] MD5:", md5);

      const { data: md5Matches, error } = await supabase
        .from("image_index")
        .select("*")
        .eq("md5_hash", md5);

      if (error) {
        console.error("[Search] MD5 query error:", error.message);
      } else {
        console.log("[Search] MD5 matches:", md5Matches?.length ?? 0);
        for (const img of md5Matches || []) {
          exact.push({ ...img, match_type: "md5", distance: 0 });
        }
      }
    } catch (err: any) {
      console.error("[Search] MD5 computation error:", err.message);
    }
  }

  // 類似画像検索（CLIP embedding + pgvector）
  if (mode === "similar" || mode === "both") {
    console.log("[Search] Computing CLIP embedding...");
    const embedding = await computeEmbedding(file, onModelProgress);
    console.log("[Search] Embedding computed. Querying Supabase...");

    const { data: results, error } = await supabase.rpc(
      "search_similar_images",
      {
        query_embedding: "[" + embedding.join(",") + "]",
        match_count: 20,
      }
    );

    if (error) {
      console.error("[Search] Similarity query error:", error.message, error);
      throw new Error(`類似検索エラー: ${error.message}`);
    }

    console.log("[Search] Similar results:", results?.length ?? 0);

    const SIMILARITY_THRESHOLD = 0.5;
    for (const r of results || []) {
      if (r.similarity < SIMILARITY_THRESHOLD) continue;
      if (exact.some((e) => e.drive_file_id === r.drive_file_id)) continue;
      similar.push(r);
    }
    console.log("[Search] After threshold filter:", similar.length);
  }

  return { exact, similar };
}

// --- ドライブ管理 ---

export async function getDriveSources() {
  const { data, error } = await supabase
    .from("drive_sources")
    .select("*")
    .order("created_at");
  if (error) {
    console.error("[API] getDriveSources error:", error.message);
    return [];
  }
  return data ?? [];
}

// --- インデックスステータス ---

export async function getIndexStatus() {
  const { data, error } = await supabase
    .from("index_status")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[API] getIndexStatus error:", error.message);
    return { total_indexed: 0 };
  }

  const { count } = await supabase
    .from("image_index")
    .select("*", { count: "exact", head: true });

  return { ...data, total_indexed: count ?? 0 };
}
