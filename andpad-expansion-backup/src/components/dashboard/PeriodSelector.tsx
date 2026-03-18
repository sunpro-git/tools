import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PeriodType } from '../../lib/aggregation'

interface Props {
  periodType: PeriodType
  onPeriodTypeChange: (type: PeriodType) => void
  label: string
  onPrev: () => void
  onNext: () => void
}

const types: { value: PeriodType; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'quarter', label: '四半期' },
  { value: 'year', label: '年' },
]

export default function PeriodSelector({ periodType, onPeriodTypeChange, label, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex bg-slate-200 rounded-lg p-0.5">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => onPeriodTypeChange(t.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              periodType === t.value
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="p-1 rounded hover:bg-slate-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold min-w-[140px] text-center">{label}</span>
        <button onClick={onNext} className="p-1 rounded hover:bg-slate-200 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
