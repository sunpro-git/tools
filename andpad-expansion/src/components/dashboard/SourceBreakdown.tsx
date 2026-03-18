import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { BreakdownItem } from '../../lib/aggregation'

interface Props {
  data: BreakdownItem[]
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16']

export default function SourceBreakdown({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">媒体別集客</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-slate-400">データなし</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={true}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${Number(value)}件`, '件数']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
