import { supabase } from './supabase'
import { detectPlatform } from './platform'
import type { Content, User, Team } from '../types/database'

// ---- Teams ----

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')

  if (error) throw error
  return (data || []) as Team[]
}

export async function addTeam(name: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ name })
    .select('*')
    .single()

  if (error) throw error
  return data as Team
}

export async function updateTeam(id: string, name: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Team
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// ---- Users ----

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*, team:teams(id, name)')
    .order('name')

  if (error) throw error
  return (data || []) as User[]
}

export async function addUser(name: string, color?: string, icon?: string, teamId?: string | null): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ name, color: color || null, icon: icon || null, team_id: teamId || null })
    .select('*, team:teams(id, name)')
    .single()

  if (error) throw error
  return data as User
}

export async function updateUser(id: string, fields: { name?: string; color?: string | null; icon?: string | null; team_id?: string | null }): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(fields)
    .eq('id', id)
    .select('*, team:teams(id, name)')
    .single()

  if (error) throw error
  return data as User
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

// ---- Contents ----

export async function addContent(url: string, userId: string): Promise<Content> {
  const platform = detectPlatform(url)

  const { data, error } = await supabase
    .from('contents')
    .insert({
      url,
      platform,
      user_id: userId,
      status: 'pending',
      title: null,
      full_text: null,
      summary: null,
      category: null,
      tags: [],
      thumbnail_url: null,
      author: null,
      published_at: null,
      error_message: null,
    })
    .select('*, user:users(id, name, color, icon)')
    .single()

  if (error) throw error
  return data as Content
}

