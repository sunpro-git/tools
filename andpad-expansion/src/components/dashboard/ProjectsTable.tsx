import { useState, useMemo } from 'react'
import type { Deal } from '../../types/database'
import { formatDate, formatYenFull } from '../../lib/formatters'

interface Props {
  deals: Deal[]
}

const STATUS_COLORS: Record<string, string> = {
  '問い合わせ': 'bg-blue-100 text-blue-800',
  '商談': 'bg-cyan-100 text-cyan-800',
  '見積': 'bg-amber-100 text-amber-800',
  '受注': 'bg-green-100 text-green-800',
  '着工': 'bg-purple-100 text-purple-800',
  '施工中': 'bg-purple-100 text-purple-800',
  '完工': 'bg-emerald-100 text-emerald-800',
  '失注': 'bg-red-100 text-red-800',
  'その他': 'bg-slate-100 text-slate-800',
}

type SortKey = 'name' | 'status' | 'order_amount' | 'order_date' | 'staff_name' | 'store_name'

export default function ProjectsTable({ deals }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('order_date')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sortKey === 'order_amount') {
        va = a.order_amount || 0
        vb = b.order_amount || 0
      } else {
        va = (a[sortKey] || '') as string
        vb = (b[sortKey] || '') as string
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
  }, [deals, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:text-slate-900 select-none"
    >
      {label} {sortKey === field ? (sortAsc ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">案件一覧（直近50件）</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-200">
            <tr>
              <SortHeader label="案件名" field="name" />
              <SortHeader label="ステータス" field="status" />
              <SortHeader label="店舗" field="store_name" />
              <SortHeader label="担当者" field="staff_name" />
              <SortHeader label="受注金額" field="order_amount" />
              <SortHeader label="受注日" field="order_date" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.slice(0, 50).map((deal) => (
              <tr key={deal.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900 max-w-[200px] truncate">
                  {deal.name}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status] || STATUS_COLORS['その他']}`}>
                    {deal.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{deal.store_name || '-'}</td>
                <td className="px-3 py-2 text-slate-600">{deal.staff_name || '-'}</td>
                <td className="px-3 py-2 text-slate-900 font-mono">
                  {deal.order_amount ? formatYenFull(deal.order_amount) : '-'}
                </td>
                <td className="px-3 py-2 text-slate-600">{formatDate(deal.order_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {deals.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            データがありません。CSVインポートからデータを取り込んでください。
          </div>
        )}
      </div>
    </div>
  )
}
