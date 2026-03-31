import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
} from "@huggingface/transformers";

let processor: any = null;
let model: any = null;
let loadPromise: Promise<void> | null = null;
let _isLoading = false;
let _progress = 0;

const MODEL_ID = "Xenova/clip-vit-base-patch16";

/**
 * CLIPモデルをブラウザにロード（初回はダウンロード、以降はキャッシュ）
 */
export async function ensureModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (model && processor) return;
  if (loadPromise) return loadPromise;

  _isLoading = true;
  _progress = 0;

  loadPromise = (async () => {
    processor = await AutoProcessor.from_pretrained(MODEL_ID, {
      progress_callback: (p: any) => {
        if (p.progress !== undefined) {
          _progress = p.progress;
          onProgress?.(p.progress);
        }
      },
    });
    model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
      progress_callback: (p: any) => {
        if (p.progress !== undefined) {
          _progress = p.progress;
          onProgress?.(p.progress);
        }
      },
    });
    _isLoading = false;
    _progress = 100;
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
  await ensureModel(onProgress);

  // ファイルをRawImageに変換
  const url = URL.createObjectURL(file);
  const image = await RawImage.fromURL(url);
  URL.revokeObjectURL(url);

  // CLIPで処理
  const imageInputs = await processor(image);
  const output = await model(imageInputs);

  // embeddingを正規化して返す
  const embedding = Array.from(
    output.image_embeds.data as Float32Array
  ) as number[];
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / norm);
}

export function isModelLoading(): boolean {
  return _isLoading;
}

export function getLoadProgress(): number {
  return _progress;
}
