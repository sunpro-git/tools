import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAll } from '../../lib/supabase'
import type { Deal } from '../../types/database'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts'

// 反響区分の先頭2桁ごとの色マップ
const GROUP_COLORS: Record<string, string> = {
  '01': '#3b82f6', // オーナー様本人・スタッフ本人 → 青
  '02': '#10b981', // 紹介系 → 緑
  '03': '#f59e0b', // WEB・SNS系 → 黄
  '04': '#ef4444', // チラシ → 赤
  '05': '#8b5cf6', // 雑誌・テレビCM → 紫
  '06': '#ec4899', // SUUMO・ハピすむ・HOME'S → ピンク
  '07': '#06b6d4', // 総展 → シアン
  '08': '#84cc16', // 看板・通りすがり → ライム
  '09': '#f97316', // 資料請求 → オレンジ
  '10': '#64748b', // きっかけ不明 → グレー
  '11': '#6366f1', // その他イベント → インディゴ
  '12': '#d946ef', // 見学会・お披露目会 → フューシャ
}
const FALLBACK_COLOR = '#94a3b8'

const GROUP_LABELS = [
  { prefix: '01', label: 'オーナー・本人' },
  { prefix: '02', label: '紹介' },
  { prefix: '03', label: 'WEB・SNS' },
  { prefix: '04', label: 'チラシ' },
  { prefix: '05', label: '雑誌・TV' },
  { prefix: '06', label: 'SUUMO等' },
  { prefix: '07', label: '総展' },
  { prefix: '08', label: '看板・通り' },
  { prefix: '09', label: '資料請求' },
  { prefix: '10', label: 'きっかけ不明' },
  { prefix: '11', label: 'その他イベント' },
  { prefix: '12', label: '見学会' },
]

function getCategoryColor(name: string): string {
  const prefix = name.slice(0, 2)
  return GROUP_COLORS[prefix] || FALLBACK_COLOR
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

type ViewMode = 'monthly' | 'quarterly' | 'yearly'

/**
 * 9月始まりの期(sn)と四半期を算出
 * Q1: 9-11月, Q2: 12-2月, Q3: 3-5月, Q4: 6-8月
 * 2024/9～2025/8 → 2025sn
 */
function getFiscalQuarter(dateStr: string): { snYear: number; quarter: number } {
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(5, 7))
  // 9月以降は翌年度、8月以前は当年度
  const snYear = month >= 9 ? year + 1 : year
  let quarter: number
  if (month >= 9 && month <= 11) quarter = 1
  else if (month === 12 || month <= 2) quarter = 2
  else if (month >= 3 && month <= 5) quarter = 3
  else quarter = 4
  return { snYear, quarter }
}

function getFiscalYear(dateStr: string): number {
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(5, 7))
  return month >= 9 ? year + 1 : year
}

/** 四半期の期間文字列を返す（例: "2024年9月〜2024年11月"） */
function getQuarterRange(periodKey: string): string {
  const [yStr, qStr] = periodKey.split('-')
  const snYear = parseInt(yStr)
  const q = parseInt(qStr.replace('Q', ''))
  const baseYear = snYear - 1
  switch (q) {
    case 1: return `${baseYear}年9月〜${baseYear}年11月`
    case 2: return `${baseYear}年12月〜${baseYear + 1}年2月`
    case 3: return `${baseYear + 1}年3月〜${baseYear + 1}年5月`
    case 4: return `${baseYear + 1}年6月〜${baseYear + 1}年8月`
    default: return ''
  }
}

/** 年次の期間文字列を返す（例: "2024年9月〜2025年8月"） */
function getYearRange(periodKey: string): string {
  const snYear = parseInt(periodKey.replace('sn', ''))
  return `${snYear - 1}年9月〜${snYear}年8月`
}

