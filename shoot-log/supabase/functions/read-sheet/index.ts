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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const spreadsheetId = body.spreadsheetId || "1G9m9mXdDg7q6AyhHswFVVB59gHFuZZuRZsB0MtKn3MI";
    const sheetName = body.sheetName; // optional: specific sheet name

    const accessToken = await getAccessToken();

    // Get spreadsheet metadata (sheet names)
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const metaData = await metaRes.json();

    if (!metaData.sheets) {
      return new Response(JSON.stringify({ success: false, message: "Failed to get sheet metadata: " + JSON.stringify(metaData) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sheetNames: string[] = metaData.sheets.map((s: any) => s.properties.title);

    // If specific sheet requested, only fetch that one
    const sheetsToFetch = sheetName ? [sheetName] : sheetNames;
    const headerRow = body.headerRow || 1; // 1-indexed, default first row

    const result: Record<string, any[]> = {};

    for (const name of sheetsToFetch) {
      const range = encodeURIComponent(`${name}`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();

      if (!data.values || data.values.length < headerRow) {
        result[name] = [];
        continue;
      }

      // Use specified header row (convert to 0-indexed)
      const headerIdx = headerRow - 1;
      const headers: string[] = data.values[headerIdx].map((h: string) => String(h).trim());
      const rows: Record<string, string>[] = [];

      for (let i = headerIdx + 1; i < data.values.length; i++) {
        const row = data.values[i];
        // Skip completely empty rows
        if (!row || row.every((v: string) => !v || !String(v).trim())) continue;

        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = row[idx] ? String(row[idx]).trim() : "";
        });
        rows.push(obj);
      }

      result[name] = rows;
    }

    return new Response(JSON.stringify({ success: true, sheets: sheetNames, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
