import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/** Truncate text to maxLen characters, adding "…" if truncated */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "…"
}

const APP_URL = "https://sunpro-go.jp/my-input"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  const url = new URL(req.url)
  const contentId = url.searchParams.get("id")

  if (!contentId) {
    return new Response("Missing id parameter", { status: 400 })
  }
  if (!UUID_RE.test(contentId)) {
    return new Response("Invalid id format", { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: content, error } = await supabase
    .from("contents")
    .select("id, title, summary, thumbnail_url")
    .eq("id", contentId)
    .single()

  if (error || !content) {
    return new Response("Content not found", { status: 404 })
  }

  const title = escapeHtml(content.title || "MY INPUT")
  const description = escapeHtml(truncate(content.summary || "", 200))
  const image = content.thumbnail_url ? escapeHtml(content.thumbnail_url) : ""
  const appUrl = `${APP_URL}/#content/${contentId}`
  const ogpUrl = escapeHtml(`${url.origin}${url.pathname}?id=${contentId}`)

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${ogpUrl}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ""}
  <meta property="og:site_name" content="MY INPUT" />

  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ""}

  <title>${title}</title>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(appUrl)}">MY INPUT</a>...</p>
  <script>window.location.href=${JSON.stringify(appUrl)};</script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  })
})
