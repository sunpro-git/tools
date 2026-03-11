import React from 'react'
import { Sword } from 'lucide-react'
import HeaderMenu from './HeaderMenu.jsx'

export default function AppHeader({ user, onLogout, onAdminPanel }) {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <Sword className="w-6 h-6" />
        <h1 className="text-lg font-bold tracking-tight">営業の武器庫</h1>
      </div>
      <HeaderMenu user={user} onLogout={onLogout} onAdminPanel={onAdminPanel} />
    </header>
  )
}
