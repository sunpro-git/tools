const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
  const privateKeyPem = Deno.env.get("GOOGLE_PRIVATE_KEY")!.replace(/\\n/g, "\n");
  const scope = "https://www.googleapis.com/auth/spreadsheets.readonly";

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };

  const enc = new TextEncoder();
  const b64url = (data: Uint8Array) => {
    let binary = "";
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const b64urlStr = (s: string) => b64url(enc.encode(s));

  const headerB64 = b64urlStr(JSON.stringify(header));
  const claimB64 = b64urlStr(JSON.stringify(claim));
  const signInput = `${headerB64}.${claimB64}`;

  const pemBody = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyBuffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(signInput)));
  const jwt = `${signInput}.${b64url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Google auth failed: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

const SPREADSHEET_ID = "1NPIfwvtVGSvFsp7ZobFqsH_SG6IJwJzs_OQLpfZilGU";
const SHEET_NAME = "ANDPAD案件";

const COLUMN_MAP: Record<string, string> = {
  systemId: "システムID",
  name: "案件名",
  customerName: "顧客名",
  address: "物件住所",
  category: "案件種別",
  customerLat: "顧客緯度",
  customerLon: "顧客経度",
  mainStore: "主担当店舗",
  salesRep: "役割:営業",
  icRep: "役割:インテリアコーディネーター",
  constructionRep: "役割:工事",
  handoverDate: "引渡日(予定)",
  contractDate: "契約日(実績)",
  contractAmount: "契約時:売上金額（税抜）",
};

const FILTER_COLUMNS = ["案件フロー", "案件種別"];
const TARGET_WORKFLOWS = ["完工（精算前）", "進行中", "精算完了", "着工前"];
const TARGET_CATEGORIES = ["新築", "リフォーム", "リノベーション", "注文", "分譲"];

function colIndexToLetter(idx: number): string {
  let letter = "";
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function formatSheetDate(val: string): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  if (h === "00" && min === "00") return `${y}-${m}-${day}`;
  return `${y}-${m}-${day}T${h}:${min}`;
}

function isWithinRange(dateVal: string, fromYM: string, toYM: string): boolean {
  if (!dateVal) return false;
  const normalized = dateVal.replace(/\//g, "-");
  const ym = normalized.length >= 7 ? normalized.substring(0, 7) : "";
  if (!ym) return false;
  return ym >= fromYM && ym <= toYM;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { from, to } = await req.json();
    if (!from || !to) throw new Error("from と to パラメータが必要です");

    const accessToken = await getAccessToken();

    // Step 1: ヘッダー行のみ取得して必要な列を特定
    const headerRange = encodeURIComponent(`${SHEET_NAME}!1:1`);
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${headerRange}?valueRenderOption=FORMATTED_VALUE`;
    const headerRes = await fetch(headerUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const headerData = await headerRes.json();

    if (!headerData.values || headerData.values.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: string[] = headerData.values[0].map((h: string) => String(h).trim());

    // 必要な列名リスト（COLUMN_MAP + フィルタ用列）
    const neededHeaders = new Set([
      ...Object.values(COLUMN_MAP),
      ...FILTER_COLUMNS,
    ]);

    // ヘッダーから必要な列のインデックスとレターを取得
    const colInfos: { index: number; letter: string; name: string }[] = [];
    headers.forEach((h, i) => {
      if (neededHeaders.has(h)) {
        colInfos.push({ index: i, letter: colIndexToLetter(i), name: h });
      }
    });

    if (colInfos.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: 必要な列のみ batchGet で取得（COLUMNS方向で取得）
    const ranges = colInfos.map(c => `${SHEET_NAME}!${c.letter}:${c.letter}`);
    const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangesParam}&valueRenderOption=FORMATTED_VALUE&majorDimension=COLUMNS`;
    const batchRes = await fetch(batchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const batchData = await batchRes.json();

    if (!batchData.valueRanges) {
      return new Response(JSON.stringify({ success: false, message: "batchGet failed: " + JSON.stringify(batchData) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 列データをマップに変換 (ヘッダー名 → 値の配列)
    const columnData: Record<string, string[]> = {};
    let maxRows = 0;
    for (let i = 0; i < colInfos.length; i++) {
      const values = batchData.valueRanges[i]?.values?.[0] || [];
      // 先頭はヘッダー行なのでスキップ
      const dataValues = values.slice(1);
      columnData[colInfos[i].name] = dataValues;
      if (dataValues.length > maxRows) maxRows = dataValues.length;
    }

    // Step 3: 行ごとにフィルタリング＆マッピング
    const workflowCol = columnData["案件フロー"] || [];
    const categoryCol = columnData["案件種別"] || [];
    const handoverCol = columnData[COLUMN_MAP.handoverDate] || [];

    const result: Record<string, string>[] = [];
    for (let r = 0; r < maxRows; r++) {
      const workflow = workflowCol[r] || "";
      if (!TARGET_WORKFLOWS.includes(workflow)) continue;

      const category = categoryCol[r] || "";
      if (!TARGET_CATEGORIES.includes(category)) continue;

      const handoverRaw = handoverCol[r] || "";
      if (handoverRaw) {
        const formatted = formatSheetDate(handoverRaw) || handoverRaw;
        if (!isWithinRange(formatted, from, to)) continue;
      }

      const item: Record<string, string> = {};
      for (const [key, headerName] of Object.entries(COLUMN_MAP)) {
        const col = columnData[headerName];
        const val = col ? (col[r] || "") : "";
        if (["handoverDate", "contractDate"].includes(key) && val) {
          item[key] = formatSheetDate(val) || val;
        } else {
          item[key] = val;
        }
      }
      result.push(item);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