/** Sanitize search input for PostgREST ILIKE filter */
function sanitizeSearch(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[,.()"']/g, '')
}

export async function fetchContents(filters?: {
  platform?: string
  category?: string
  tag?: string
  search?: string
  feedback?: string
  userId?: string
  userIds?: string[]
}): Promise<Content[]> {
  let query = supabase
    .from('contents')
    .select('*, user:users(id, name, color, icon)')
    .order('created_at', { ascending: false })

  if (filters?.userIds && filters.userIds.length > 0) {
    query = query.in('user_id', filters.userIds)
  } else if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters?.platform) {
    query = query.eq('platform', filters.platform)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag])
  }
  if (filters?.search) {
    const sanitized = sanitizeSearch(filters.search)
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,full_text.ilike.%${sanitized}%`)
    }
  }
  if (filters?.feedback === 'favorite') {
    query = query.eq('is_favorite', true)
  } else if (filters?.feedback === 'adopted') {
    query = query.eq('is_adopted', true)
  } else if (filters?.feedback === 'stocked') {
    query = query.eq('is_stocked', true)
  } else if (filters?.feedback === 'furui') {
    query = query.eq('is_mou_furui', true)
  } else if (filters?.feedback === 'bimyou') {
    query = query.eq('is_mou_bimyou', true)
  } else if (filters?.feedback === 'rated') {
    query = query.not('rating', 'is', null)
  } else if (filters?.feedback?.startsWith('rating_')) {
    const ratingValue = parseInt(filters.feedback.replace('rating_', ''), 10)
    query = query.eq('rating', ratingValue)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Content[]
}

export async function fetchContentById(id: string): Promise<Content | null> {
  const { data, error } = await supabase
    .from('contents')
    .select('*, user:users(id, name, color, icon)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Content | null
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase.from('contents').delete().eq('id', id)
  if (error) throw error
}

/** Fetch YouTube transcript from the browser (client-side fallback).
 *  YouTube blocks InnerTube API calls from cloud IPs, but allows them from residential IPs.
 *  This runs in the user's browser which has a residential IP. */
async function fetchYoutubeTranscriptClientSide(videoId: string): Promise<string | null> {
  try {
    const resp = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "ja", gl: "JP" },
          },
          videoId,
        }),
      }
    )
    if (!resp.ok) return null
    const data = await resp.json()

    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
      | Array<{ languageCode: string; kind?: string; baseUrl: string }>
      | undefined
    if (!tracks || tracks.length === 0) return null

    const track =
      tracks.find(t => t.languageCode === "ja" && t.kind !== "asr") ||
      tracks.find(t => t.languageCode === "ja") ||
      tracks.find(t => t.languageCode?.startsWith("ja")) ||
      tracks[0]
    if (!track?.baseUrl) return null

    const captionResp = await fetch(track.baseUrl)
    if (!captionResp.ok) return null
    const xml = await captionResp.text()

    const segments: string[] = []
    const decode = (t: string) => t
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/\n/g, " ").trim()

    if (xml.includes('format="3"')) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g
      let m
      while ((m = pRegex.exec(xml)) !== null) {
        const sRegex = /<s[^>]*>([^<]*)<\/s>/g
        let seg = ""
        let sm
        while ((sm = sRegex.exec(m[1])) !== null) seg += sm[1]
        if (!seg) seg = m[1].replace(/<[^>]+>/g, "")
        seg = decode(seg)
        if (seg) segments.push(seg)
      }
    } else {
      const tRegex = /<text[^>]*>([\s\S]*?)<\/text>/g
      let m
      while ((m = tRegex.exec(xml)) !== null) {
        const t = decode(m[1])
        if (t) segments.push(t)
      }
    }

    return segments.length > 0 ? segments.join(" ") : null
  } catch {
    return null
  }
}

/** Extract YouTube video ID from URL */
function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
    if (u.hostname.includes('youtube.com')) {
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shorts) return shorts[1]
      return u.searchParams.get('v') || u.pathname.match(/\/embed\/([^/?]+)/)?.[1] || null
    }
    return null
  } catch { return null }
}

export async function processContent(id: string): Promise<void> {
  try {
    // Step 1: Fetch and format content (server-side)
    const { data: fetchResult, error: fetchErr } = await supabase.functions.invoke('fetch-content', {
      body: { content_id: id },
    })
    if (fetchErr) throw new Error(fetchErr.message || 'コンテンツの取得に失敗しました')

    // Step 1.5: Client-side YouTube transcript fallback
    // YouTube blocks InnerTube API from cloud IPs, so the Edge Function often fails
    // to get transcripts. The browser has a residential IP where it works.
    if (fetchResult && !fetchResult.has_text) {
      const { data: content } = await supabase
        .from('contents')
        .select('platform, url')
        .eq('id', id)
        .single()

      if (content?.platform === 'youtube' && content.url) {
        const videoId = extractVideoId(content.url)
        if (videoId) {
          console.log('[YT] Server failed to get transcript, trying client-side fallback...')
          const transcript = await fetchYoutubeTranscriptClientSide(videoId)
          if (transcript) {
            console.log(`[YT] Client-side transcript: ${transcript.length} chars`)
            await supabase
              .from('contents')
              .update({ full_text: transcript })
              .eq('id', id)
          }
        }
      }
    }

    // Step 2: AI analysis (server-side, OpenAI key is on the server)
    const { error: analyzeErr } = await supabase.functions.invoke('analyze-content', {
      body: { content_id: id },
    })
    if (analyzeErr) {
      console.error('AI analysis failed:', analyzeErr)
      // Don't throw — content was fetched successfully, analysis is optional
      // But ensure status is updated so the UI doesn't stay stuck on "processing"
      await supabase
        .from('contents')
        .update({ status: 'completed' })
        .eq('id', id)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('contents')
      .update({ status: 'error', error_message: message })
      .eq('id', id)
    throw error
  }
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('contents')
    .select('category')
    .not('category', 'is', null)

  if (error) throw error
  const rows = (data || []) as { category: string }[]
  const unique = [...new Set(rows.map((d) => d.category).filter(Boolean))]
  return unique.sort()
}

export async function updateContentFeedback(
  id: string,
  fields: {
    rating?: number | null
    is_favorite?: boolean
    is_adopted?: boolean
    is_mou_bimyou?: boolean
    is_stocked?: boolean
    comment?: string | null
  }
): Promise<Content> {
  const { data, error } = await supabase
    .from('contents')
    .update(fields)
    .eq('id', id)
    .select('*, user:users(id, name, color, icon)')
    .single()

  if (error) throw error
  return data as Content
}

export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('contents')
    .select('tags')
    .not('tags', 'is', null)

  if (error) throw error
  const rows = (data || []) as { tags: string[] }[]
  const allTags = rows.flatMap((d) => d.tags || [])
  const unique = [...new Set(allTags)]
  return unique.sort()
}

// ---- Likes ----

export async function fetchLikesForContents(
  contentIds: string[],
  currentUserId: string
): Promise<Record<string, { count: number; likedByMe: boolean }>> {
  if (contentIds.length === 0) return {}

  const { data, error } = await supabase
    .from('content_likes')
    .select('content_id, user_id')
    .in('content_id', contentIds)

  if (error) throw error

  const result: Record<string, { count: number; likedByMe: boolean }> = {}
  for (const row of data || []) {
    if (!result[row.content_id]) {
      result[row.content_id] = { count: 0, likedByMe: false }
    }
    result[row.content_id].count++
    if (row.user_id === currentUserId) {
      result[row.content_id].likedByMe = true
    }
  }
  return result
}

export async function toggleLike(contentId: string, userId: string): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('content_likes')
    .select('id')
    .eq('content_id', contentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Unlike
    await supabase
      .from('content_likes')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', userId)
    return false
  } else {
    // Like
    const { error } = await supabase
      .from('content_likes')
      .insert({ content_id: contentId, user_id: userId })
    if (error) throw error
    return true
  }
}
