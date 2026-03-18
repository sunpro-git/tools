import { supabase } from './supabase'

const ALLOWED_DOMAIN = 'sunpro36.co.jp'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/andpad-expansion/',
    },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function isAllowedEmail(email: string | undefined): boolean {
  if (!email) return false
  return email.endsWith(`@${ALLOWED_DOMAIN}`)
}
