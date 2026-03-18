import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Proxy image URLs through Edge Function to bypass CDN restrictions (pixiv, Instagram/Threads) */
export function proxyImageUrl(url: string): string {
  if (url.includes('pximg.net') || url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}
