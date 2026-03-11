import React from 'react'
import { ShieldCheck } from 'lucide-react'

export default function SupervisorBadge({ approved }) {
  if (!approved) return null
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      <ShieldCheck className="w-3 h-3" />
      上司認定
    </span>
  )
}
