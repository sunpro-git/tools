import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Fetch with timeout using AbortController */
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

/** Clean up X/Twitter post text: remove X UI boilerplate and restore line breaks */
function formatXPostText(text: string): string {
  let cleaned = text
    .replace(/^.*?Don't miss what's happening.*?\n*/s, '')
    .replace(/^.*?People on X are the first to know\.?\s*\n*/s, '')
    .replace(/^Post\s*\n-+\s*\n/m, '')
    .replace(/^Conversation\s*\n-+\s*\n/m, '')
    .trim()

  cleaned = cleaned
    .replace(/\n+New to X\?\s*\n-+[\s\S]*$/m, '')
    .replace(/\n+Sign up now to get your own personalized timeline![\s\S]*$/m, '')
    .replace(/\n+Trending now\s*\n-+[\s\S]*$/m, '')
    .replace(/\n+What's happening\s*\n-+[\s\S]*$/m, '')
    .replace(/\n+Who to follow\s*\n-+[\s\S]*$/m, '')
    .replace(/\n+Relevant people\s*\n-+[\s\S]*$/m, '')
    .replace(/\n+Terms of Service[\s\S]*$/m, '')
    .trim()

  cleaned = cleaned.replace(/^\*\s{2,3}/gm, '・')
  cleaned = cleaned.replace(/^-\s{2,3}/gm, '・')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Circled numbers (①〜⑳) and parenthesized numbers as headings: ensure line breaks before them
  cleaned = cleaned
    .replace(/\s+([①-⑳㉑-㊿])/g, '\n\n$1')
    .replace(/\s+(\([0-9]{1,2}\))/g, '\n\n$1')
    .replace(/\s+(\（[0-9]{1,2}\）)/g, '\n\n$1')

  cleaned = cleaned
    .replace(/\s+(◼︎|◼|■|◻︎|□|▪|▫|●|○|◆|◇)/g, '\n\n$1')
    .replace(/\s+(・)/g, '\n$1')
    .replace(/\s+([\u{1F300}-\u{1F9FF}])/gu, '\n\n$1')

  // Convert circled-number lines into markdown headings (## ① heading text)
  cleaned = cleaned.replace(/^([①-⑳㉑-㊿]\s*.+)$/gm, '## $1')

  // Detect section headings: short topic lines followed by bullet points (・)
  // Pattern: a line ending with 。）」 with 1-2 newlines before ・ bullet lines
  cleaned = cleaned.replace(
    /^(.{5,50}[。）」])\n\n?(・)/gm,
    '## $1\n$2'
  )

  // Keep markdown images intact — only strip broken remnants without a closing )
  cleaned = cleaned.replace(/!\[Image \d+:?\s*(?!\()/g, '')

  return cleaned.trim()
}

/** Extract image URLs from markdown text, filtering out emoji/icon images */
function extractArticleImages(text: string): string[] {
  const imgRegex = /!\[.*?\]\((.*?)\)/g
  const urls: string[] = []
  let match
  while ((match = imgRegex.exec(text)) !== null) {
    const url = match[1]
    if (/twimg\.com\/emoji\//i.test(url)) continue
    if (/\.svg(\?|$)/i.test(url)) continue
    if (/icon|avatar|logo|favicon/i.test(url)) continue
    if (/profile_images/i.test(url)) continue
    if (/_normal\.\w+$/i.test(url)) continue
    urls.push(url)
  }
  return urls
}

/** Extract post images from Instagram posts (markdown images from Jina).
 *  Jina returns: profile pic → post images → author profile pic → other posts gallery.
 *  We collect only the actual post images by stopping once we hit a profile picture
 *  after having found at least one post image. */
function extractInstagramImages(text: string): string[] {
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g
  const urls: string[] = []
  let match
  let foundPostImages = false
  while ((match = imgRegex.exec(text)) !== null) {
    const alt = match[1]
    const url = match[2]
    // Profile pictures: skip, but if we already found post images, stop entirely
    if (/profile picture/i.test(alt)) {
      if (foundPostImages) break
      continue
    }
    if (/icon|avatar|logo|favicon|profile/i.test(url)) continue
    if (/\.svg(\?|$)/i.test(url)) continue
    if (/emoji/i.test(url)) continue
    if (/cdninstagram|scontent|fbcdn/i.test(url)) {
      urls.push(url)
      foundPostImages = true
    }
  }
  return urls
}

/** Clean up Instagram post text: extract only the post caption from Jina output.
 *  Jina returns full page content including navigation, profile pics, other posts etc.
 *  The caption is between the author attribution line and "No comments yet" / date link. */
function formatInstagramPostText(text: string): string {
  // Find caption start: after "Edited•Xw" or "[username](url)•Xw" author line
  let captionStart = -1
  const editedMatch = text.match(/\]\([^)]+\)(?:Edited)?•\d+\w\s*\n/)
  if (editedMatch && editedMatch.index !== undefined) {
    captionStart = editedMatch.index + editedMatch[0].length
  }
  // Fallback: after "Follow" + separator section
  if (captionStart < 0) {
    const followIdx = text.indexOf('Follow\n')
    if (followIdx >= 0) {
      const separatorIdx = text.indexOf('* * *', followIdx)
      if (separatorIdx >= 0) {
        // Skip past the separator and any profile pic markdown after it
        let afterSep = separatorIdx + 5
        const nextNewlines = text.indexOf('\n\n', afterSep)
        if (nextNewlines >= 0) {
          // Skip the author profile pic + attribution line
          const attributionEnd = text.indexOf('\n\n', nextNewlines + 2)
          if (attributionEnd >= 0) captionStart = attributionEnd
        }
      }
    }
  }
  if (captionStart < 0) return text

  // Find caption end: before common end markers
  let captionEnd = text.length
  const endMarkers = [
    'No comments yet',
    'Start the conversation',
    'Log in to like or comment',
    'More posts from',
    'View all',
  ]
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker, captionStart)
    if (idx >= 0 && idx < captionEnd) captionEnd = idx
  }
  // Also check for date link: [Month Day, Year](...)
  const dateLinkRe = /\[(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}\]/
  const dateLinkMatch = dateLinkRe.exec(text.substring(captionStart, captionEnd))
  if (dateLinkMatch && dateLinkMatch.index !== undefined) {
    captionEnd = captionStart + dateLinkMatch.index
  }

  let caption = text.substring(captionStart, captionEnd).trim()

  // Clean up: remove standalone hyphens, horizontal rules, markdown images, links
  caption = caption
    .replace(/^-\s*$/gm, '')
    .replace(/^\* \* \*\s*$/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return caption
}

/** Extract OGP image from Jina Reader metadata */
function extractOgImageFromMetadata(metadata: Record<string, string> | undefined): string | null {
  if (!metadata) return null
  return metadata['og:image'] || metadata['thumbnail'] || null
}

/** Pick the best thumbnail for X/Twitter posts */
function pickBestXThumbnail(text: string): string | null {
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g
  let videoThumb: string | null = null
  let coverImage: string | null = null
  let firstMediaImage: string | null = null
  let match
  while ((match = imgRegex.exec(text)) !== null) {
    const alt = match[1]
    const url = match[2]
    if (/twimg\.com\/emoji\//i.test(url)) continue
    if (/\.svg(\?|$)/i.test(url)) continue
    if (/profile_images/i.test(url)) continue
    if (/_normal\.\w+$/i.test(url)) continue
    if (/icon|avatar|logo|favicon/i.test(url)) continue
    if (!videoThumb && /amplify_video_thumb/i.test(url)) {
      videoThumb = url
    }
    if (!coverImage && /cover/i.test(alt)) {
      coverImage = url
    }
    if (!firstMediaImage && /pbs\.twimg\.com\/media\//i.test(url)) {
      firstMediaImage = url
    }
  }
  return videoThumb || coverImage || firstMediaImage || null
}

/** Fetch X/Twitter post data (title + thumbnail) via fxtwitter API */
async function fetchXDataViaFxTwitter(tweetUrl: string): Promise<{ title: string | null; thumbnail: string | null }> {
  try {
    const urlObj = new URL(tweetUrl)
    const pathMatch = urlObj.pathname.match(/\/([^/]+)\/status\/(\d+)/)
    if (!pathMatch) return { title: null, thumbnail: null }
    const [, username, statusId] = pathMatch

    const apiUrl = `https://api.fxtwitter.com/${username}/status/${statusId}`
    const resp = await fetchWithTimeout(apiUrl, {
      headers: { "User-Agent": "MyInputBot/1.0" },
    }, 10000)
    if (!resp.ok) return { title: null, thumbnail: null }

    const data = await resp.json()
    const tweet = data?.tweet
    if (!tweet) return { title: null, thumbnail: null }

    // Extract title: prefer article title, then first line of tweet text
    let title: string | null = null
    if (tweet.article?.title) {
      title = tweet.article.title
    } else if (tweet.text) {
      // Use first line, truncated to 120 chars
      const firstLine = tweet.text.split('\n')[0].trim()
      title = firstLine.length > 120 ? firstLine.substring(0, 120) + '…' : firstLine
    }
    // Prepend author name if available
    if (title && tweet.author?.name) {
      title = `${tweet.author.name}「${title}」`
    }

    // Extract thumbnail
    let thumbnail: string | null = null
    const media = tweet.media
    if (media?.photos && media.photos.length > 0) {
      thumbnail = media.photos[0].url || null
    }
    if (!thumbnail && media?.videos && media.videos.length > 0) {
      thumbnail = media.videos[0].thumbnail_url || null
    }
    if (!thumbnail && media?.external?.thumbnail_url) {
      thumbnail = media.external.thumbnail_url
    }
    const articleCover = tweet.article?.cover_media?.media_info?.original_img_url
    if (!thumbnail && articleCover) {
      thumbnail = articleCover
    }

    return { title, thumbnail }
  } catch {
    return { title: null, thumbnail: null }
  }
}

/** Extract YouTube video ID from various URL formats */
function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.includes('youtu.be')) {
      return u.pathname.slice(1).split('/')[0] || null
    }
    if (host.includes('youtube.com')) {
      const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shortsMatch) return shortsMatch[1]
      const v = u.searchParams.get('v')
      if (v) return v
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embedMatch) return embedMatch[1]
    }
    return null
  } catch {
    return null
  }
}

