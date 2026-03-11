import React from 'react'
import { Home, BookOpen, TrendingUp } from 'lucide-react'

const TABS = [
  { id: 'home',     label: 'ホーム',     icon: Home },
  { id: 'study',    label: '学習中',     icon: BookOpen },
  { id: 'ranking',  label: 'ランキング', icon: TrendingUp },
]

export default function BottomNav({ currentTab, onTabChange }) {
  return (
    <nav className="bg-white border-t border-gray-200 flex">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = currentTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors
              ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-2' : ''}`} />
            <span className={`text-[10px] font-medium ${active ? 'text-indigo-600' : ''}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
