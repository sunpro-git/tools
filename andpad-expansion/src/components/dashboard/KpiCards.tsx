import { Users, TrendingUp, Banknote, CheckCircle } from 'lucide-react'
import type { KpiData } from '../../lib/aggregation'
import { formatYen, formatPercentValue, formatDelta } from '../../lib/formatters'

interface Props {
  current: KpiData
  previous: KpiData
}

export default function KpiCards({ current, previous }: Props) {
  const cards = [
    {
      label: '集客数',
      value: String(current.inquiryCount),
      unit: '件',
      delta: formatDelta(current.inquiryCount, previous.inquiryCount),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: '受注率',
      value: formatPercentValue(current.orderRate * 100),
      unit: '',
      delta: formatDelta(current.orderRate, previous.orderRate),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: '売上',
      value: formatYen(current.totalSales),
      unit: '',
      delta: formatDelta(current.totalSales, previous.totalSales),
      icon: Banknote,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: '完工数',
      value: String(current.completionCount),
      unit: '件',
      delta: formatDelta(current.completionCount, previous.completionCount),
      icon: CheckCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{card.value}</span>
            {card.unit && <span className="text-xs text-slate-500">{card.unit}</span>}
          </div>
          <div className="mt-1">
            <span
              className={`text-xs font-medium ${
                card.delta.positive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {card.delta.text}
            </span>
            <span className="text-xs text-slate-400 ml-1">前期比</span>
          </div>
        </div>
      ))}
    </div>
  )
}
