import type { Platform } from '../types/database'

export function detectPlatform(url: string): Platform {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    if (host.includes('note.com') || host.includes('note.mu')) return 'note'
    if (host.includes('twitter.com') || host.includes('x.com')) return 'x'
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'

    return 'other'
  } catch {
    return 'other'
  }
}

/** Check if URL is from reform-online.jp */
function isReformOnline(url?: string): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname.toLowerCase().includes('reform-online.jp')
  } catch {
    return false
  }
}

/** Check if URL is from s-housing.jp (新建ハウジング) */
function isShinkenHousing(url?: string): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname.toLowerCase().includes('s-housing.jp')
  } catch {
    return false
  }
}

export function getPlatformLabel(platform: Platform, url?: string): string {
  if (platform === 'other' && isReformOnline(url)) return 'リフォーム産業新聞'
  if (platform === 'other' && isShinkenHousing(url)) return '新建ハウジング'
  const labels: Record<Platform, string> = {
    note: 'note',
    x: 'X (Twitter)',
    instagram: 'Instagram',
    youtube: 'YouTube',
    other: 'その他',
  }
  return labels[platform]
}

/** Extract YouTube video ID from various URL formats */
export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    // youtu.be/VIDEO_ID
    if (host.includes('youtu.be')) {
      return u.pathname.slice(1).split('/')[0] || null
    }

    if (host.includes('youtube.com')) {
      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
      if (shortsMatch) return shortsMatch[1]

      // youtube.com/watch?v=VIDEO_ID
      const v = u.searchParams.get('v')
      if (v) return v

      // youtube.com/embed/VIDEO_ID
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
      if (embedMatch) return embedMatch[1]
    }

    return null
  } catch {
    return null
  }
}

/** Get YouTube thumbnail URL from video ID */
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** Get YouTube embed URL from video ID */
export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

export function getPlatformColor(platform: Platform, url?: string): string {
  if (platform === 'other' && isReformOnline(url)) return 'bg-emerald-100 text-emerald-800'
  if (platform === 'other' && isShinkenHousing(url)) return 'bg-sky-100 text-sky-800'
  const colors: Record<Platform, string> = {
    note: 'bg-green-100 text-green-800',
    x: 'bg-gray-100 text-gray-800',
    instagram: 'bg-pink-100 text-pink-800',
    youtube: 'bg-red-100 text-red-800',
    other: 'bg-blue-100 text-blue-800',
  }
  return colors[platform]
}
