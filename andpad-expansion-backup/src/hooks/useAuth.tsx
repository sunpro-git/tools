import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isAllowedEmail, signOut } from '../lib/auth'

type AuthState = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isAllowedEmail(session.user.email)) {
        signOut()
        setState({ user: null, loading: false })
        return
      }
      setState({ user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user && !isAllowedEmail(session.user.email)) {
          signOut()
          setState({ user: null, loading: false })
          return
        }
        setState({ user: session?.user ?? null, loading: false })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
