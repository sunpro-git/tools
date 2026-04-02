/**
 * インデックス作成CLIスクリプト（並列処理版）
 *
 * 使い方:
 *   npx tsx scripts/reindex.ts                    # 新規ファイルのみ
 *   npx tsx scripts/reindex.ts --force            # 全ファイル再インデックス
 *   npx tsx scripts/reindex.ts --add <URL or ID>  # ドライブを追加してインデックス
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getDriveClient, downloadFile, getDriveName } from "../server/services/drive.js";
import { computeMd5, computePhash } from "../server/services/hasher.js";
import { computeEmbedding } from "../server/services/embedder.js";
import sharp from "sharp";

const CONCURRENCY = 1; // 直列処理（Supabase接続プール枯渇防止）

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/gif",
];

async function main() {
  const args = process.argv.slice(2);
  const forceReindex = args.includes("--force");
  const fillMissing = args.includes("--fill"); // サムネ/embedding空のみ再処理
  const addIndex = args.indexOf("--add");
  const onlyIndex = args.indexOf("--only");

  if (addIndex >= 0 && args[addIndex + 1]) {
    const input = args[addIndex + 1];
    const driveId = extractDriveId(input);
    const name = await getDriveName(driveId);
    await supabase
      .from("drive_sources")
      .upsert({ drive_id: driveId, name }, { onConflict: "drive_id" });
    console.log(`ドライブ追加: ${name} (${driveId})`);
  }

  const { data: allSources } = await supabase
    .from("drive_sources")
    .select("*")
    .order("created_at");

  if (!allSources || allSources.length === 0) {
    console.error("検索対象のドライブが登録されていません。");
    console.error("  npx tsx scripts/reindex.ts --add <Google Drive URL or ID>");
    process.exit(1);
  }

  // --only で特定ドライブのみ処理
  let sources = allSources;
  if (onlyIndex >= 0 && args[onlyIndex + 1]) {
    const targetId = extractDriveId(args[onlyIndex + 1]);
    sources = allSources.filter((s: any) => s.drive_id === targetId);
    if (sources.length === 0) {
      console.error(`ドライブ ${targetId} が見つかりません。`);
      console.error("登録済み:");
      allSources.forEach((s: any) => console.error(`  ${s.name}: ${s.drive_id}`));
      process.exit(1);
    }
  }

  console.log(`\n対象ドライブ: ${sources.map((s: any) => s.name).join(", ")}`);
  console.log(`モード: ${forceReindex ? "全件再処理" : fillMissing ? "欠損データ補完" : "新規のみ"}`);
  console.log(`並列処理数: ${CONCURRENCY}\n`);

  await supabase
    .from("index_status")
    .update({
      is_running: true,
      phase: "processing",
      processed_files: 0,
      scanned_files: 0,
      error: null,
    })
    .eq("id", 1);

  try {
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const source of sources) {
      console.log(`${source.name} を処理中...`);
      const result = await processDrive(source.drive_id, forceReindex, fillMissing, totalProcessed);
      totalProcessed += result.processed;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }

    await supabase
      .from("index_status")
      .update({
        is_running: false,
        phase: null,
        last_completed_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", 1);

    console.log(`\n\n========================================`);
    console.log(`  Complete!`);
    console.log(`  Processed: ${totalProcessed - totalSkipped}`);
    console.log(`  Skipped: ${totalSkipped}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`========================================`);
  } catch (err: any) {
    await supabase
      .from("index_status")
      .update({ is_running: false, error: err.message })
      .eq("id", 1);
    console.error("\nIndex error:", err.message);
    process.exit(1);
  }
}

/**
 * リトライ付き実行
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

/**
 * 1件のファイルを処理（ダウンロード→ハッシュ→embedding→サムネイル→DB保存）
 */
