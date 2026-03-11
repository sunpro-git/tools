import React, { useState } from 'react'
import { Users } from 'lucide-react'

export default function CompletedUsersTooltip({ completedBy = [] }) {
  const [visible, setVisible] = useState(false)

  if (completedBy.length === 0) return null

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full hover:bg-indigo-100 transition-colors"
      >
        <Users className="w-3 h-3" />
        {completedBy.length}人が習得済み
      </button>
      {visible && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl p-3 w-48 z-20">
          <p className="font-semibold mb-1.5 text-gray-300">習得済みメンバー</p>
          <ul className="space-y-1">
            {completedBy.map((entry, i) => {
              const name = typeof entry === 'string' ? entry : entry.name
              return (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {name?.charAt(0) || '?'}
                  </span>
                  {name}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
