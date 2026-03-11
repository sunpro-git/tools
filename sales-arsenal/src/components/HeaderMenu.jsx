import React, { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, User, Shield } from 'lucide-react'

export default function HeaderMenu({ user, onLogout, onAdminPanel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full hover:bg-white/20 transition-colors"
        aria-label="メニューを開く"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 w-52 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || '名前未設定'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="p-1">
            {user?.role === 'admin' && (
              <button
                onClick={() => { setOpen(false); onAdminPanel() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-500" />
                管理者パネル
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
