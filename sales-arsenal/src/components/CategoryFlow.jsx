import React from 'react'
import { CATEGORIES } from '../data.jsx'

export default function CategoryFlow({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide">
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0
              ${isSelected
                ? `${cat.color} text-white shadow-md scale-105`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {cat.icon}
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
