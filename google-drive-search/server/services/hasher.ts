import crypto from "crypto";
import imghash from "imghash";
import sharp from "sharp";
import os from "os";
import path from "path";
import fs from "fs";

/**
 * MD5ハッシュを計算
 */
export function computeMd5(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

/**
 * perceptual hash を計算（16ビットhex文字列）
 */
export async function computePhash(buffer: Buffer): Promise<string> {
  // imghash はファイルパスを要求するため一時ファイルに書き出す
  const tmpPath = path.join(
    os.tmpdir(),
    `phash_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
  );
  try {
    // 正規化: リサイズしてPNG変換
    const normalized = await sharp(buffer)
      .resize(256, 256, { fit: "inside" })
      .png()
      .toBuffer();
    fs.writeFileSync(tmpPath, normalized);
    const hash = await imghash.hash(tmpPath, 16);
    return hash;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // cleanup best effort
    }
  }
}

/**
 * Hamming距離を計算（2つのhex文字列間）
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    // 長さが違う場合は最大距離を返す
    return Math.max(hash1.length, hash2.length) * 4;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const x = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    // ビットカウント
    let bits = x;
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}
