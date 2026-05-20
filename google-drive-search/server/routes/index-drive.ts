import { Router } from "express";
import { listImageFiles, downloadFile } from "../services/drive.js";
import { computeMd5, computePhash } from "../services/hasher.js";
import { computeEmbedding } from "../services/embedder.js";
import { isConvertibleFile, convertToImages } from "../services/converter.js";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  upsertImage,
  imageExists,
  imageExistsByPrefix,
  getIndexStatus,
  updateIndexStatus,
  getTotalImageCount,
  getAllDriveSources,
} from "../services/db.js";

const router = Router();

router.post("/", async (_req, res) => {
  const status = await getIndexStatus();
  if (status.is_running) {
    res.json({
      status: "already_running",
      processed: status.processed_files,
      total: status.total_files,
    });
    return;
  }

  const sources = await getAllDriveSources();
  if (sources.length === 0) {
    res.status(400).json({ error: "検索対象のドライブが登録されていません。管理画面から追加してください。" });
    return;
  }

  res.json({ status: "started" });

  runIndexing(sources.map((s: any) => s.drive_id)).catch(async (err) => {
    console.error("インデックスエラー:", err);
    await updateIndexStatus({ is_running: false, error: err.message });
  });
});

router.get("/status", async (_req, res) => {
  const status = await getIndexStatus();
  const totalIndexed = await getTotalImageCount();
  res.json({ ...status, total_indexed: totalIndexed });
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { error } = await supabase.storage
      .from("thumbnails")
      .upload(thumbPath, thumb, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage
      .from("thumbnails")
      .getPublicUrl(thumbPath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function processPageBuffer(
  buffer: Buffer,
  fileId: string,
  displayName: string,
  mimeType: string,
  file: any
) {
  const md5 = computeMd5(buffer);
  const phash = await computePhash(buffer);
  const thumbnailUrl = await generateThumbnail(buffer, fileId);

  let embedding: number[] | undefined;
  try {
    embedding = await computeEmbedding(buffer);
  } catch (err) {
    console.warn(`embedding計算失敗 (${displayName}):`, err);
  }

  await upsertImage({
    drive_file_id: fileId,
    name: displayName,
    mime_type: mimeType,
    md5_hash: md5,
    phash,
    embedding,
    thumbnail_url: thumbnailUrl ?? undefined,
    web_view_link: file.webViewLink,
    file_size: file.size ? parseInt(file.size) : undefined,
    folder_path: file.folderPath || undefined,
    source_drive_id: file.source_drive_id,
  });
}

async function runIndexing(driveIds: string[]) {
  const forceReindex = process.env.FORCE_REINDEX === "true";

  console.log(`インデックス作成開始... (${driveIds.length}個のドライブ)`);
  await updateIndexStatus({
    is_running: true,
    phase: "scanning",
    processed_files: 0,
    scanned_files: 0,
    error: null,
  });

  try {
    console.log("ファイル一覧を取得中...");
    const allFiles: any[] = [];
    for (const driveId of driveIds) {
      console.log(`ドライブ ${driveId} をスキャン中...`);
      const files = await listImageFiles(driveId, async (count) => {
        await updateIndexStatus({ scanned_files: count });
      });
      allFiles.push(...files.map((f) => ({ ...f, source_drive_id: driveId })));
    }
    console.log(`${allFiles.length}件のファイルを検出`);

    await updateIndexStatus({ phase: "processing", total_files: allFiles.length, scanned_files: allFiles.length });

    let processed = 0;
    for (const file of allFiles) {
      try {
        const isConvertible = isConvertibleFile(file.mimeType);

        if (!forceReindex) {
          const exists = isConvertible
            ? await imageExistsByPrefix(file.id)
            : await imageExists(file.id);
          if (exists) {
            processed++;
            await updateIndexStatus({ processed_files: processed });
            continue;
          }
        }

        console.log(
          `[${processed + 1}/${allFiles.length}] ${file.name} を処理中...`
        );

        const buffer = await downloadFile(file.id);

        if (isConvertible) {
          const pages = await convertToImages(buffer, file.mimeType);
          const isSinglePage = pages.length === 1;
          for (const { page, buffer: pageBuffer } of pages) {
            const syntheticId = isSinglePage ? file.id : `${file.id}_p${page}`;
            const displayName = isSinglePage ? file.name : `${file.name} (p.${page})`;
            await processPageBuffer(pageBuffer, syntheticId, displayName, file.mimeType, file);
          }
        } else {
          await processPageBuffer(buffer, file.id, file.name, file.mimeType, file);
        }

        processed++;
        await updateIndexStatus({ processed_files: processed });

        await new Promise((r) => setTimeout(r, 100));
      } catch (err: any) {
        console.error(`ファイル処理エラー (${file.name}):`, err.message);
        processed++;
        await updateIndexStatus({ processed_files: processed });
      }
    }

    await updateIndexStatus({
      is_running: false,
      phase: null,
      last_completed_at: new Date().toISOString(),
      error: null,
    });
    console.log("インデックス作成完了");
  } catch (err: any) {
    await updateIndexStatus({ is_running: false, error: err.message });
    throw err;
  }
}

export default router;