async function processFile(
  file: any,
  driveId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const buffer = await downloadFile(file.id!);

    // 画像として読み込めるか検証
    try {
      await sharp(buffer).metadata();
    } catch {
      return { ok: false, error: "unsupported image format" };
    }

    // ハッシュ、embedding、サムネイルを並列実行
    const [md5, phash, embeddingResult, thumbnailResult] = await Promise.all([
      computeMd5(buffer),
      computePhash(buffer),
      computeEmbedding(buffer).catch((err: any) => {
        console.warn(`\n  embedding error (${file.name}): ${err.message}`);
        return null;
      }),
      generateThumbnail(buffer, file.id!),
    ]);

    // DB保存（メタデータ — 軽量、リトライ付き）
    await withRetry(async () => {
      const { error } = await supabase.from("image_index").upsert(
        {
          drive_file_id: file.id!,
          name: file.name!,
          mime_type: file.mimeType!,
          md5_hash: md5,
          phash,
          thumbnail_url: thumbnailResult,
          web_view_link: file.webViewLink ?? null,
          file_size: file.size ? parseInt(file.size) : null,
          folder_path: "",
          source_drive_id: driveId,
          indexed_at: new Date().toISOString(),
        },
        { onConflict: "drive_file_id" }
      );
      if (error) throw new Error(error.message);
    });

    // embedding保存（別途update — 大きいデータなので分離）
    if (embeddingResult) {
      await withRetry(async () => {
        const { error } = await supabase
          .from("image_index")
          .update({ embedding: JSON.stringify(embeddingResult) })
          .eq("drive_file_id", file.id!);
        if (error) throw new Error(error.message);
      });
    }

    // DB負荷軽減
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * サムネイル生成・アップロード
 */
async function generateThumbnail(
  buffer: Buffer,
  fileId: string
): Promise<string | null> {
  try {
    const thumb = await sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();
    const thumbPath = `${fileId}.jpg`;
    await withRetry(() =>
      supabase.storage
        .from("thumbnails")
        .upload(thumbPath, thumb, { contentType: "image/jpeg", upsert: true })
        .then(({ error }) => { if (error) throw error; })
    );
    const { data } = supabase.storage
      .from("thumbnails")
      .getPublicUrl(thumbPath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * 並列実行ヘルパー: 配列をCONCURRENCY個ずつ並列処理
 */
async function runParallel<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(workers);
}

/**
 * 1つのドライブをページ単位で並列処理
 */
async function processDrive(
  driveId: string,
  forceReindex: boolean,
  fillMissing: boolean,
  globalOffset: number
): Promise<{ processed: number; skipped: number; errors: number }> {
  const drive = getDriveClient();
  const mimeQuery = IMAGE_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");

  let pageToken: string | undefined;
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const res = await drive.files.list({
      q: `(${mimeQuery}) and trashed=false`,
      fields:
        "nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId,
      corpora: "drive",
    });

    const files = res.data.files || [];

    // 既存チェックでフィルタリング
    let filesToProcess = files;
    if (!forceReindex) {
      const filtered = [];
      for (const file of files) {
        const { data: existing } = await supabase
          .from("image_index")
          .select("id, thumbnail_url, embedding")
          .eq("drive_file_id", file.id!)
          .limit(1);
        if (existing && existing.length > 0) {
          if (fillMissing && (!existing[0].thumbnail_url || !existing[0].embedding)) {
            // サムネイルかembeddingが欠損 → 再処理
            filtered.push(file);
          } else {
            skipped++;
            processed++;
          }
        } else {
          filtered.push(file);
        }
      }
      filesToProcess = filtered;
    }

    // ページ内のファイルを並列処理
    await runParallel(
      filesToProcess,
      async (file) => {
        const total = globalOffset + processed + 1;
        process.stdout.write(
          `\r  [${total}] ${file.name!.substring(0, 50).padEnd(50)} `
        );

        const result = await processFile(file, driveId);
        processed++;

        if (!result.ok) {
          console.warn(`\n  Error (${file.name}): ${result.error}`);
          errors++;
        }

        if (processed % 50 === 0) {
          supabase
            .from("index_status")
            .update({ processed_files: globalOffset + processed })
            .eq("id", 1)
            .then(() => {});
        }
      },
      CONCURRENCY
    );

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log(`\n  Done: ${processed} files (${skipped} skipped, ${errors} errors)`);
  return { processed, skipped, errors };
}

function extractDriveId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

main();
