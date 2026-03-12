import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "MyInputBot/1.0" },
    })
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
    const playerResp = await fetch(
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
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ja`, {
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

    const captionResp = await fetch(selectedTrack.baseUrl)
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
    const resp = await fetch(oembedUrl, {
      headers: { "Accept-Language": "ja,en-US;q=0.7,en;q=0.3" },
    })
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

  const resp = await fetch(`https://r.jina.ai/${url}`, { headers: jinaHeaders })
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
  const pageResp = await fetch(articleUrl, { headers: BROWSER_HEADERS, redirect: "follow" })
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

  const loginResp = await fetch(
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
    }
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

  const resp = await fetch(`https://r.jina.ai/${url}`, { headers: jinaHeaders })
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

    // All other sites: Jina Reader API
    else {

    const jinaResponse = await fetch(`https://r.jina.ai/${content.url}`, {
      headers: { "Accept": "application/json", "Accept-Language": "ja,en-US;q=0.7,en;q=0.3" },
    })

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

      // Format long text for other platforms (note, other, etc.) — skip Instagram (handled separately)
      if (content.platform !== "x" && content.platform !== "instagram" && fullText) {
        fullText = formatLongText(fullText)
      }

      // Instagram: extract carousel images and clean up caption text
      if (content.platform === "instagram") {
        const igImages = extractInstagramImages(rawFullText)
        if (igImages.length > 0) {
          imageUrls = igImages
          thumbnailUrl = igImages[0]
          hasPlatformThumbnail = true
        }
        fullText = formatInstagramPostText(rawFullText)
        // Fallback: try OGP image
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

          // 0. External Python transcript service (highest priority)
          // Uses youtube-transcript-api via Render.com — bypasses YouTube cloud IP blocks
          const ytServiceUrl = Deno.env.get("YT_TRANSCRIPT_SERVICE_URL")
          const ytServiceKey = Deno.env.get("YT_TRANSCRIPT_SERVICE_KEY")
          if (ytServiceUrl) {
            try {
              const svcHeaders: Record<string, string> = { "Content-Type": "application/json" }
              if (ytServiceKey) svcHeaders["Authorization"] = `Bearer ${ytServiceKey}`
              const svcResp = await fetch(`${ytServiceUrl}/transcript`, {
                method: "POST",
                headers: svcHeaders,
                body: JSON.stringify({ video_id: videoId, lang: "ja" }),
              })
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
      const directResponse = await fetch(content.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MyInputBot/1.0)",
        },
      })

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
    // Set status to "completed" here so that even if the client disconnects
    // before analyze-content runs, the content won't be stuck in "processing".
    // analyze-content will also set "completed" on success, so this is safe.
    const { error: updateError } = await supabase
      .from("contents")
      .update({
        title: title || null,
        full_text: fullText || null,
        author: author || null,
        thumbnail_url: thumbnailUrl || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        status: "completed",
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
