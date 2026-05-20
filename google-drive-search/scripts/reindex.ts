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
import { getDriveClient, downloadFile, getDriveName, IMAGE_MIME_TYPES, CONVERTIBLE_MIME_TYPES } from "../server/services/drive.js";
import { computeMd5, computePhash } from "../server/services/hasher.js";
import { computeEmbedding } from "../server/services/embedder.js";
import { isConvertibleFile, convertToImages } from "../server/services/converter.js";
import sharp from "sharp";

const CONCURRENCY = 1; // 直列処理（Supabase接続プール枯渇防止）

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALL_INDEXABLE_MIME_TYPES = [...IMAGE_MIME_TYPES, ...CONVERTIBLE_MIME_TYPES];

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

    if (isConvertibleFile(file.mimeType!)) {
      return await processConvertibleFile(buffer, file, driveId);
    }

    // 画像として読み込めるか検証
    try {
      await sharp(buffer).metadata();
    } catch {
      return { ok: false, error: "unsupported image format" };
    }

    return await processImageBuffer(buffer, file.id!, file.name!, file.mimeType!, file, driveId);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * PDF/AI ファイルを変換して各ページをインデックス
 */
async function processConvertibleFile(
  buffer: Buffer,
  file: any,
  driveId: string
): Promise<{ ok: boolean; error?: string }> {
  const pages = await convertToImages(buffer, file.mimeType!);
  if (pages.length === 0) {
    return { ok: false, error: "no pages extracted" };
  }

  const isSinglePage = pages.length === 1;
  for (const { page, buffer: pageBuffer } of pages) {
    const syntheticId = isSinglePage ? file.id! : `${file.id!}_p${page}`;
    const displayName = isSinglePage ? file.name! : `${file.name!} (p.${page})`;

    if (pages.length > 1) {
      process.stdout.write(
        `\r    → page ${page}/${pages.length} `.padEnd(60)
      );
    }

    const result = await processImageBuffer(pageBuffer, syntheticId, displayName, file.mimeType!, file, driveId);
    if (!result.ok) {
      console.warn(`\n  Page ${page} error: ${result.error}`);
    }
  }

  return { ok: true };
}

/**
 * 画像バッファを処理（ハッシュ→embedding→サムネイル→DB保存）
 */
async function processImageBuffer(
  buffer: Buffer,
  fileId: string,
  displayName: string,
  mimeType: string,
  file: any,
  driveId: string
): Promise<{ ok: boolean; error?: string }> {
  const [md5, phash, embeddingResult, thumbnailResult] = await Promise.all([
    computeMd5(buffer),
    computePhash(buffer),
    computeEmbedding(buffer).catch((err: any) => {
      console.warn(`\n  embedding error (${displayName}): ${err.message}`);
      return null;
    }),
    generateThumbnail(buffer, fileId),
  ]);

  await withRetry(async () => {
    const { error } = await supabase.from("image_index").upsert(
      {
        drive_file_id: fileId,
        name: displayName,
        mime_type: mimeType,
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

  if (embeddingResult) {
    await withRetry(async () => {
      const { error } = await supabase
        .from("image_index")
        .update({ embedding: JSON.stringify(embeddingResult) })
        .eq("drive_file_id", fileId);
      if (error) throw new Error(error.message);
    });
  }

  await new Promise((r) => setTimeout(r, 500));
  return { ok: true };
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
      .webp({ quality: 75 })
      .toBuffer();
    const thumbPath = `${fileId}.webp`;
    await withRetry(() =>
      supabase.storage
        .from("thumbnails")
        .upload(thumbPath, thumb, { contentType: "image/webp", upsert: true })
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
  const mimeQuery = ALL_INDEXABLE_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");

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
        const isConvertible = isConvertibleFile(file.mimeType!);
        let query = supabase
          .from("image_index")
          .select("id, thumbnail_url, embedding");
        if (isConvertible) {
          query = query.like("drive_file_id", `${file.id!}%`);
        } else {
          query = query.eq("drive_file_id", file.id!);
        }
        const { data: existing } = await query.limit(1);

        if (existing && existing.length > 0) {
          if (fillMissing && (!existing[0].thumbnail_url || !existing[0].embedding)) {
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
