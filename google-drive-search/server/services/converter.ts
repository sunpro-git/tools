import { execFile as execFileCb, execFileSync } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFile = promisify(execFileCb);

const MAX_PDF_PAGES = parseInt(process.env.MAX_PDF_PAGES || "200", 10);

const CONVERTIBLE_MIMES = new Set([
  "application/pdf",
  "application/postscript",
  "application/illustrator",
]);

export interface ConvertedPage {
  page: number;
  buffer: Buffer;
}

export function isConvertibleFile(mimeType: string): boolean {
  return CONVERTIBLE_MIMES.has(mimeType);
}

let gsPath: string | null | undefined;

function findGhostscript(): string | null {
  if (gsPath !== undefined) return gsPath;

  const candidates = ["gswin64c", "gswin32c", "gs"];
  for (const cmd of candidates) {
    try {
      execFileSync("where", [cmd], { stdio: "pipe" });
      gsPath = cmd;
      return gsPath;
    } catch {
      // not found
    }
  }

  const envPath = process.env.GHOSTSCRIPT_PATH;
  if (envPath && fs.existsSync(envPath)) {
    gsPath = envPath;
    return gsPath;
  }

  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const gsDir = path.join(programFiles, "gs");
  if (fs.existsSync(gsDir)) {
    try {
      const versions = fs.readdirSync(gsDir).sort().reverse();
      for (const ver of versions) {
        const exe = path.join(gsDir, ver, "bin", "gswin64c.exe");
        if (fs.existsSync(exe)) {
          gsPath = exe;
          return gsPath;
        }
      }
    } catch {
      // ignore
    }
  }

  gsPath = null;
  return null;
}

function mimeToExtension(mimeType: string): string {
  if (mimeType === "application/pdf") return ".pdf";
  return ".ai";
}

export async function convertToImages(
  buffer: Buffer,
  mimeType: string
): Promise<ConvertedPage[]> {
  const gs = findGhostscript();
  if (!gs) {
    throw new Error(
      "Ghostscript (gswin64c) が見つかりません。" +
        "PDF/AI ファイルの処理にはGhostscriptのインストールが必要です。"
    );
  }

  const tmpDir = os.tmpdir();
  const id = `gs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const ext = mimeToExtension(mimeType);
  const inputPath = path.join(tmpDir, `${id}_input${ext}`);
  const outputPattern = path.join(tmpDir, `${id}_out_%d.png`);

  try {
    fs.writeFileSync(inputPath, buffer);

    await execFile(
      gs,
      [
        "-dBATCH",
        "-dNOPAUSE",
        "-dSAFER",
        "-dQUIET",
        "-sDEVICE=png16m",
        "-r200",
        `-dLastPage=${MAX_PDF_PAGES}`,
        `-sOutputFile=${outputPattern}`,
        inputPath,
      ],
      { timeout: 120000 }
    );

    const pages: ConvertedPage[] = [];
    for (let i = 1; ; i++) {
      const outPath = path.join(tmpDir, `${id}_out_${i}.png`);
      if (!fs.existsSync(outPath)) break;
      pages.push({ page: i, buffer: fs.readFileSync(outPath) });
    }

    return pages;
  } finally {
    // cleanup
    try { fs.unlinkSync(inputPath); } catch {}
    for (let i = 1; ; i++) {
      const outPath = path.join(tmpDir, `${id}_out_${i}.png`);
      if (!fs.existsSync(outPath)) break;
      try { fs.unlinkSync(outPath); } catch {}
    }
  }
}
