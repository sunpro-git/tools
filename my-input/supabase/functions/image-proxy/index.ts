const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return new Response("Missing url parameter", { status: 400, headers: corsHeaders })
    }

    // Only allow proxying specific image CDNs
    const parsed = new URL(imageUrl)
    const allowedHosts = ["pximg.net", "cdninstagram.com", "fbcdn.net"]
    if (!allowedHosts.some(h => parsed.hostname.endsWith(h))) {
      return new Response("URL not allowed", { status: 403, headers: corsHeaders })
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    if (parsed.hostname.endsWith("pximg.net")) {
      headers["Referer"] = "https://www.pixiv.net/"
    } else {
      headers["Referer"] = "https://www.threads.net/"
    }

    const response = await fetch(imageUrl, { headers })

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status, headers: corsHeaders })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const body = await response.arrayBuffer()

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders })
  }
})