function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** Fetch YouTube player data via InnerTube API.
 *  Supports ANDROID and WEB clients — WEB tends to work better from cloud IPs. */
async function fetchYoutubePlayerData(videoId: string, client: "ANDROID" | "WEB" = "ANDROID"): Promise<Record<string, unknown> | null> {
  try {
    const isWeb = client === "WEB"
    const playerResp = await fetchWithTimeout(
      isWeb
        ? "https://www.youtube.com/youtubei/v1/player"
        : "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": isWeb
            ? BROWSER_UA
            : "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip",
        },
        body: JSON.stringify({
          context: {
            client: isWeb
              ? { clientName: "WEB", clientVersion: "2.20260302.00.00", hl: "ja", gl: "JP" }
              : { clientName: "ANDROID", clientVersion: "19.29.37", androidSdkVersion: 34, hl: "ja", gl: "JP" },
          },
          videoId,
        }),
      }
    )
    if (!playerResp.ok) return null
    return await playerResp.json()
  } catch {
    return null
  }
}

/** Fetch YouTube player data by scraping the watch page HTML.
 *  This mimics a regular browser visit so it works reliably from cloud IPs
 *  where InnerTube API calls may be blocked. */
async function fetchYoutubePlayerDataViaWatchPage(videoId: string): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}&hl=ja`, {
      headers: {
        ...BROWSER_HEADERS,
        // Bypass EU cookie consent wall that blocks player data on EU IPs
        "Cookie": "CONSENT=YES+cb; SOCS=CAISEwgDEgk2NjI1NTI3NTkaAmphIAEaBgiA_LO2Bg",
      },
    })
    if (!resp.ok) return null
    const html = await resp.text()

    // Extract ytInitialPlayerResponse JSON using brace-counting for reliability
    const startPattern = /var\s+ytInitialPlayerResponse\s*=\s*/
    const startMatch = html.match(startPattern)
    if (!startMatch || startMatch.index === undefined) return null
    const jsonStart = startMatch.index + startMatch[0].length
    if (html[jsonStart] !== '{') return null

    // Count braces to find the matching closing brace (handles nested JSON correctly)
    let depth = 0
    let inString = false
    let escape = false
    let i = jsonStart
    for (; i < html.length; i++) {
      const c = html[i]
      if (escape) { escape = false; continue }
      if (c === '\\' && inString) { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{') depth++
      else if (c === '}') { depth--; if (depth === 0) break }
    }
    if (depth !== 0) return null

    return JSON.parse(html.substring(jsonStart, i + 1))
  } catch {
    return null
  }
}

/** Extract video description from InnerTube player data */
function extractYoutubeDescription(playerData: Record<string, unknown>): string | null {
  try {
    // deno-lint-ignore no-explicit-any
    const desc = (playerData as any)?.videoDetails?.shortDescription
    return typeof desc === "string" && desc.trim() ? desc.trim() : null
  } catch {
    return null
  }
}

/** Extract caption tracks from player data */
function extractCaptionTracks(playerData: Record<string, unknown>): Array<{ languageCode: string; kind?: string; baseUrl: string }> | null {
  // deno-lint-ignore no-explicit-any
  const tracks = (playerData as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
    | Array<{ languageCode: string; kind?: string; baseUrl: string }>
    | undefined
  return tracks && tracks.length > 0 ? tracks : null
}

/** Decode HTML entities in caption text */
function decodeCaptionEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n/g, " ")
    .trim()
}

/** Fetch and parse caption XML from caption tracks.
 *  Shared by all YouTube transcript fetching paths (watch page, InnerTube WEB/ANDROID). */
async function fetchAndParseCaptions(
  captionTracks: Array<{ languageCode: string; kind?: string; baseUrl: string }>
): Promise<string | null> {
  try {
    // Pick the best caption track: prefer Japanese manual > Japanese ASR > any
    const selectedTrack =
      captionTracks.find(t => t.languageCode === "ja" && t.kind !== "asr") ||
      captionTracks.find(t => t.languageCode === "ja") ||
      captionTracks.find(t => t.languageCode?.startsWith("ja")) ||
      captionTracks[0]
    if (!selectedTrack?.baseUrl) return null

    const captionResp = await fetchWithTimeout(selectedTrack.baseUrl, {}, 15000)
    if (!captionResp.ok) return null
    const captionXml = await captionResp.text()
    if (!captionXml) return null

    // Parse XML: handle both srv3 format (<p><s>) and legacy format (<text>)
    const segments: string[] = []

    if (captionXml.includes('format="3"')) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g
      let match
      while ((match = pRegex.exec(captionXml)) !== null) {
        const sRegex = /<s[^>]*>([^<]*)<\/s>/g
        let segText = ""
        let sMatch
        while ((sMatch = sRegex.exec(match[1])) !== null) {
          segText += sMatch[1]
        }
        if (!segText) segText = match[1].replace(/<[^>]+>/g, "")
        segText = decodeCaptionEntities(segText)
        if (segText) segments.push(segText)
      }
    } else {
      const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g
      let match
      while ((match = textRegex.exec(captionXml)) !== null) {
        const text = decodeCaptionEntities(match[1])
        if (text) segments.push(text)
      }
    }

    if (segments.length === 0) return null
    return segments.join(" ")
  } catch {
    return null
  }
}

/** Try to get YouTube transcript from player data (extract tracks then fetch captions) */
async function fetchYoutubeTranscriptFromPlayerData(playerData: Record<string, unknown> | null): Promise<string | null> {
  if (!playerData) return null
  const tracks = extractCaptionTracks(playerData)
  if (!tracks) return null
  return await fetchAndParseCaptions(tracks)
}

/** Fetch YouTube video title via oEmbed API */
async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const resp = await fetchWithTimeout(oembedUrl, {
      headers: { "Accept-Language": "ja,en-US;q=0.7,en;q=0.3" },
    }, 10000)
    if (!resp.ok) return null
    const data = await resp.json()
    return data.title || null
  } catch {
    return null
  }
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

/** Common browser-like headers to avoid WAF blocks */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
  "Accept-Encoding": "identity",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
}

/** Check if URL is from reform-online.jp */
function isReformOnline(url: string): boolean {
  try {
    return new URL(url).hostname.includes("reform-online.jp")
  } catch {
    return false
  }
}

/** Check if URL is from s-housing.jp (新建ハウジング) */
function isShinkenHousing(url: string): boolean {
  try {
    return new URL(url).hostname.includes("s-housing.jp")
  } catch {
    return false
  }
}

/** Check if URL is from sendenkaigi.com (宣伝会議) */
function isSendenkaigi(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host.includes("sendenkaigi.com") || host.includes("advertimes.com")
  } catch {
    return false
  }
}

/** Check if URL is from diamond.jp (ダイヤモンド・オンライン) */
function isDiamond(url: string): boolean {
  try {
    return new URL(url).hostname.includes("diamond.jp")
  } catch {
    return false
  }
}

/** Extract Set-Cookie name=value pairs from response headers.
 *  Returns a Map so callers can merge cookies across responses. */
function extractCookieMap(resp: Response): Map<string, string> {
  const map = new Map<string, string>()
  // Deno supports getSetCookie() which returns each Set-Cookie as a separate entry
  const raw: string[] = (resp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? resp.headers.get("set-cookie")?.split(/,(?=\s*\w+=)/) ?? []
  for (const entry of raw) {
    const nameValue = entry.split(";")[0].trim()
    const eqIdx = nameValue.indexOf("=")
    if (eqIdx > 0) {
      map.set(nameValue.substring(0, eqIdx), nameValue.substring(eqIdx + 1))
    }
  }
  return map
}

/** Serialize cookie map to Cookie header string */
function cookieMapToString(map: Map<string, string>): string {
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
}

/** Parse reform-online.jp article HTML into structured data */
function parseReformOnlineHtml(html: string): { title: string; fullText: string; thumbnailUrl: string } {
  // Title: <h2> inside .postHeading
  let title = ""
  const h2Match = html.match(/<div class="postHeading"[\s\S]*?<h2>([\s\S]*?)<\/h2>/i)
  if (h2Match) {
    title = h2Match[1].replace(/<[^>]+>/g, "").trim()
  }
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, "").trim()
  }

  // Body: <div class="postArea"> content
  let fullText = ""
  const postAreaMatch = html.match(/<div class="postArea">([\s\S]*?)(?:<!--\s*\/\s*\.postArea\s*-->|<div class="entry_registration_guidance">|<div class="aboutArea">)/i)
  if (postAreaMatch) {
    let bodyHtml = postAreaMatch[1]
    // Convert <h3> to markdown headings
    bodyHtml = bodyHtml.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n## $1\n\n')
    // Convert <p> to paragraphs
    bodyHtml = bodyHtml.replace(/<\/p>/gi, '\n\n')
    // Convert <br> to newline
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n')
    // Convert <img> to markdown images
    bodyHtml = bodyHtml.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
    bodyHtml = bodyHtml.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    // Strip remaining HTML tags
    bodyHtml = bodyHtml.replace(/<[^>]+>/g, "")
    // Decode HTML entities
    bodyHtml = bodyHtml
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
    // Clean up whitespace
    fullText = bodyHtml.replace(/\n{3,}/g, "\n\n").trim()
  }

  // Thumbnail: first <img> in postArea with article image
  let thumbnailUrl = ""
  const imgMatch = html.match(/<div class="postArea">[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i)
  if (imgMatch) {
    let src = imgMatch[1]
    if (src.startsWith("/")) src = `https://www.reform-online.jp${src}`
    thumbnailUrl = src
  }
  // Fallback: OGP image
  if (!thumbnailUrl) {
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/)
    if (ogMatch) thumbnailUrl = ogMatch[1]
  }

  return { title, fullText, thumbnailUrl }
}

