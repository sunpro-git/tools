import { Router } from "express";
import multer from "multer";
import { computeMd5, computePhash, hammingDistance } from "../services/hasher.js";
import { computeEmbedding } from "../services/embedder.js";
import { findByMd5, getAllWithPhash, searchSimilarImages } from "../services/db.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const PHASH_THRESHOLD = 10;

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "画像ファイルが必要です" });
      return;
    }

    const mode = (req.body.mode as string) || "both";
    const buffer = req.file.buffer;
    const exact: any[] = [];
    const similar: any[] = [];

    // 完全一致検索
    if (mode === "exact" || mode === "both") {
      const md5 = computeMd5(buffer);
      const md5Matches = await findByMd5(md5);
      for (const img of md5Matches) {
        exact.push({ ...img, match_type: "md5", distance: 0 });
      }

      // pHash近似一致
      const phash = await computePhash(buffer);
      const allPhash = await getAllWithPhash();
      for (const img of allPhash) {
        if (exact.some((e) => e.drive_file_id === img.drive_file_id)) continue;
        const dist = hammingDistance(phash, img.phash!);
        if (dist <= PHASH_THRESHOLD) {
          exact.push({ ...img, match_type: "phash", distance: dist });
        }
      }

      exact.sort((a: any, b: any) => a.distance - b.distance);
    }

    // 類似画像検索（pgvectorで高速検索）
    if (mode === "similar" || mode === "both") {
      const embedding = await computeEmbedding(buffer);
      const results = await searchSimilarImages(embedding, 20);
      for (const r of results) {
        if (exact.some((e) => e.drive_file_id === r.drive_file_id)) continue;
        similar.push(r);
      }
    }

    res.json({ exact, similar });
  } catch (err: any) {
    console.error("検索エラー:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
