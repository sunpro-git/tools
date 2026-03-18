import { useState } from 'react'
import { signInWithGoogle } from '../lib/auth'

export default function LoginPage({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Login failed:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-sm w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-8 h-8 flex items-center justify-center font-black text-2xl text-red-500" style={{ fontFamily: 'Arial Black, Arial, sans-serif', lineHeight: 1 }}>A</span>
          <h1 className="text-2xl font-bold">ANDPAD集計</h1>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          @sunpro36.co.jp のGoogleアカウントで<br />ログインしてください
        </p>
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="font-medium">
            {loading ? 'リダイレクト中...' : 'Googleでログイン'}
          </span>
        </button>
      </div>
    </div>
  )
}
