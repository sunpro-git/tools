/**
 * コサイン類似度を計算（正規化済みベクトル前提で内積のみ）
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * 類似画像を検索（top K）
 */
export function findSimilar(
  queryEmbedding: number[],
  allImages: { id: number; name: string; embedding: string; thumbnail_url: string | null; web_view_link: string | null; drive_file_id?: string; folder_path?: string | null }[],
  topK: number = 20
): { id: number; name: string; similarity: number; thumbnail_url: string | null; web_view_link: string | null; drive_file_id?: string; folder_path?: string | null }[] {
  const results = allImages.map((img) => {
    const embedding = JSON.parse(img.embedding) as number[];
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    return {
      id: img.id,
      name: img.name,
      similarity,
      thumbnail_url: img.thumbnail_url,
      web_view_link: img.web_view_link,
      drive_file_id: img.drive_file_id,
      folder_path: img.folder_path,
    };
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}