/** Strip reform-online.jp navigation, sidebar, and footer boilerplate from Jina output.
 *  Jina captures the full page including header/sidebar/footer. This extracts only the article body. */
function cleanReformOnlineJinaContent(text: string): string {
  let cleaned = text

  // Find article body start: after the issue/date line like "1688号(2026/03/9発行)7面"
  const issueDateMatch = cleaned.match(/\d{3,4}号\(\d{4}\/\d{1,2}\/\d{1,2}発行\)\d{1,2}面/)
  if (issueDateMatch && issueDateMatch.index !== undefined) {
    cleaned = cleaned.substring(issueDateMatch.index + issueDateMatch[0].length).trim()
  }

  // Find article body end: before sidebar/footer markers
  const endMarkers = [
    "\n関連記事\n",
    "\nこの記事の関連キーワード",
    "### 最新記事",
    "### この記事を読んだ方へのおすすめ",
    "### リフォーム産業新聞社の関連サイト",
    "### セミナー・イベント",
    "### アクセスランキング",
  ]
  let endIdx = cleaned.length
  for (const marker of endMarkers) {
    const idx = cleaned.indexOf(marker)
    if (idx >= 0 && idx < endIdx) endIdx = idx
  }
  cleaned = cleaned.substring(0, endIdx).trim()

  return cleaned
}

/** Fetch reform-online.jp article via Jina Reader with forwarded login cookie.
 *  The ENC_USER cookie has a 1-year expiry and can be obtained by logging in
 *  once from a browser/curl and saving the cookie value to Supabase secrets. */
async function fetchReformOnlineViaJina(url: string): Promise<{
  title: string; fullText: string; thumbnailUrl: string; author: string
}> {
  const encUser = Deno.env.get("REFORM_ONLINE_ENC_USER")
  if (!encUser) {
    throw new Error("REFORM_ONLINE_ENC_USER secret not configured")
  }

  const jinaHeaders: Record<string, string> = {
    "Accept": "application/json",
    "X-Set-Cookie": `ENC_USER=${encUser}`,
    "X-No-Cache": "true",
  }

  const resp = await fetchWithTimeout(`https://r.jina.ai/${url}`, { headers: jinaHeaders }, 30000)
  if (!resp.ok) {
    throw new Error(`Jina Reader failed for reform-online: ${resp.status}`)
  }
  const json = await resp.json()
  const title = json.data?.title?.replace(/ - リフォームオンライン$/, "") || ""
  const rawText = json.data?.content || ""
  const author = json.data?.author || ""
  const metadata = json.data?.metadata as Record<string, string> | undefined

  if (rawText.includes("有料会員登録で記事全文がお読みいただけます")) {
    throw new Error("reform-online login cookie expired — update REFORM_ONLINE_ENC_USER secret")
  }

  // Clean up navigation/sidebar/footer boilerplate
  const cleanedText = cleanReformOnlineJinaContent(rawText)

  // Get OGP thumbnail
  let thumbnailUrl = ""
  const ogImage = extractOgImageFromMetadata(metadata)
  if (ogImage) {
    thumbnailUrl = ogImage
  } else {
    // Fallback: first image in article (search in cleaned text)
    const images = extractArticleImages(cleanedText)
    if (images.length > 0) thumbnailUrl = images[0]
  }

  return { title, fullText: cleanedText, thumbnailUrl, author }
}

/** Strip s-housing.jp navigation, sidebar, and footer boilerplate from Jina output. */
function cleanShinkenHousingJinaContent(text: string): string {
  let cleaned = text

  // Strip header/navigation boilerplate: find the share buttons line (Facebook/Email)
  // which appears right before the article body.
  // Pattern: line containing "[Email]" share link marks end of header.
  const emailShareIdx = cleaned.indexOf("[Email]")
  if (emailShareIdx >= 0) {
    // Skip past the share buttons line
    const afterShare = cleaned.indexOf("\n", emailShareIdx)
    if (afterShare >= 0) {
      cleaned = cleaned.substring(afterShare).trim()
    }
  }

  // Strip end boilerplate (some markers are in bold **text** so no \n prefix)
  const endMarkers = [
    "\n関連記事\n",
    "\nアクセスランキング",
    "\n新建ハウジングのセミナー",
    "\n住宅製品ガイド",
    "\nこの記事もおすすめ",
    "\nこちらの記事もおすすめ",
    "\n新着ニュース",
    "\n新建新聞社の関連サイト",
    "\n試読・定期購読申し込み",
    "\nメルマガ登録",
    "有料会員になると",
    "有料会員でできること",
    "有料会員向けおすすめ記事",
    "一覧ページに戻る",
    "住宅ビジネスに関する情報は",
  ]
  let endIdx = cleaned.length
  for (const marker of endMarkers) {
    const idx = cleaned.indexOf(marker)
    if (idx >= 0 && idx < endIdx) endIdx = idx
  }
  cleaned = cleaned.substring(0, endIdx).trim()

  return cleaned
}