export default function InquiryPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('quarterly')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [detailSort, setDetailSort] = useState<'count' | 'name'>('count')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const data = await fetchAll<Deal>('deals', 'inquiry_date,deal_category,customer_andpad_id,response_category,response_category_detail,order_date')
    setDeals(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 案件種別の一覧
  const dealTypes = useMemo(() => {
    const types = new Set<string>()
    deals.forEach((d) => {
      if (d.deal_category) types.add(d.deal_category)
    })
    return Array.from(types).sort()
  }, [deals])

  // 反響区分の一覧
  const responseCategories = useMemo(() => {
    const cats = new Set<string>()
    deals.forEach((d) => {
      if (d.response_category) cats.add(d.response_category)
    })
    return Array.from(cats).sort()
  }, [deals])

  // 顧客ID×案件種別の重複排除：同一顧客・同一種別は反響日が最も早い1件のみ残す
  const deduped = useMemo(() => {
    const earliest = new Map<string, Deal>()
    let noIdSeq = 0
    for (const d of deals) {
      if (!d.inquiry_date) continue
      const custKey = d.customer_andpad_id || `_no_id_${noIdSeq++}`
      const catKey = d.deal_category || 'その他'
      const key = `${custKey}::${catKey}`
      const existing = earliest.get(key)
      if (!existing || d.inquiry_date < existing.inquiry_date!) {
        earliest.set(key, d)
      }
    }
    return Array.from(earliest.values())
  }, [deals])

  // フィルタ適用（2020sn以降 = 2019-09以降）
  const filtered = useMemo(() => {
    let result = deduped.filter((d) => d.inquiry_date && d.inquiry_date >= '2019-09')
    if (selectedType !== 'all') {
      result = result.filter((d) => d.deal_category === selectedType)
    }
    if (selectedCategory !== 'all') {
      result = result.filter((d) => d.response_category === selectedCategory)
    }
    return result
  }, [deduped, selectedType, selectedCategory])

  // 反響日ベースで集計（反響区分ごと）
  const monthlyData = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}

    filtered.forEach((d) => {
      if (!d.inquiry_date) return
      let key: string
      if (viewMode === 'monthly') {
        key = d.inquiry_date.slice(0, 7) // YYYY-MM
      } else if (viewMode === 'quarterly') {
        const { snYear, quarter } = getFiscalQuarter(d.inquiry_date)
        key = `${snYear}-Q${quarter}` // sortable key
      } else {
        const snYear = getFiscalYear(d.inquiry_date)
        key = `${snYear}sn`
      }
      const cat = d.response_category || '未分類'
      if (!counts[key]) counts[key] = {}
      counts[key][cat] = (counts[key][cat] || 0) + 1
    })

    const sorted = Object.keys(counts).sort()
    return sorted.map((key) => {
      let label: string
      if (viewMode === 'monthly') {
        label = `${key.slice(2, 4)}/${key.slice(5)}`
      } else if (viewMode === 'quarterly') {
        const [y, q] = key.split('-')
        label = `${y}sn ${q}`
      } else {
        label = key // "2025sn"
      }
      const entry: Record<string, unknown> = {
        period: key,
        label,
        total: Object.values(counts[key]).reduce((a, b) => a + b, 0),
        ...counts[key],
      }
      if (viewMode === 'quarterly') {
        const [y, q] = key.split('-')
        entry.tickLabel = q       // "Q1"
        entry.snYear = `${y}sn`   // "2025sn"
      }
      return entry
    })
  }, [filtered, viewMode])

  // 期間ごとの反響区分詳細内訳（ツールチップ用）
  const detailByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    filtered.forEach((d) => {
      if (!d.inquiry_date) return
      let key: string
      if (viewMode === 'monthly') {
        key = d.inquiry_date.slice(0, 7)
      } else if (viewMode === 'quarterly') {
        const { snYear, quarter } = getFiscalQuarter(d.inquiry_date)
        key = `${snYear}-Q${quarter}`
      } else {
        key = `${getFiscalYear(d.inquiry_date)}sn`
      }
      const detail = d.response_category_detail || '未分類'
      if (!map[key]) map[key] = {}
      map[key][detail] = (map[key][detail] || 0) + 1
    })
    return map
  }, [filtered, viewMode])

  // 契約済み顧客セット（order_date = 契約日(実績) を持つ顧客）
  const contractedCustomers = useMemo(() => {
    const set = new Set<string>()
    for (const d of deals) {
      if (d.order_date && d.customer_andpad_id) set.add(d.customer_andpad_id)
    }
    return set
  }, [deals])

  // 期間ごとの反響区分詳細別・契約数
  const contractByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    filtered.forEach((d) => {
      if (!d.inquiry_date) return
      if (!d.customer_andpad_id || !contractedCustomers.has(d.customer_andpad_id)) return
      let key: string
      if (viewMode === 'monthly') {
        key = d.inquiry_date.slice(0, 7)
      } else if (viewMode === 'quarterly') {
        const { snYear, quarter } = getFiscalQuarter(d.inquiry_date)
        key = `${snYear}-Q${quarter}`
      } else {
        key = `${getFiscalYear(d.inquiry_date)}sn`
      }
      const detail = d.response_category_detail || '未分類'
      if (!map[key]) map[key] = {}
      map[key][detail] = (map[key][detail] || 0) + 1
    })
    return map
  }, [filtered, viewMode, contractedCustomers])

  // 表用データ：期間×反響区分詳細のクロス集計
  const tableData = useMemo(() => {
    // detailByPeriod は { period: { detailName: count } }
    const periods = monthlyData.map((d) => ({ key: d.period, label: d.label, total: d.total }))
    // 全反響区分詳細を収集し、合計件数で降順ソート
    const allDetails = new Map<string, number>()
    for (const period of periods) {
      const details = detailByPeriod[period.key]
      if (!details) continue
      for (const [name, count] of Object.entries(details)) {
        allDetails.set(name, (allDetails.get(name) || 0) + count)
      }
    }
    const detailNames = Array.from(allDetails.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)

    return { periods, detailNames }
  }, [monthlyData, detailByPeriod])

  // 種別ごとの合計（円グラフ用）
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach((d) => {
      if (!d.inquiry_date) return
      const type = d.deal_category || 'その他'
      counts[type] = (counts[type] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  // 棒グラフ用の反響区分キー
  const barKeys = useMemo(() => {
    if (selectedCategory !== 'all') return [selectedCategory]
    const keys = new Set<string>()
    monthlyData.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (!['period', 'label', 'total', 'snYear', 'tickLabel'].includes(k)) keys.add(k)
      })
    })
    return Array.from(keys).sort().reverse()
  }, [monthlyData, selectedCategory])

  const totalInquiries = filtered.filter((d) => d.inquiry_date).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500">データ読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-900 flex-shrink-0">反響数集計</h1>
        <div className="flex items-center gap-3">
          {/* 案件種別フィルタ */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="all">全案件種別</option>
            {dealTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* 反響区分フィルタ */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="all">全反響区分</option>
            {responseCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* 月次/四半期/年次切替 */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {(['monthly', 'quarterly', 'yearly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {{ monthly: '月次', quarterly: '四半期', yearly: '年次' }[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">反響数（全期間）</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {totalInquiries.toLocaleString()}
            <span className="text-sm font-normal text-slate-500 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">案件種別数</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {dealTypes.length}
            <span className="text-sm font-normal text-slate-500 ml-1">種別</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">直近月の反響数</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {monthlyData.length > 0
              ? (monthlyData[monthlyData.length - 1].total).toLocaleString()
              : 0}
            <span className="text-sm font-normal text-slate-500 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">月平均</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {monthlyData.length > 0
              ? Math.round(totalInquiries / monthlyData.length).toLocaleString()
              : 0}
            <span className="text-sm font-normal text-slate-500 ml-1">件</span>
          </p>
        </div>
      </div>

      {/* 推移チャート */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          反響数推移（{{ monthly: '月次', quarterly: '四半期', yearly: '年次' }[viewMode]}）
        </h2>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={viewMode === 'quarterly' ? (props: Record<string, unknown>) => {
                    const { x, y, index } = props as { x: number; y: number; index: number }
                    const item = monthlyData[index]
                    const tickLabel = (item?.tickLabel as string) || ''
                    const snYear = item?.snYear as string | undefined
                    const isFirstOfYear = snYear && (index === 0 || monthlyData[index - 1]?.snYear !== snYear)
                    return (
                      <g transform={`translate(${x},${y})`}>
                        {isFirstOfYear && (
                          <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fontWeight={600} fill="#334155">
                            {snYear}
                          </text>
                        )}
                        <text x={0} y={0} dy={isFirstOfYear ? 24 : 14} textAnchor="middle" fontSize={10} fill="#64748b">
                          {tickLabel}
                        </text>
                      </g>
                    )
                  } : { fontSize: 13 }}
                  height={viewMode === 'quarterly' ? 40 : 30}
                />
                <YAxis tick={{ fontSize: 13 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload
                    if (!data) return null
                    const label = data.label as string
                    const period = data.period as string
                    const total = data.total as number
                    let range = ''
                    if (viewMode === 'quarterly') range = getQuarterRange(period)
                    else if (viewMode === 'yearly') range = getYearRange(period)
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                        <p className="font-semibold text-slate-900 text-sm">{label}</p>
                        {range && <p className="text-xs text-slate-500">{range}</p>}
                        <p className="text-sm text-slate-700">{total.toLocaleString()}件</p>
                      </div>
                    )
                  }}
                />
                {barKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={getCategoryColor(key)}
                    cursor="pointer"
                    onClick={(data: Record<string, unknown>) => {
                      if (data?.period) setSelectedPeriod(data.period as string)
                    }}
                  >
                    {viewMode !== 'monthly' && i === barKeys.length - 1 && (
                      <LabelList
                        dataKey="total"
                        position="top"
                        style={{ fontSize: 13, fontWeight: 600, fill: '#334155' }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-40 flex-shrink-0 text-xs space-y-0.5 pt-6 overflow-y-auto max-h-[400px]">
            {GROUP_LABELS.map(({ prefix, label }) => (
              <div key={prefix} className="flex items-center gap-1 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[prefix] }} />
                <span className="text-slate-600 truncate">{prefix} {label}</span>
              </div>
            ))}
            {barKeys.some((k) => !GROUP_COLORS[k.slice(0, 2)]) && (
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: FALLBACK_COLOR }} />
                <span className="text-slate-600 truncate">その他</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ホバー中（またはデフォルトで最新）の期間の反響区分詳細内訳 */}
      {(() => {
        const period = selectedPeriod && detailByPeriod[selectedPeriod]
          ? selectedPeriod
          : monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].period as string : null
        const details = period ? detailByPeriod[period] : null
        const periodInfo = period ? monthlyData.find((d) => d.period === period) : null
        if (!details || !periodInfo) return null
        const sorted = Object.entries(details).sort((a, b) =>
          detailSort === 'count' ? b[1] - a[1] : a[0].localeCompare(b[0], 'ja')
        )
        const total = sorted.reduce((s, [, c]) => s + c, 0)
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                {periodInfo.label} の反響区分詳細　<span className="text-blue-600">{total.toLocaleString()}件</span>
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setDetailSort('name')}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    detailSort === 'name'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  名前順
                </button>
                <button
                  onClick={() => setDetailSort('count')}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    detailSort === 'count'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  件数順
                </button>
              </div>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">反響区分詳細</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-20">件数</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-20">契約数</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-16">割合</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(([name, count]) => {
                  const contracts = contractByPeriod[period!]?.[name] || 0
                  return (
                    <tr key={name} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 border-b border-slate-100" style={{ color: getCategoryColor(name) }}>
                        {name}
                      </td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-slate-800">
                        {count.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-emerald-700">
                        {contracts > 0 ? contracts.toLocaleString() : '-'}
                      </td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right text-slate-500">
                        {total > 0 ? ((count / total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* 種別内訳 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">案件種別内訳</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {typeBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">案件種別ランキング</h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {typeBreakdown.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
                <span className="text-sm font-semibold text-slate-900">
                  {item.value.toLocaleString()}件
                </span>
                <span className="text-xs text-slate-400 w-12 text-right">
                  {totalInquiries > 0
                    ? ((item.value / totalInquiries) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
