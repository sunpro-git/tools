/**
 * YouTube Transcript API — Google Apps Script Web App
 *
 * デプロイ手順:
 * 1. https://script.google.com で新規プロジェクト作成
 * 2. このコードを貼り付け
 * 3. API_KEY を任意の秘密文字列に変更
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ → アクセス: 全員 → デプロイ
 * 5. Web App URL をコピー
 */

const API_KEY = "SET_YOUR_SECRET_KEY_HERE";

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const videoId = params.video_id;
    const lang = params.lang || "ja";
    const authHeader = e.parameter.key || "";

    if (API_KEY !== "SET_YOUR_SECRET_KEY_HERE" && authHeader !== API_KEY) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return jsonResponse({ error: "Invalid video_id" }, 400);
    }

    const transcript = fetchTranscript(videoId, lang);
    if (transcript) {
      return jsonResponse({ transcript: transcript, length: transcript.length });
    } else {
      return jsonResponse({ error: "Transcript not found" }, 404);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doGet(e) {
  // Health check
  if (e.parameter.health === "1") {
    return jsonResponse({ status: "ok" });
  }

  // GET with video_id parameter for easy testing
  const videoId = e.parameter.v;
  if (videoId) {
    const lang = e.parameter.lang || "ja";
    const transcript = fetchTranscript(videoId, lang);
    if (transcript) {
      return jsonResponse({ transcript: transcript, length: transcript.length });
    } else {
      return jsonResponse({ error: "Transcript not found" }, 404);
    }
  }

  return jsonResponse({ status: "ok", usage: "POST {video_id, lang} or GET ?v=VIDEO_ID" });
}

function fetchTranscript(videoId, lang) {
  // Step 1: Fetch YouTube watch page to get player response
  const watchUrl = "https://www.youtube.com/watch?v=" + videoId;
  const html = UrlFetchApp.fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ja,en;q=0.9"
    },
    muteHttpExceptions: true
  }).getContentText();

  // Step 2: Extract ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!playerMatch) return null;

  let playerData;
  try {
    playerData = JSON.parse(playerMatch[1]);
  } catch (e) {
    return null;
  }

  // Step 3: Find caption tracks
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) return null;

  // Step 4: Select best track (prefer specified language, manual over auto)
  const track =
    captions.find(t => t.languageCode === lang && t.kind !== "asr") ||
    captions.find(t => t.languageCode === lang) ||
    captions.find(t => t.languageCode && t.languageCode.startsWith(lang)) ||
    captions[0];

  if (!track || !track.baseUrl) return null;

  // Step 5: Fetch caption XML (add fmt=srv3 for structured format)
  let captionUrl = track.baseUrl;
  if (!captionUrl.includes("fmt=")) {
    captionUrl += "&fmt=srv3";
  }

  const xml = UrlFetchApp.fetch(captionUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    muteHttpExceptions: true
  }).getContentText();

  if (!xml || xml.length < 50) return null;

  // Step 6: Parse XML to plain text
  return parseCaptionXml(xml);
}

function parseCaptionXml(xml) {
  const segments = [];

  function decode(t) {
    return t
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n/g, " ")
      .trim();
  }

  if (xml.includes('format="3"')) {
    // srv3 format: <p><s>text</s></p>
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let m;
    while ((m = pRegex.exec(xml)) !== null) {
      const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
      let seg = "";
      let sm;
      while ((sm = sRegex.exec(m[1])) !== null) seg += sm[1];
      if (!seg) seg = m[1].replace(/<[^>]+>/g, "");
      seg = decode(seg);
      if (seg) segments.push(seg);
    }
  } else {
    // Legacy format: <text>content</text>
    const tRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = tRegex.exec(xml)) !== null) {
      const t = decode(m[1]);
      if (t) segments.push(t);
    }
  }

  return segments.join(" ");
}

function jsonResponse(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// === テスト用関数（エディタから直接実行） ===
function testTranscript() {
  const result = fetchTranscript("1jAKgmX7Vbc", "ja");
  if (result) {
    Logger.log("Success! Length: " + result.length);
    Logger.log("Preview: " + result.substring(0, 200));
  } else {
    Logger.log("Failed to get transcript");
  }
}
