import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import searchRouter from "./routes/search.js";
import indexRouter from "./routes/index-drive.js";
import drivesRouter from "./routes/drives.js";
import { initDb } from "./services/db.js";
import { getFileThumbnail } from "./services/drive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.SERVER_PORT || "3001");

app.use(express.json());

// API ルート
app.use("/api/search", searchRouter);
app.use("/api/index", indexRouter);
app.use("/api/drives", drivesRouter);

// サムネイルプロキシ（Drive画像をブラウザに表示するため）
app.get("/api/thumbnail/:fileId", async (req, res) => {
  try {
    const buffer = await getFileThumbnail(req.params.fileId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err: any) {
    console.error("サムネイル取得エラー:", err.message);
    res.status(500).json({ error: "サムネイル取得失敗" });
  }
});

// 本番環境: Viteビルドの静的ファイルを配信
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// DB初期化してからサーバー起動
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
  });
});