/** Login to s-housing.jp programmatically and return session cookie.
 *  The login form uses the Spiral Secure Session Manager plugin which requires
 *  per-page nonces. We GET the article page first to extract them, then POST. */
async function loginShinkenHousing(articleUrl: string): Promise<string> {
  const email = Deno.env.get("SHINKEN_HOUSING_EMAIL")
  const password = Deno.env.get("SHINKEN_HOUSING_PASSWORD")
  if (!email || !password) {
    throw new Error("SHINKEN_HOUSING_EMAIL and SHINKEN_HOUSING_PASSWORD secrets not configured")
  }

  // Step 1: GET the article page to extract login nonces
  const pageResp = await fetchWithTimeout(articleUrl, { headers: BROWSER_HEADERS, redirect: "follow" }, 15000)
  if (!pageResp.ok) throw new Error(`Failed to load s-housing page: ${pageResp.status}`)
  const pageHtml = await pageResp.text()

  const nonceMatch = pageHtml.match(/name="sssm_login_nonce"\s+value="([^"]*)"/)
  const redirNonceMatch = pageHtml.match(/name="redirect_to_nonce"\s+value="([^"]*)"/)
  if (!nonceMatch || !redirNonceMatch) {
    throw new Error("Could not extract login nonces from s-housing page")
  }

  const urlPath = new URL(articleUrl).pathname

  // Step 2: POST login credentials
  const formBody = new URLSearchParams({
    login_id: email,
    password: password,
    sssm_login_nonce: nonceMatch[1],
    _wp_http_referer: urlPath,
    site_id: "1185",
    authentication_id: "1029",
    template_num: "1",
    wp_site: articleUrl,
    redirect_to: articleUrl,
    redirect_to_nonce: redirNonceMatch[1],
    action: "sssm_login_action",
  })

  const loginResp = await fetchWithTimeout(
    "https://www.s-housing.jp/wp-content/plugins/spiral-secure-session-manager/views/forms/login_api_v2.php",
    {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": articleUrl,
        "Origin": "https://www.s-housing.jp",
      },
      body: formBody.toString(),
      redirect: "manual",
    },
    15000
  )

  // Extract sml_wp_session cookie from Set-Cookie headers
  const cookieMap = extractCookieMap(loginResp)
  const sessionCookie = cookieMap.get("sml_wp_session")
  if (!sessionCookie) {
    throw new Error("s-housing login failed — no session cookie received. Check credentials.")
  }

  return `sml_wp_session=${sessionCookie}`
}

/** Fetch s-housing.jp article via programmatic login + Jina Reader. */
async function fetchShinkenHousingViaJina(url: string): Promise<{
  title: string; fullText: string; thumbnailUrl: string; author: string
}> {
  const cookie = await loginShinkenHousing(url)

  const jinaHeaders: Record<string, string> = {
    "Accept": "application/json",
    "X-Set-Cookie": cookie,
    "X-No-Cache": "true",
  }

  const resp = await fetchWithTimeout(`https://r.jina.ai/${url}`, { headers: jinaHeaders }, 30000)
  if (!resp.ok) {
    throw new Error(`Jina Reader failed for s-housing: ${resp.status}`)
  }
  const json = await resp.json()
  const title = json.data?.title?.replace(/ \| 新建ハウジング$/, "") || ""
  const rawText = json.data?.content || ""
  const author = json.data?.author || ""
  const metadata = json.data?.metadata as Record<string, string> | undefined

  if (rawText.includes("有料会員になると、全ての記事が読み放題")) {
    throw new Error("s-housing login failed — could not access paid content. Check credentials.")
  }

  const cleanedText = cleanShinkenHousingJinaContent(rawText)

  let thumbnailUrl = ""
  const ogImage = extractOgImageFromMetadata(metadata)
  if (ogImage) {
    thumbnailUrl = ogImage
  } else {
    const images = extractArticleImages(cleanedText)
    if (images.length > 0) thumbnailUrl = images[0]
  }

  return { title, fullText: cleanedText, thumbnailUrl, author }
}

/** Strip sendenkaigi.com navigation, sidebar, and footer boilerplate from Jina output. */
function cleanSendenkaigiJinaContent(text: string): string {
  let cleaned = text

  // Strip header/navigation: find the article body start after breadcrumb
  // Typical pattern: numbered marker like "0 mkt__mda__hsk ..." before article body
  const markerMatch = cleaned.match(/\d+\s+mkt__\w+\s+[\w-]+\s+[\w_-]+\n/)
  if (markerMatch && markerMatch.index !== undefined) {
    cleaned = cleaned.substring(markerMatch.index + markerMatch[0].length).trim()
  } else {
    // Fallback: find after breadcrumb-like pattern ending with series name
    const breadcrumbEnd = cleaned.match(/(?:Idea&Techniques|特集一覧|連載一覧|注目トピックス|ニュース|EVENT REPORT)\n/)
    if (breadcrumbEnd && breadcrumbEnd.index !== undefined) {
      cleaned = cleaned.substring(breadcrumbEnd.index + breadcrumbEnd[0].length).trim()
    }
  }

  // Strip end boilerplate
  const endMarkers = [
    "\n関連記事\n",
    "\nこの記事の感想を",
    "\nあなたへのおすすめ",
    "\n最新記事\n",
    "\nメディア一覧",
    "\n注目のタグ",
    "\nフォーラム",
    "\n講座一覧",
    "\nイベント一覧",
    "\nカート",
    "\n無料キャリア相談",
    "\n宣伝会議 について",
    "\n個人情報の取り扱いについて",
  ]
  let endIdx = cleaned.length
  for (const marker of endMarkers) {
    const idx = cleaned.indexOf(marker)
    if (idx >= 0 && idx < endIdx) endIdx = idx
  }
  cleaned = cleaned.substring(0, endIdx).trim()

  return cleaned
}

/** Login to sendenkaigi.com via Auth0 password grant and create a session.
 *  Returns session cookies string for use with Jina Reader. */
async function loginSendenkaigi(): Promise<string> {
  const email = Deno.env.get("SENDENKAIGI_EMAIL")
  const password = Deno.env.get("SENDENKAIGI_PASSWORD")
  if (!email || !password) {
    throw new Error("SENDENKAIGI_EMAIL and SENDENKAIGI_PASSWORD secrets not configured")
  }

  // Step 1: Get Auth0 tokens via Resource Owner Password Grant
  const auth0Resp = await fetchWithTimeout("https://kaigi-id.jp.auth0.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      client_id: "9DNgpmTRWaUINrzQ1QDXozWIIxSALjnI",
      client_secret: "LFO_iOQ7DZ6ZxUA4zgltigFr1YLHY43arSxb8w6sV4ghsPip11Lf4r8r3RatEEjT",
      username: email,
      password: password,
      audience: "https://kaigi-id.jp.auth0.com/api/v2/",
      scope: "openid profile email offline_access",
    }),
  }, 15000)
  if (!auth0Resp.ok) {
    const errBody = await auth0Resp.text()
    throw new Error(`sendenkaigi Auth0 login failed: ${auth0Resp.status} ${errBody}`)
  }
  const tokens = await auth0Resp.json()
  const { access_token, expires_in, refresh_token } = tokens
  if (!access_token) {
    throw new Error("sendenkaigi Auth0 login failed — no access_token received")
  }

  // Step 2: Create session on sendenkaigi.com API
  const sessionResp = await fetchWithTimeout("https://i-api.sendenkaigi.com/v1/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://i.sendenkaigi.com",
      "Referer": "https://i.sendenkaigi.com/",
    },
    body: JSON.stringify({
      access_token,
      expires_in,
      refresh_token: refresh_token || "",
      external: true,
    }),
  }, 15000)
  if (!sessionResp.ok) {
    const errBody = await sessionResp.text()
    throw new Error(`sendenkaigi session creation failed: ${sessionResp.status} ${errBody}`)
  }

  // Extract session cookies from response
  const cookieMap = extractCookieMap(sessionResp)
  const sessionCookie = cookieMap.get("session")
  const userIdCookie = cookieMap.get("user_id")
  if (!sessionCookie) {
    throw new Error("sendenkaigi login failed — no session cookie received. Check credentials.")
  }

  let cookieStr = `session=${sessionCookie}`
  if (userIdCookie) cookieStr += `; user_id=${userIdCookie}`
  return cookieStr
}

