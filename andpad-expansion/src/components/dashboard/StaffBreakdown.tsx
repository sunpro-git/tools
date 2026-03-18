import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { BreakdownItem } from '../../lib/aggregation'

interface Props {
  data: BreakdownItem[]
}

export default function StaffBreakdown({ data }: Props) {
  const chartData = data.slice(0, 10).map((d) => ({
    ...d,
    amountManEn: Math.round(d.amount / 10000),
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">担当店舗別受注</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-slate-400">データなし</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} unit="万" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}万円`, '売上']} />
            <Bar dataKey="amountManEn" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
