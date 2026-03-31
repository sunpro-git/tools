import { spawn, type ChildProcess } from "child_process";
import { createInterface, type Interface } from "readline";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";

let pythonProcess: ChildProcess | null = null;
let rl: Interface | null = null;
let ready = false;
let readyPromise: Promise<void> | null = null;
let responseResolve: ((value: any) => void) | null = null;

/**
 * Python CLIPプロセスを起動（シングルトン）
 */
async function ensurePython(): Promise<void> {
  if (ready) return;
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    const scriptPath = path.resolve(
      import.meta.dirname || ".",
      "../../scripts/compute_embedding.py"
    );

    console.log("Python CLIPプロセスを起動中...");
    pythonProcess = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    pythonProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`  [CLIP] ${msg}`);
    });

    pythonProcess.on("error", (err) => {
      console.error("Python process error:", err.message);
      reject(err);
    });

    pythonProcess.on("exit", (code) => {
      console.log(`Python process exited with code ${code}`);
      ready = false;
      pythonProcess = null;
      rl = null;
      readyPromise = null;
    });

    rl = createInterface({ input: pythonProcess.stdout! });

    // 最初の "READY" を待つ
    rl.once("line", (line) => {
      if (line.trim() === "READY") {
        ready = true;
        console.log("Python CLIPプロセス準備完了");
        resolve();
      }
    });

    // 2行目以降はembeddingレスポンス
    let firstLine = true;
    rl.on("line", (line) => {
      if (firstLine) {
        firstLine = false;
        return; // READY行はスキップ
      }
      if (responseResolve) {
        try {
          const data = JSON.parse(line);
          responseResolve(data);
        } catch {
          responseResolve({ error: "JSON parse failed" });
        }
        responseResolve = null;
      }
    });
  });

  return readyPromise;
}

/**
 * 画像バッファからCLIP embeddingを生成
 */
export async function computeEmbedding(buffer: Buffer): Promise<number[]> {
  await ensurePython();

  // 一時ファイルに保存（Pythonに渡すため）
  const tmpPath = path.join(
    os.tmpdir(),
    `clip_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  );

  try {
    // JPEGに変換して保存
    const jpg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(tmpPath, jpg);

    // Pythonに画像パスを送信してレスポンスを待つ
    const result = await new Promise<any>((resolve) => {
      responseResolve = resolve;
      pythonProcess!.stdin!.write(tmpPath + "\n");
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.embedding;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // cleanup best effort
    }
  }
}
