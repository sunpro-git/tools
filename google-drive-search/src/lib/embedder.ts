import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
} from "@huggingface/transformers";

let processor: any = null;
let model: any = null;
let loadPromise: Promise<void> | null = null;

const MODEL_ID = "Xenova/clip-vit-base-patch16";

/**
 * CLIPモデルをブラウザにロード（初回はダウンロード、以降はキャッシュ）
 */
export async function ensureModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (model && processor) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      console.log("[CLIP] Loading processor...");
      onProgress?.(10);
      processor = await AutoProcessor.from_pretrained(MODEL_ID, {
        progress_callback: (p: any) => {
          if (p.progress !== undefined && p.progress !== null) {
            onProgress?.(Math.min(10 + p.progress * 0.2, 30));
          }
        },
      });
      console.log("[CLIP] Processor loaded. Loading model...");
      onProgress?.(30);

      model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
        progress_callback: (p: any) => {
          if (p.progress !== undefined && p.progress !== null) {
            onProgress?.(Math.min(30 + p.progress * 0.6, 90));
          }
        },
      });
      console.log("[CLIP] Model loaded successfully.");
      onProgress?.(100);
    } catch (err) {
      console.error("[CLIP] Model load failed:", err);
      loadPromise = null; // リトライ可能にする
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * 画像ファイルからCLIP embeddingを計算
 */
export async function computeEmbedding(
  file: File,
  onProgress?: (progress: number) => void
): Promise<number[]> {
  console.log("[CLIP] Starting embedding computation for:", file.name);

  try {
    await ensureModel(onProgress);
  } catch (err: any) {
    throw new Error(`AIモデルの読み込みに失敗しました: ${err.message}`);
  }

  let url: string | null = null;
  try {
    // ファイルをRawImageに変換
    url = URL.createObjectURL(file);
    console.log("[CLIP] Loading image...");
    const image = await RawImage.fromURL(url);

    // CLIPで処理
    console.log("[CLIP] Processing image...");
    const imageInputs = await processor(image);
    const output = await model(imageInputs);

    // embeddingを取得
    const embedData = output.image_embeds?.data;
    if (!embedData) {
      console.error("[CLIP] No image_embeds in output. Keys:", Object.keys(output));
      throw new Error("CLIPモデルからembeddingを取得できませんでした");
    }

    const embedding = Array.from(embedData as Float32Array) as number[];
    console.log("[CLIP] Embedding computed. Dimension:", embedding.length);

    if (embedding.length !== 512) {
      throw new Error(`Embedding次元が不正です: ${embedding.length} (期待: 512)`);
    }

    // 正規化
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) {
      throw new Error("Embeddingのノルムが0です");
    }

    return embedding.map((v) => v / norm);
  } catch (err: any) {
    if (err.message.includes("AIモデル") || err.message.includes("Embedding")) {
      throw err;
    }
    throw new Error(`画像の処理に失敗しました: ${err.message}`);
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
