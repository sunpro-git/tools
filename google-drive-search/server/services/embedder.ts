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

// キュー: 並列呼び出しを直列化
const queue: Array<{
  tmpPath: string;
  resolve: (value: any) => void;
  reject: (err: any) => void;
}> = [];
let processing = false;

const TIMEOUT_MS = 60000; // 60秒タイムアウト

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
      // 待機中のリクエストを全てエラーにする
      if (responseResolve) {
        responseResolve({ error: "Python process exited" });
        responseResolve = null;
      }
    });

    rl = createInterface({ input: pythonProcess.stdout! });

    let firstLine = true;
    rl.on("line", (line) => {
      if (firstLine) {
        firstLine = false;
        if (line.trim() === "READY") {
          ready = true;
          console.log("Python CLIPプロセス準備完了");
          resolve();
        }
        return;
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
 * キューから1件ずつ処理
 */
async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const result = await new Promise<any>((resolve) => {
        // タイムアウト設定
        const timer = setTimeout(() => {
          resolve({ error: "timeout" });
        }, TIMEOUT_MS);

        responseResolve = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
        pythonProcess!.stdin!.write(item.tmpPath + "\n");
      });

      if (result.error) {
        item.reject(new Error(result.error));
      } else {
        item.resolve(result.embedding);
      }
    } catch (err) {
      item.reject(err);
    } finally {
      try {
        fs.unlinkSync(item.tmpPath);
      } catch {}
    }
  }

  processing = false;
}

/**
 * 画像バッファからCLIP embeddingを生成
 */
export async function computeEmbedding(buffer: Buffer): Promise<number[]> {
  await ensurePython();

  const tmpPath = path.join(
    os.tmpdir(),
    `clip_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  );

  const jpg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  fs.writeFileSync(tmpPath, jpg);

  return new Promise<number[]>((resolve, reject) => {
    queue.push({ tmpPath, resolve, reject });
    processQueue();
  });
}
