import type { FunnelStep } from '../../lib/aggregation'
import { formatPercentValue } from '../../lib/formatters'

interface Props {
  data: FunnelStep[]
}

const BAR_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#22c55e', '#a855f7']

export default function StatusFunnel({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">ステータス推移</h3>
      <div className="space-y-3">
        {data.map((step, i) => (
          <div key={step.name} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-20 text-right flex-shrink-0">{step.name}</span>
            <div className="flex-1 relative">
              <div className="h-8 bg-slate-100 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${(step.count / maxCount) * 100}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    minWidth: step.count > 0 ? '24px' : '0',
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-900 w-12 text-right">{step.count}件</span>
            <span className="text-xs text-slate-500 w-14 text-right">
              {formatPercentValue(step.rate * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