/** Fetch sendenkaigi.com article via Auth0 login + Jina Reader. */
async function fetchSendenkaigiViaJina(url: string): Promise<{
  title: string; fullText: string; thumbnailUrl: string; author: string
}> {
  const cookie = await loginSendenkaigi()

  const jinaHeaders: Record<string, string> = {
    "Accept": "application/json",
    "X-Set-Cookie": cookie,
    "X-No-Cache": "true",
  }

  const resp = await fetchWithTimeout(`https://r.jina.ai/${url}`, { headers: jinaHeaders }, 30000)
  if (!resp.ok) {
    throw new Error(`Jina Reader failed for sendenkaigi: ${resp.status}`)
  }
  const json = await resp.json()
  const title = json.data?.title
    ?.replace(/ \| 宣伝会議$/, "")
    ?.replace(/ \| 販促会議$/, "")
    ?.replace(/ \| 広報会議$/, "")
    ?.replace(/ \| KAIGI GROUP$/, "")
    || ""
  const rawText = json.data?.content || ""
  const author = json.data?.author || ""
  const metadata = json.data?.metadata as Record<string, string> | undefined

  const cleanedText = cleanSendenkaigiJinaContent(rawText)

  let thumbnailUrl = ""
  const ogImage = extractOgImageFromMetadata(metadata)
  if (ogImage) {
    thumbnailUrl = ogImage
  } else {
    const images = extractArticleImages(cleanedText)
    if (images.length > 0) thumbnailUrl = images[0]
  }

  return { title, fullText: cleanedText, thumbnailUrl, author }
}

/** Extract article body text from a diamond.jp HTML page.
 *  Extracts h1-h6 and p tags from the article-body section. */
function extractDiamondArticleBody(html: string): string {
  const bodyStart = html.indexOf('class="article-body')
  if (bodyStart < 0) return ""

  const afterBody = html.substring(bodyStart)

  // Find end of article body: before pagination or related articles
  let endIdx = afterBody.length
  for (const marker of ['class="article-pager', 'class="article-read-more', 'class="article-relation']) {
    const idx = afterBody.indexOf(marker)
    if (idx > 0 && idx < endIdx) endIdx = idx
  }
  const articleSection = afterBody.substring(0, endIdx)

  // Extract heading and paragraph content
  const contentRegex = /<(h[1-6]|p)[^>]*>([\s\S]*?)<\/\1>/g
  let match
  const parts: string[] = []
  while ((match = contentRegex.exec(articleSection)) !== null) {
    // Strip HTML tags from inner content
    const content = match[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim()
    if (!content) continue
    if (match[1].startsWith("h")) {
      parts.push(`\n## ${content}\n`)
    } else {
      parts.push(content)
    }
  }
  return parts.join("\n\n")
}

/** Fetch diamond.jp article by direct HTML fetch, handling multi-page articles.
 *  diamond.jp uses ?page=N for pagination. Jina Reader cannot extract content
 *  from diamond.jp due to JavaScript rendering requirements. */
async function fetchDiamondArticle(url: string): Promise<{
  title: string; fullText: string; thumbnailUrl: string; author: string
}> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
  }

  // Strip any existing page parameter to get the base URL
  const baseUrl = new URL(url)
  baseUrl.searchParams.delete("page")
  const cleanUrl = baseUrl.toString()

  // Fetch page 1
  const page1Resp = await fetchWithTimeout(cleanUrl, { headers }, 30000)
  if (!page1Resp.ok) {
    throw new Error(`diamond.jp fetch failed: ${page1Resp.status}`)
  }
  const page1Html = await page1Resp.text()

  // Extract title
  const titleMatch = page1Html.match(/<title>([^<]+)<\/title>/)
  let title = titleMatch?.[1]
    ?.replace(/ \| [^|]+\| ダイヤモンド・オンライン$/, "")
    ?.replace(/ \| ダイヤモンド・オンライン$/, "")
    ?.trim() || ""

  // Extract og:image for thumbnail
  const ogImageMatch = page1Html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)
  const thumbnailUrl = ogImageMatch?.[1] || ""

  // Extract author from JSON-LD
  let author = ""
  const jsonLdMatch = page1Html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1])
      if (ld.author) {
        author = Array.isArray(ld.author)
          ? ld.author.map((a: { name?: string }) => a.name || "").filter(Boolean).join(", ")
          : ld.author.name || ""
      }
    } catch { /* ignore */ }
  }

  // Detect total page count from pagination links (?page=N)
  const pageRefs = [...page1Html.matchAll(/\?page=(\d+)/g)].map(m => parseInt(m[1]))
  const totalPages = pageRefs.length > 0 ? Math.max(...pageRefs) : 1

  // Extract page 1 body
  const page1Body = extractDiamondArticleBody(page1Html)

  if (totalPages <= 1) {
    return { title, fullText: page1Body, thumbnailUrl, author }
  }

  // Fetch remaining pages in parallel
  const pagePromises: Promise<string>[] = []
  for (let p = 2; p <= totalPages; p++) {
    const pageUrl = `${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}page=${p}`
    pagePromises.push(
      fetchWithTimeout(pageUrl, { headers }, 30000)
        .then(async (resp) => {
          if (!resp.ok) return ""
          const html = await resp.text()
          return extractDiamondArticleBody(html)
        })
        .catch(() => "")
    )
  }

  const pageTexts = await Promise.all(pagePromises)
  const allText = [page1Body, ...pageTexts].filter(Boolean).join("\n\n")

  return { title, fullText: allText, thumbnailUrl, author }
}

