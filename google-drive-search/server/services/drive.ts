import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import fs from "fs";
import type { DriveFile } from "../types.js";

let driveClient: drive_v3.Drive | null = null;

export function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set");

  const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/gif",
];

/**
 * 共有ドライブの名前を取得
 */
export async function getDriveName(driveId: string): Promise<string> {
  const drive = getDriveClient();
  try {
    const res = await drive.drives.get({ driveId });
    return res.data.name || driveId;
  } catch {
    // 共有ドライブでなければフォルダ名を取得
    try {
      const res = await drive.files.get({
        fileId: driveId,
        fields: "name",
        supportsAllDrives: true,
      });
      return res.data.name || driveId;
    } catch {
      return driveId;
    }
  }
}

/**
 * 共有ドライブ内の全画像ファイルをフラット検索で取得
 * （再帰走査ではなくDrive APIの全体検索を使用 — 高速・重複なし）
 */
export async function listImageFiles(
  driveId: string,
  onProgress?: (count: number) => void
): Promise<(DriveFile & { folderPath: string })[]> {
  const drive = getDriveClient();
  const allFiles: (DriveFile & { folderPath: string })[] = [];
  const seenIds = new Set<string>();

  const mimeQuery = IMAGE_MIME_TYPES.map(
    (m) => `mimeType='${m}'`
  ).join(" or ");

  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `(${mimeQuery}) and trashed=false`,
      fields:
        "nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink, parents)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId,
      corpora: "drive",
    });

    for (const file of res.data.files || []) {
      // 重複排除
      if (seenIds.has(file.id!)) continue;
      seenIds.add(file.id!);

      allFiles.push({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ?? undefined,
        thumbnailLink: file.thumbnailLink ?? undefined,
        webViewLink: file.webViewLink ?? undefined,
        folderPath: "",
      });
    }

    if (onProgress) onProgress(allFiles.length);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return allFiles;
}

/**
 * ファイルの内容をBufferとしてダウンロード
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * サムネイルプロキシ用
 */
export async function getFileThumbnail(
  fileId: string,
  size: number = 400
): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  const sharp = (await import("sharp")).default;
  return await sharp(Buffer.from(res.data as ArrayBuffer))
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
