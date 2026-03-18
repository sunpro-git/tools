import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { MonthlyData } from '../../lib/aggregation'

interface Props {
  data: MonthlyData[]
}

export default function MonthlyTrendChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: d.month.slice(5) + '月',
    salesManEn: Math.round(d.sales / 10000),
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">月次推移</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="万" />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value)
              if (name === '売上(万円)') return [`${v.toLocaleString()}万円`, name]
              return [`${v}件`, name]
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="inquiries" name="集客" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="orders" name="受注" fill="#22c55e" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="completions" name="完工" fill="#a855f7" radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" dataKey="salesManEn" name="売上(万円)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