/** Parse Threads post text into structured JSON: main post + comments */
function formatThreadsText(text: string): string {
  const lines = text.split('\n')

  // Extract username from profile picture link pattern: [![Image N: username's profile picture](avatar)](profile_url)
  const profilePattern = /\[!\[Image \d+: (.+?)'s profile picture\]\((.*?)\)\]\((https:\/\/www\.threads\.(?:com|net)\/@([^)]+))\)/
  // Simple profile pic (no link): ![Image N: username's profile picture](avatar)
  const replyAvatarPattern = /^!\[Image \d+: .+?'s profile picture\]/

  let mainPost = { username: '', avatar: '', handle: '', text: '', likes: 0, comments: 0, reposts: 0, shares: 0 }
  const replies: { username: string; handle: string; avatar: string; text: string; likes: number }[] = []

  let state: 'main' | 'main_text' | 'replies' = 'main'
  let currentReply: { username: string; handle: string; avatar: string; text: string; likes: number } | null = null
  let skipNextAvatar = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Skip "Translate", "Log in" lines, sign up prompts
    if (line === 'Translate' || line.startsWith('Log in') || line.startsWith('Continue with') || line.startsWith('[Log in')) continue
    // Skip "Sorry, we're having trouble playing this video."
    if (line.includes('having trouble playing')) continue

    const profileMatch = line.match(profilePattern)

    if (state === 'main') {
      if (profileMatch) {
        mainPost.username = profileMatch[4] // Use handle as username (alt text is often generic)
        mainPost.avatar = profileMatch[2]
        mainPost.handle = profileMatch[4]
        state = 'main_text'
      }
      continue
    }

    if (state === 'main_text') {
      // Skip reply avatar of main poster
      if (replyAvatarPattern.test(line)) continue
      // Skip media images
      if (/^!\[Image \d+\]/.test(line)) continue

      // Check if this is a number (engagement metrics)
      if (/^\d+$/.test(line)) {
        const num = parseInt(line, 10)
        if (mainPost.likes === 0) mainPost.likes = num
        else if (mainPost.comments === 0) mainPost.comments = num
        else if (mainPost.reposts === 0) mainPost.reposts = num
        else if (mainPost.shares === 0) { mainPost.shares = num; state = 'replies' }
        continue
      }

      // This is the post text
      if (mainPost.text) mainPost.text += '\n' + line
      else mainPost.text = line
      continue
    }

    if (state === 'replies') {
      if (profileMatch) {
        // Save previous reply
        if (currentReply && currentReply.text) replies.push(currentReply)
        currentReply = { username: profileMatch[1], handle: profileMatch[4], avatar: profileMatch[2], text: '', likes: 0 }
        skipNextAvatar = true
        continue
      }

      if (!currentReply) continue

      // Skip reply avatars (poster's reply icon)
      if (replyAvatarPattern.test(line)) { skipNextAvatar = false; continue }
      if (skipNextAvatar && /^!\[Image/.test(line)) { skipNextAvatar = false; continue }

      // GIF images in replies
      if (/^!\[.*?GIF\]/.test(line) || /giphy\.com/.test(line)) {
        const gifMatch = line.match(/\((https:\/\/[^)]+)\)/)
        if (gifMatch) currentReply.text += (currentReply.text ? '\n' : '') + '[GIF]'
        continue
      }

      // Like count for reply
      if (/^\d+$/.test(line)) {
        currentReply.likes = parseInt(line, 10)
        replies.push(currentReply)
        currentReply = { username: '', handle: '', avatar: '', text: '', likes: 0 }
        continue
      }

      // Reply text
      if (currentReply.username && line) {
        if (currentReply.text) currentReply.text += '\n' + line
        else currentReply.text = line
      }
    }
  }

  // Save last reply
  if (currentReply && currentReply.text && currentReply.username) replies.push(currentReply)

  return JSON.stringify({ type: 'threads', post: mainPost, replies })
}

/** Clean pixiv page text: remove navigation, sidebar, related works, footer etc. */
function formatPixivText(text: string): string {
  let cleaned = text

  // Remove everything after common pixiv footer/sidebar markers
  const cutMarkers = [
    /\n+.*?Sketch.*?FANBOX.*?BOOTH[\s\S]*$/m,
    /\n+.*?pixivコミック[\s\S]*$/m,
    /\n+.*?Terms of Use[\s\S]*$/m,
    /\n+.*?利用規約[\s\S]*$/m,
    /\n+.*?プライバシーポリシー[\s\S]*$/m,
    /\n+Related Works\s*\n[\s\S]*$/mi,
    /\n+関連作品[\s\S]*$/m,
    /\n+.*?Sign up.*?Login[\s\S]*$/mi,
    /\n+.*?新規登録.*?ログイン[\s\S]*$/m,
    /\n+.*?百科事典[\s\S]*$/m,
    /\n+.*?VRoid[\s\S]*$/m,
    /\n+.*?pixivision[\s\S]*$/m,
  ]
  for (const marker of cutMarkers) {
    cleaned = cleaned.replace(marker, '')
  }

  // Remove navigation links and UI elements at the start
  cleaned = cleaned
    .replace(/^[\s\S]*?(?=!\[|#\s|[^\n\[\](){}<>]{20,})/m, '') // Remove everything before first content
    .replace(/\[.*?ログイン.*?\]\(.*?\)/g, '')
    .replace(/\[.*?新規登録.*?\]\(.*?\)/g, '')
    .replace(/\[.*?Home.*?\]\(.*?\)/gi, '')
    .replace(/\[.*?Rankings.*?\]\(.*?\)/gi, '')
    .replace(/\[.*?Recommendations.*?\]\(.*?\)/gi, '')
    .replace(/\[.*?Collections.*?\]\(.*?\)/gi, '')
    .replace(/\[.*?Help.*?\]\(.*?\)/gi, '')

  // Remove pixiv service links
  cleaned = cleaned
    .replace(/\[.*?(?:Sketch|FANBOX|BOOTH|FACTORY|sensei|Pastela).*?\]\(.*?\)\s*/gi, '')

  // Remove tracking pixels and tiny images
  cleaned = cleaned.replace(/!\[.*?\]\(https:\/\/.*?(?:analytics|tracking|pixel|\.gif\?).*?\)\s*/g, '')

  // Remove follower/bookmark count lines
  cleaned = cleaned.replace(/.*?\d+\s*(?:users入り|ブックマーク|いいね|フォロー).*?\n/g, '')

  // Clean up excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned
}

/** Format general article/long text: add paragraph breaks for readability */
function formatLongText(text: string): string {
  // If text already has reasonable line breaks, leave it
  const lines = text.split('\n').filter(l => l.trim())
  const avgLineLen = lines.reduce((sum, l) => sum + l.length, 0) / Math.max(lines.length, 1)
  if (avgLineLen < 200 && lines.length > 3) return text

  let result = text

  // Add breaks before numbered markers: 一つ目、二つ目、三つ目、四つ目、五つ目...
  result = result.replace(/([。」）])\s*(一つ目|二つ目|三つ目|四つ目|五つ目|六つ目|七つ目|八つ目|九つ目|十)/g, '$1\n\n$2')

  // Add breaks before common Japanese discourse markers after sentence endings
  result = result.replace(/([。」）])\s*(まず|次に|さらに|また、|そして、|しかし、|ただ、|最後に|つまり、|だから|結論|要するに|加えて|一方で)/g, '$1\n\n$2')

  // Add breaks before 「 (quotation marks) that start a new thought after 。
  result = result.replace(/([。])\s*(「)/g, '$1\n\n$2')

  // For very long blocks still remaining (>300 chars without breaks),
  // split at 。followed by a space or another sentence start
  const finalLines = result.split('\n')
  const processed: string[] = []
  for (const line of finalLines) {
    if (line.length > 300) {
      // Split at sentence boundaries (。) but keep the 。attached
      const sentences = line.split(/(?<=。)\s*/)
      let currentParagraph = ''
      for (const sentence of sentences) {
        currentParagraph += sentence
        if (currentParagraph.length > 150 && sentence.endsWith('。')) {
          processed.push(currentParagraph)
          currentParagraph = ''
        }
      }
      if (currentParagraph) processed.push(currentParagraph)
    } else {
      processed.push(line)
    }
  }

  return processed.join('\n\n')
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { content_id } = await req.json()
    if (!content_id) {
      return new Response(JSON.stringify({ error: "content_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get content record
    const { data: content, error: fetchError } = await supabase
      .from("contents")
      .select("*")
      .eq("id", content_id)
      .single()

    if (fetchError || !content) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Update status to processing
    await supabase
      .from("contents")
      .update({ status: "processing" })
      .eq("id", content_id)

    let title = ""
    let fullText = ""
    let author = ""
    let thumbnailUrl = ""
    let imageUrls: string[] = []
    let hasPlatformThumbnail = false
    let ytCaptionUrl: string | null = null

    // reform-online.jp: use Jina Reader with forwarded login cookie
    if (isReformOnline(content.url)) {
      const result = await fetchReformOnlineViaJina(content.url)
      title = result.title
      fullText = result.fullText
      author = result.author
      thumbnailUrl = result.thumbnailUrl
      if (thumbnailUrl) hasPlatformThumbnail = true
      if (fullText) fullText = formatLongText(fullText)
    }

    // s-housing.jp (新建ハウジング): use Jina Reader with forwarded login cookie
    else if (isShinkenHousing(content.url)) {
      const result = await fetchShinkenHousingViaJina(content.url)
      title = result.title
      fullText = result.fullText
      author = result.author
      thumbnailUrl = result.thumbnailUrl
      if (thumbnailUrl) hasPlatformThumbnail = true
      if (fullText) fullText = formatLongText(fullText)
    }

    // sendenkaigi.com (宣伝会議): use Auth0 login + Jina Reader
    else if (isSendenkaigi(content.url)) {
      const result = await fetchSendenkaigiViaJina(content.url)
      title = result.title
      fullText = result.fullText
      author = result.author
      thumbnailUrl = result.thumbnailUrl
      if (thumbnailUrl) hasPlatformThumbnail = true
      if (fullText) fullText = formatLongText(fullText)
    }

    // diamond.jp (ダイヤモンド・オンライン): direct HTML fetch with multi-page support
    else if (isDiamond(content.url)) {
      const result = await fetchDiamondArticle(content.url)
      title = result.title
      fullText = result.fullText
      author = result.author
      thumbnailUrl = result.thumbnailUrl
      if (thumbnailUrl) hasPlatformThumbnail = true
      if (fullText) fullText = formatLongText(fullText)
    }

    // All other sites: Jina Reader API
    else {

    const jinaResponse = await fetchWithTimeout(`https://r.jina.ai/${content.url}`, {
      headers: { "Accept": "application/json", "Accept-Language": "ja,en-US;q=0.7,en;q=0.3" },
    }, 30000)

    if (jinaResponse.ok) {
      const json = await jinaResponse.json()
      title = json.data?.title || ""
      fullText = json.data?.content || json.data?.text || ""
      author = json.data?.author || ""
      thumbnailUrl = json.data?.image || ""
      const metadata = json.data?.metadata as Record<string, string> | undefined

      const rawFullText = fullText

      // Format X/Twitter post text
      if (content.platform === "x" && fullText) {
        // Extract all content images before formatting
        const xImages = extractArticleImages(rawFullText)
        if (xImages.length > 0) {
          imageUrls = xImages
          thumbnailUrl = xImages[0]
          hasPlatformThumbnail = true
        }

        const xThumb = pickBestXThumbnail(rawFullText)
        if (xThumb) {
          thumbnailUrl = xThumb
          hasPlatformThumbnail = true
        }
        fullText = formatXPostText(fullText)
        // Also apply long-text formatting for better paragraph breaks
        fullText = formatLongText(fullText)

        // Fetch fxtwitter data for title and thumbnail fallback
        const xData = await fetchXDataViaFxTwitter(content.url)

        // Fix title: Jina often returns generic titles for X posts
        if (!title || /^(X|X \(formerly Twitter\)|Twitter|ポスト)$/i.test(title) || /on X:?\s*["""]/.test(title)) {
          if (xData.title) title = xData.title
        }

        // Fallback thumbnail
        if (!thumbnailUrl && xData.thumbnail) {
          thumbnailUrl = xData.thumbnail
          hasPlatformThumbnail = true
        }
      }

      // Threads: extract post image for thumbnail, then parse into structured JSON
      if (content.platform === "threads") {
        // Extract non-profile images from raw text for thumbnail
        const threadsImgRegex = /!\[(?!.*profile picture)(.*?)\]\((https:\/\/scontent[^)]+)\)/g
        let threadsImgMatch
        while ((threadsImgMatch = threadsImgRegex.exec(rawFullText)) !== null) {
          const url = threadsImgMatch[2]
          if (!/s150x150/.test(url)) {
            thumbnailUrl = url
            hasPlatformThumbnail = true
            break
          }
        }
        if (fullText) {
          fullText = formatThreadsText(fullText)
        }
      }

      // Clean pixiv text before general formatting
      if (content.platform === "pixiv" && fullText) {
        fullText = formatPixivText(fullText)
      }

      // Format long text for other platforms (note, other, etc.) — skip Instagram, Threads (handled separately)
      if (content.platform !== "x" && content.platform !== "instagram" && content.platform !== "threads" && fullText) {
        fullText = formatLongText(fullText)
      }

      // Instagram: fetch images from embed page (bypasses login wall)
      if (content.platform === "instagram") {
        // Clear Jina's login-page content
        fullText = ""
        thumbnailUrl = ""
        imageUrls = []
        hasPlatformThumbnail = false
        try {
          const igMatch = content.url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
          if (igMatch) {
            const embedRes = await fetchWithTimeout(
              `https://www.instagram.com/p/${igMatch[1]}/embed/`,
              { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
              10000
            )
            if (embedRes.ok) {
              const embedHtml = await embedRes.text()

              // Extract carousel images from embed JSON (display_url in edge_sidecar_to_children)
              // HTML has escaped JSON: display_url\":\"https:\/\/scontent...\"
              const displayUrlRegex = /display_url\\?":\\?"(https:[^"]*scontent[^"]*?)\\?"/g
              const displayUrlMatches = [...embedHtml.matchAll(displayUrlRegex)]
              const embedImages: string[] = []
              const seen = new Set<string>()
              for (const m of displayUrlMatches) {
                const url = m[1].replace(/\\\//g, '/').replace(/\\\\?\//g, '/').replace(/&amp;/g, '&')
                const base = url.match(/\/([^/?]+)\.jpg/)?.[1] || url
                if (seen.has(base)) continue
                seen.add(base)
                embedImages.push(url)
              }

              // Fallback: extract from src/srcset attributes
              if (embedImages.length === 0) {
                const imgMatches = [...embedHtml.matchAll(/(?:src|srcset)=["']?(https:\/\/scontent[^"'\s,]+\.jpg[^"'\s,]*)/g)]
                for (const m of imgMatches) {
                  const url = m[1].replace(/&amp;/g, '&')
                  if (/s150x150/.test(url) || /s240x240/.test(url)) continue
                  const base = url.match(/\/([^/?]+)\.jpg/)?.[1] || url
                  if (seen.has(base)) continue
                  seen.add(base)
                  embedImages.push(url)
                }
              }

              if (embedImages.length > 0) {
                imageUrls = embedImages
                thumbnailUrl = embedImages[0]
                hasPlatformThumbnail = true
              }

              // Extract caption text from embed JSON data
              // The embed HTML contains escaped JSON like: "text\":\"\\u30af...\"
              const captionIdx = embedHtml.indexOf('edge_media_to_caption')
              if (captionIdx !== -1) {
                // Try multiple text marker patterns
                const markers = ['"text\\":\\"', '"text":"']
                for (const textMarker of markers) {
                  const textIdx = embedHtml.indexOf(textMarker, captionIdx)
                  if (textIdx === -1) continue
                  const start = textIdx + textMarker.length
                  // Determine the closing delimiter based on the marker
                  const closer = textMarker.endsWith('\\"') ? '\\"' : '"'
                  let end = start
                  while (end < embedHtml.length) {
                    if (embedHtml.substring(end, end + closer.length) === closer) {
                      // Check it's not a double-escaped backslash
                      if (closer === '\\"' && end > 0 && embedHtml[end - 1] === '\\' && embedHtml[end - 2] !== '\\') {
                        end++
                        continue
                      }
                      break
                    }
                    end++
                  }
                  const rawCaption = embedHtml.substring(start, end)
                  if (rawCaption.length > 5) {
                    try {
                      // Unescape the JSON string
                      const unescaped = rawCaption.replace(/\\\\u/g, '\\u').replace(/\\\\n/g, '\\n')
                      const decoded = JSON.parse(`"${unescaped}"`)
                      if (decoded) { fullText = decoded; break }
                    } catch { /* try next marker */ }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch Instagram embed:", e)
        }

        // Fallback: try Jina extracted images if embed failed
        if (!thumbnailUrl) {
          const igImages = extractInstagramImages(rawFullText)
          if (igImages.length > 0) {
            imageUrls = igImages
            thumbnailUrl = igImages[0]
            hasPlatformThumbnail = true
          }
        }
        // Do NOT fall back to Jina text for Instagram — it's always a login page
      }

      // pixiv: fetch illustration info and page images via Ajax API
      if (content.platform === "pixiv") {
        const pixivMatch = content.url.match(/artworks\/(\d+)/)
        if (pixivMatch) {
          const pixivHeaders = { "Referer": "https://www.pixiv.net/", "User-Agent": "Mozilla/5.0" }
          const illustId = pixivMatch[1]

          // Fetch illustration metadata (title, author, description)
          try {
            const illustRes = await fetchWithTimeout(
              `https://www.pixiv.net/ajax/illust/${illustId}`,
              { headers: pixivHeaders },
              10000
            )
            if (illustRes.ok) {
              const illustJson = await illustRes.json()
              if (!illustJson.error && illustJson.body) {
                const pixivTitle = illustJson.body.illustTitle || ""
                const pixivUser = illustJson.body.userName || ""
                const pixivDesc = (illustJson.body.description || "")
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
                  .replace(/<[^>]+>/g, '')
                  .trim()

                if (pixivUser && pixivTitle) {
                  title = `${pixivUser}「${pixivTitle}」`
                } else if (pixivTitle) {
                  title = pixivTitle
                }
                if (pixivUser) author = pixivUser

                // Build full_text: images first, then description
                let pixivFullText = ""

                // Fetch page images
                const pagesRes = await fetchWithTimeout(
                  `https://www.pixiv.net/ajax/illust/${illustId}/pages`,
                  { headers: pixivHeaders },
                  10000
                )
                if (pagesRes.ok) {
                  const pagesJson = await pagesRes.json()
                  if (!pagesJson.error && Array.isArray(pagesJson.body)) {
                    imageUrls = pagesJson.body.map((p: { urls: { regular: string } }) => p.urls.regular)
                    if (imageUrls.length > 0) {
                      thumbnailUrl = imageUrls[0]
                      hasPlatformThumbnail = true
                      pixivFullText = imageUrls.map((url: string, i: number) => `![page${i + 1}](${url})`).join('\n\n')
                    }
                  }
                }

                // Append description below images
                if (pixivDesc) {
                  pixivFullText = pixivFullText ? pixivFullText + '\n\n---\n\n' + pixivDesc : pixivDesc
                }

                if (pixivFullText) fullText = pixivFullText
              }
            }
          } catch (e) {
            console.error("Failed to fetch pixiv illust info:", e)
          }
        }
        // Fallback: OGP image
        if (!thumbnailUrl) {
          const ogImage = extractOgImageFromMetadata(metadata)
          if (ogImage) {
            thumbnailUrl = ogImage
            hasPlatformThumbnail = true
          }
        }
      }

      // note: use OGP image from metadata
      if (content.platform === "note") {
        const ogImage = extractOgImageFromMetadata(metadata)
        if (ogImage) {
          thumbnailUrl = ogImage
          hasPlatformThumbnail = true
        }
      }

      // YouTube: use YouTube thumbnail, correct title via oEmbed, and fetch transcript
      // Uses a fallback chain: watch page → InnerTube WEB → InnerTube ANDROID
      // because InnerTube ANDROID often fails from cloud IPs (Supabase Edge Functions)
      if (content.platform === "youtube") {
        const videoId = extractYoutubeVideoId(content.url)
        if (videoId) {
          thumbnailUrl = getYoutubeThumbnailUrl(videoId)
          hasPlatformThumbnail = true

          let transcript: string | null = null
          let successPlayerData: Record<string, unknown> | null = null

          // 0. External transcript service (highest priority)
          // Supports both GAS Web App and REST API (Render.com, etc.)
          const ytServiceUrl = Deno.env.get("YT_TRANSCRIPT_SERVICE_URL")
          const ytServiceKey = Deno.env.get("YT_TRANSCRIPT_SERVICE_KEY")
          if (ytServiceUrl) {
            try {
              const isGAS = ytServiceUrl.includes("script.google.com")
              const svcUrl = isGAS
                ? `${ytServiceUrl}?key=${ytServiceKey || ""}`
                : `${ytServiceUrl}/transcript`
              const svcHeaders: Record<string, string> = { "Content-Type": "application/json" }
              if (!isGAS && ytServiceKey) svcHeaders["Authorization"] = `Bearer ${ytServiceKey}`
              const svcResp = await fetchWithTimeout(svcUrl, {
                method: "POST",
                headers: svcHeaders,
                body: JSON.stringify({ video_id: videoId, lang: "ja" }),
                redirect: "follow",
              }, 30000)
              if (svcResp.ok) {
                const svcData = await svcResp.json()
                if (svcData.transcript && svcData.transcript.length > 0) {
                  transcript = svcData.transcript
                  console.log(`[yt-transcript-service] Success: ${svcData.length} chars`)
                }
              } else {
                console.log(`[yt-transcript-service] Failed: ${svcResp.status}`)
              }
            } catch (e) {
              console.log(`[yt-transcript-service] Error: ${e}`)
            }
          }

          // Try multiple approaches — YouTube blocks InnerTube from cloud IPs,
          // but the client-side fallback (in api.ts) handles this case.
          // Server-side attempts are kept for cases where they do work.

          // 1. Watch page scraping (skip if already got transcript from external service)
          if (!transcript) {
            const watchPageData = await fetchYoutubePlayerDataViaWatchPage(videoId)
            if (watchPageData) {
              successPlayerData = watchPageData
              transcript = await fetchYoutubeTranscriptFromPlayerData(watchPageData)
            }
          }

          // 2. InnerTube WEB client
          if (!transcript) {
            const webData = await fetchYoutubePlayerData(videoId, "WEB")
            if (webData) {
              if (!successPlayerData) successPlayerData = webData
              transcript = await fetchYoutubeTranscriptFromPlayerData(webData)
            }
          }

          // 3. InnerTube ANDROID client
          if (!transcript) {
            const androidData = await fetchYoutubePlayerData(videoId, "ANDROID")
            if (androidData) {
              if (!successPlayerData) successPlayerData = androidData
              transcript = await fetchYoutubeTranscriptFromPlayerData(androidData)
            }
          }

          // Extract caption URL for client-side fallback (browser TLS bypasses YouTube's JA3 blocking)
          // YouTube blocks Node.js/Deno TLS fingerprints (JA3) on timedtext API, returning empty responses.
          // Browser fetch uses a different TLS stack that YouTube allows, so we pass the URL to the client.
          let captionUrl: string | null = null
          if (!transcript && successPlayerData) {
            const tracks = extractCaptionTracks(successPlayerData)
            if (tracks) {
              const bestTrack =
                tracks.find(t => t.languageCode === "ja" && t.kind !== "asr") ||
                tracks.find(t => t.languageCode === "ja") ||
                tracks.find(t => t.languageCode?.startsWith("ja")) ||
                tracks[0]
              if (bestTrack?.baseUrl) {
                // Add fmt=srv3 for structured XML format
                captionUrl = bestTrack.baseUrl + (bestTrack.baseUrl.includes("fmt=") ? "" : "&fmt=srv3")
              }
            }
          }

          if (transcript) {
            fullText = formatLongText(transcript)
          } else {
            // Pass caption URL to client for browser-based fetching
            ytCaptionUrl = captionUrl
            // All transcript attempts failed: use video description as fallback
            const description = successPlayerData ? extractYoutubeDescription(successPlayerData) : null
            // YouTube Jina content is page HTML (nav, sidebar, recommendations) — never useful.
            // Always overwrite with description or null so client-side fallback can retry.
            fullText = description ? formatLongText(description) : null
          }
        }
        // Always prefer oEmbed title: Jina often returns English-translated titles
        const ytTitle = await fetchYoutubeTitle(content.url)
        if (ytTitle) title = ytTitle
      }

      // Fallback to first article image
      if (!thumbnailUrl) {
        const images = extractArticleImages(rawFullText)
        if (images.length > 0) thumbnailUrl = images[0]
      }
    } else {
      // Fallback: try direct fetch with basic metadata extraction
      const directResponse = await fetchWithTimeout(content.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MyInputBot/1.0)",
        },
      }, 15000)

      if (directResponse.ok) {
        const html = await directResponse.text()
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) title = titleMatch[1].trim()
        const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/)
        if (descMatch) fullText = descMatch[1]
        const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/)
        if (imgMatch) thumbnailUrl = imgMatch[1]
        if (!fullText) {
          fullText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 10000)
        }
      } else {
        throw new Error(`Failed to fetch URL: ${directResponse.status}`)
      }
    }

    } // end else (non-reform-online)

    // Update content with fetched data
    // Keep status as "processing" so the UI continues polling until analyze-content
    // completes and sets the summary. Setting "completed" here would cause the UI
    // to stop polling before the AI summary is ready.
    const { error: updateError } = await supabase
      .from("contents")
      .update({
        title: title || null,
        full_text: fullText || null,
        author: author || null,
        thumbnail_url: thumbnailUrl || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        status: "processing",
      })
      .eq("id", content_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, has_text: !!fullText, has_platform_thumbnail: hasPlatformThumbnail, yt_caption_url: ytCaptionUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { content_id } = await req.clone().json().catch(() => ({ content_id: null }))
      if (content_id) {
        await supabase
          .from("contents")
          .update({ status: "error", error_message: message })
          .eq("id", content_id)
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
