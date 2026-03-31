import { Router } from "express";
import { addDriveSource, removeDriveSource, getAllDriveSources } from "../services/db.js";
import { getDriveName } from "../services/drive.js";

const router = Router();

router.get("/", async (_req, res) => {
  const sources = await getAllDriveSources();
  res.json(sources);
});

router.post("/", async (req, res) => {
  const { driveId } = req.body;
  if (!driveId) {
    res.status(400).json({ error: "driveIdが必要です" });
    return;
  }

  const id = extractDriveId(driveId);

  try {
    const name = await getDriveName(id);
    await addDriveSource(id, name);
    const sources = await getAllDriveSources();
    res.json(sources);
  } catch (err: any) {
    console.error("ドライブ追加エラー:", err.message);
    res.status(400).json({ error: `ドライブにアクセスできません: ${err.message}` });
  }
});

router.delete("/:driveId", async (req, res) => {
  await removeDriveSource(req.params.driveId);
  const sources = await getAllDriveSources();
  res.json(sources);
});

function extractDriveId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

export default router;
