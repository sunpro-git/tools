import React from 'react'
import { Heart } from 'lucide-react'

export default function LikesBadge({ count, liked, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
        ${liked
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
      <span>{count}</span>
    </button>
  )
}
