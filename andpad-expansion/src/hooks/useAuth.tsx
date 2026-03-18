import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isAllowedEmail, signOut } from '../lib/auth'

type AuthState = {
  user: User | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null })

  useEffect(() => {
    // OAuthリダイレクト後、URLハッシュからセッションを検出する
    // HashRouterとの競合を避けるため、先にハッシュを処理する
    const hash = window.location.hash
    const hasAuthParams = hash.includes('access_token=') || hash.includes('error=')

    const initSession = async () => {
      if (hasAuthParams) {
        // OAuthコールバック: ハッシュからセッションを取得するまで待つ
        // supabase-jsが自動的にハッシュを解析してセッションを設定する
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth callback error:', error)
          setState({ user: null, loading: false, error: null })
          return
        }
        if (session?.user) {
          if (!isAllowedEmail(session.user.email)) {
            await signOut()
            setState({ user: null, loading: false, error: '@sunpro36.co.jp のアカウントのみログインできます' })
            return
          }
          // 認証パラメータをURLから除去
          window.location.hash = ''
          setState({ user: session.user, loading: false, error: null })
          return
        }
      }

      // 通常のセッション確認
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && !isAllowedEmail(session.user.email)) {
        await signOut()
        setState({ user: null, loading: false, error: '@sunpro36.co.jp のアカウントのみログインできます' })
        return
      }
      setState({ user: session?.user ?? null, loading: false, error: null })
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user && !isAllowedEmail(session.user.email)) {
          signOut()
          setState({ user: null, loading: false, error: '@sunpro36.co.jp のアカウントのみログインできます' })
          return
        }
        setState({ user: session?.user ?? null, loading: false, error: null })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
