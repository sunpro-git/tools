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
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!
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

    if (!content.full_text) {
      // No text to analyze — mark as completed
      await supabase.from("contents").update({ status: "completed" }).eq("id", content_id)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // YouTube transcript formatting — clean up raw speech-to-text before analysis
    // Skip if already formatted (contains line breaks)
    if (content.platform === "youtube" && !content.full_text.includes("\n")) {
      try {
        const fullText = content.full_text as string
        const CHUNK_SIZE = 6000
        const chunks: string[] = []
        for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
          chunks.push(fullText.substring(i, i + CHUNK_SIZE))
        }

        const systemPrompt = `あなたはYouTube文字起こしの整形アシスタントです。以下のルールに従ってテキストを整形してください：

【必須ルール】
- 要約しない。内容を省略しない。元のテキストの意味を変えない。
- 句読点（。、？）を適切に補う。
- 話題の切り替わりや発言者の交代で必ず空行（2つの改行）を入れて段落を分ける。
- 1つの発言や文のまとまりごとに改行を入れる。
- 音声認識の誤変換・誤字を文脈から推測して正しい日本語に積極的に修正する。例：「音社」→「御社」、「マを自して」→「間を持して」、「受中」→「受注」、「会議的」→「懐疑的」、「因素分解」→「因数分解」、「賞機」→「商機」など。
- 不自然な単語の区切りや繰り返しを自然な文に整える。
- [音楽] などの注釈はそのまま残す。
- 整形後のテキストのみを返す（説明やコメントは不要）。

【出力形式の例】
これはガチですか？

[音楽]

本日はロールプレイ企画をお届けさせていただきます。
営業の皆さん、プロの営業の方がどんな営業を普段しているか気になりますよね。
今日はロープレを通じてその秘密を解き明かしていきたいと思っております。`

        // Process all chunks in parallel to stay within timeout
        const formattedChunks = await Promise.all(chunks.map(async (chunk) => {
          try {
            const fmtResponse = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: chunk },
                ],
                temperature: 0.2,
                max_tokens: 8000,
              }),
            }, 60000)
            if (fmtResponse.ok) {
              const fmtData = await fmtResponse.json()
              return fmtData.choices?.[0]?.message?.content || chunk
            }
            return chunk
          } catch {
            return chunk
          }
        }))

        const formattedText = formattedChunks.join("\n\n")
        // Update full_text in DB with formatted version
        await supabase
          .from("contents")
          .update({ full_text: formattedText })
          .eq("id", content_id)
        // Use formatted text for subsequent analysis
        content.full_text = formattedText
      } catch (fmtErr) {
        console.error("YouTube transcript formatting failed:", fmtErr)
        // Continue with original text if formatting fails
      }
    }

    // Build image list for AI thumbnail selection
    const articleImages = extractArticleImages(content.full_text)
    const imageListText = articleImages.length > 0
      ? `\n\n記事内の画像URL一覧:\n${articleImages.slice(0, 10).map((url: string, i: number) => {
          const altMatch = content.full_text.match(new RegExp(`!\\[(.*?)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
          const alt = altMatch ? altMatch[1] : ''
          return `${i + 1}. ${url}${alt ? ` (${alt})` : ''}`
        }).join('\n')}`
      : ''

    // Fetch existing tags for normalization
    const { data: tagRows } = await supabase
      .from("contents")
      .select("tags")
      .not("tags", "is", null)
    const tagCounts = new Map<string, number>()
    for (const row of tagRows || []) {
      for (const t of (row.tags as string[]) || []) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
      }
    }
    const existingTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([t]) => t)
    const existingTagsText = existingTags.length > 0
      ? `\n\n既存タグ一覧（使用頻度順）: ${existingTags.join(', ')}`
      : ''

    // Truncate text if too long for API
    const textToAnalyze = content.full_text.substring(0, 16000)

    // Call OpenAI API (gpt-4o for higher quality summary)
    const openaiResponse = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `あなたはコンテンツ分析アシスタントです。与えられたテキストを分析し、以下のJSON形式で結果を返してください。
{
  "summary": "コンテンツの内容が十分に伝わる詳細な日本語の要約。基本は2000文字前後で、内容が薄い場合は短く、濃い場合は最大3000文字まで拡張してよい。単なる概要ではなく、主要なポイント・主張・結論・具体的なエピソードを含めること。読者がこの要約だけで内容を把握できるレベルの情報量にする。話題の区切りでは改行（\\n）を入れて読みやすくすること。見出しや箇条書きは不要で、自然な文章で書くこと。",
  "category": "以下のカテゴリーから1つ選択: テクノロジー, ビジネス, ライフスタイル, エンタメ, 教育, ニュース, スポーツ, 科学, 政治, 文化, 健康, 料理, 旅行, ファッション, アート, 音楽, ゲーム, その他",
  "tags": ["関連するタグを3〜5個。既存タグ一覧に同じ意味・類似する概念のタグがあれば、新しいタグを作らずにそれを優先的に使うこと。表記ゆれ（例: 仮想通貨/暗号資産）を避け、既存タグに統一すること。"],
  "best_thumbnail": "記事内の画像URL一覧から、記事のサムネイルとして最も適切な画像のURLを1つ選んでください。記事のヘッダー画像、タイトルが含まれるメインビジュアル、記事のテーマを象徴するアイキャッチ画像を最優先してください。表やグラフよりも、デザインされたビジュアル画像を優先してください。画像がない場合はnullにしてください。"
}
必ず有効なJSONのみを返してください。`,
          },
          {
            role: "user",
            content: `以下のコンテンツを分析してください:\n\nタイトル: ${content.title || "不明"}\nプラットフォーム: ${content.platform}\n\n本文:\n${textToAnalyze}${imageListText}${existingTagsText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    }, 60000)

    if (!openaiResponse.ok) {
      const err = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${err.error?.message || "Unknown error"}`)
    }

    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices?.[0]?.message?.content || ""

    // Parse JSON response
    let analysis: { summary?: string; category?: string; tags?: string[]; best_thumbnail?: string }
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON found in response")
      analysis = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error("Failed to parse AI response")
    }

    // Use AI-selected thumbnail only if no platform-specific thumbnail exists
    // (platform thumbnails like YouTube/note/X are set by fetch-content)
    const hasPlatformThumbnail = ['youtube', 'note', 'x', 'instagram', 'threads', 'pixiv'].includes(content.platform) && content.thumbnail_url
    const bestThumbnail = hasPlatformThumbnail
      ? content.thumbnail_url
      : (analysis.best_thumbnail || content.thumbnail_url || null)

    // Update content with analysis
    const { error: updateError } = await supabase
      .from("contents")
      .update({
        summary: analysis.summary || null,
        category: analysis.category || null,
        tags: analysis.tags || [],
        thumbnail_url: bestThumbnail,
        status: "completed",
      })
      .eq("id", content_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
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
