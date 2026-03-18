import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, Building2, MapPin, User, ChevronDown, ChevronUp } from 'lucide-react'

const FOLD_LIMIT = 10

function NameCell({ names, shortenName }: { names: string[]; shortenName: (n: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  if (names.length === 0) return null
  const showNames = expanded ? names : names.slice(0, FOLD_LIMIT)
  const hasMore = names.length > FOLD_LIMIT
  return (
    <>
      {showNames.map((n, i) => <div key={i}>{shortenName(n)}</div>)}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-500 hover:text-blue-700 text-[10px] flex items-center gap-0.5 mt-0.5 cursor-pointer"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />閉じる</> : <>+{names.length - FOLD_LIMIT}件<ChevronDown className="w-3 h-3" /></>}
        </button>
      )}
    </>
  )
}

interface OrderDeal {
  id: string
  andpad_id: string | null
  name: string
  deal_category: string | null
  customer_name: string | null
  store_name: string | null
  staff_name: string | null
  status: string | null
  order_date: string | null
  order_amount: number | null
  order_date_planned: string | null
  estimate_amount: number | null
  inquiry_date: string | null
  contract_amount_ex_tax: number | null
  handover_date_actual: string | null
  handover_date_planned: string | null
  closing_probability: string | null
}

type DealFilter = 'リフォーム' | '新築' | 'all'

function getCurrentFiscalYear(): { snYear: number; from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const snYear = m >= 9 ? y + 1 : y
  return {
    snYear,
    from: `${snYear - 1}-09-01`,
    to: `${snYear}-08-31`,
  }
}

export default function SalesPage() {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<OrderDeal[]>([])
  const [tabSet, setTabSet] = useState<Set<string>>(new Set())
  const [dealFilter, setDealFilter] = useState<DealFilter>('リフォーム')
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null)
  const [selectedStoreGroups, setSelectedStoreGroups] = useState<string[]>([])
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [selectedProbs, setSelectedProbs] = useState<string[]>([])

  const fiscal = useMemo(() => getCurrentFiscalYear(), [])

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    setLoading(true)
    const columns = 'id,andpad_id,name,deal_category,customer_name,store_name,staff_name,status,order_date,order_amount,order_date_planned,estimate_amount,inquiry_date,contract_amount_ex_tax,handover_date_actual,handover_date_planned,closing_probability'

    // 受注済: order_date が今期範囲内
    const orderedRes = await supabase.from('deals').select(columns)
      .gte('order_date', fiscal.from)
      .lte('order_date', fiscal.to)
      .order('order_date', { ascending: false })
      .limit(5000)

    // 受注予定: order_date IS NULL かつ order_date_planned が今期範囲内
    const plannedRes = await supabase.from('deals').select(columns)
      .is('order_date', null)
      .gte('order_date_planned', fiscal.from)
      .lte('order_date_planned', fiscal.to)
      .order('order_date_planned', { ascending: true })
      .limit(5000)

    const all: OrderDeal[] = []
    if (orderedRes.data) all.push(...(orderedRes.data as OrderDeal[]))
    if (plannedRes.data) all.push(...(plannedRes.data as OrderDeal[]))
    setDeals(all)
    setLoading(false)
  }

  const cleanStaffName = (s: string | null) => {
    if (!s) return '-'
    return s.replace(/^\d+:\s*/, '').replace(/\s+/g, '')
  }

  const orderedDeals = useMemo(() => deals.filter((d) => d.order_date != null), [deals])
  const plannedDeals = useMemo(() => deals.filter((d) => d.order_date == null), [deals])

  const getStoreGroup = (storeName: string | null): string => {
    if (!storeName) return 'その他'
    if (/本社|松本/.test(storeName)) return '本社/松本'
    if (/長野/.test(storeName)) return '長野'
    if (/上田/.test(storeName)) return '上田'
    if (/伊那/.test(storeName)) return '伊那'
    return 'その他'
  }

  const filteredDeals = useMemo(() => {
    // 成約確度フィルタに受注済以外が含まれていたら受注予定も表示
    const probNeedsPlanned = selectedProbs.length > 0 && selectedProbs.some((p) => p !== '受注済')
    let base: OrderDeal[] = []
    if (tabSet.size === 0 && !probNeedsPlanned) {
      base = [...orderedDeals, ...plannedDeals]
    } else if (probNeedsPlanned) {
      // 成約確度フィルタが受注予定系を含む場合は常に両方含める
      base = [...orderedDeals, ...plannedDeals]
    } else {
      if (tabSet.has('ordered')) base = base.concat(orderedDeals)
      if (tabSet.has('planned')) base = base.concat(plannedDeals)
    }
    let filtered = base
    if (dealFilter !== 'all') {
      filtered = filtered.filter((d) => d.deal_category === dealFilter)
    }
    if (selectedStoreGroups.length > 0) {
      filtered = filtered.filter((d) => selectedStoreGroups.includes(getStoreGroup(d.store_name)))
    }
    if (staffFilter !== 'all') {
      filtered = filtered.filter((d) => cleanStaffName(d.staff_name) === staffFilter)
    }
    if (selectedProbs.length > 0) {
      const probToGroup = (d: OrderDeal): string => {
        if (d.order_date) return '受注済'
        const p = d.closing_probability || ''
        if (p.includes('90')) return '90%'
        if (p.includes('50')) return '50%'
        return 'その他'
      }
      filtered = filtered.filter((d) => selectedProbs.includes(probToGroup(d)))
    }
    const probOrder: Record<string, number> = { '受注済': 0, '90%': 1, '50%': 2, '20%': 3 }
    const getProbRank = (d: OrderDeal) => {
      if (d.order_date) return 0
      return probOrder[d.closing_probability || ''] ?? 4
    }
    if (sort) {
      return [...filtered].sort((a, b) => {
        let aVal = (a as unknown as Record<string, unknown>)[sort.key]
        let bVal = (b as unknown as Record<string, unknown>)[sort.key]
        if (sort.key === 'order_amount') {
          aVal = a.order_amount || a.estimate_amount
          bVal = b.order_amount || b.estimate_amount
        }
        if (sort.key === 'closing_probability') {
          return sort.asc ? getProbRank(a) - getProbRank(b) : getProbRank(b) - getProbRank(a)
        }
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.asc ? aVal - bVal : bVal - aVal
        }
        const cmp = String(aVal).localeCompare(String(bVal), 'ja')
        return sort.asc ? cmp : -cmp
      })
    }
    // デフォルト: 担当者名→成約確度→契約日→お客様名
    return [...filtered].sort((a, b) => {
      const staffCmp = cleanStaffName(a.staff_name).localeCompare(cleanStaffName(b.staff_name), 'ja')
      if (staffCmp !== 0) return staffCmp
      const probCmp = getProbRank(a) - getProbRank(b)
      if (probCmp !== 0) return probCmp
      const aDate = a.order_date || a.order_date_planned || ''
      const bDate = b.order_date || b.order_date_planned || ''
      const dateCmp = aDate.localeCompare(bDate)
      if (dateCmp !== 0) return dateCmp
      return (a.customer_name || '').localeCompare(b.customer_name || '', 'ja')
    })
  }, [tabSet, orderedDeals, plannedDeals, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, sort])

  const totalAmount = useMemo(() => {
    return filteredDeals.reduce((s, d) => s + (d.order_amount || d.estimate_amount || 0), 0)
  }, [filteredDeals])

  // 検算: order_amount合計 + estimate_amount合計を別々に計算
  const verifyTotal = useMemo(() => {
    let orderSum = 0
    let estimateSum = 0
    let count = 0
    filteredDeals.forEach((d) => {
      if (d.order_amount) { orderSum += d.order_amount }
      else if (d.estimate_amount) { estimateSum += d.estimate_amount }
      count++
    })
    return { orderSum, estimateSum, total: orderSum + estimateSum, count }
  }, [filteredDeals])

  // 担当者ごとの小計を計算（受注済/受注予定を分けて）
  const staffSubtotals = useMemo(() => {
    const map = new Map<string, { orderedCount: number; orderedAmount: number; plannedCount: number; plannedAmount: number }>()
    filteredDeals.forEach((d) => {
      const name = cleanStaffName(d.staff_name)
      const entry = map.get(name) || { orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
      const amt = d.order_amount || d.estimate_amount || 0
      if (d.order_date) {
        entry.orderedCount++
        entry.orderedAmount += amt
      } else {
        entry.plannedCount++
        entry.plannedAmount += amt
      }
      map.set(name, entry)
    })
    return map
  }, [filteredDeals])

  const handleSort = (key: string) => {
    setSort((prev) => prev && prev.key === key ? { key, asc: !prev.asc } : { key, asc: key === 'name' || key === 'staff_name' })
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (!sort || sort.key !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
    return sort.asc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    const dt = new Date(d)
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${dt.getFullYear()}/${mm}/${dd}`
  }

  const formatAmount = (n: number | null) => {
    if (n == null) return '-'
    return `¥${n.toLocaleString()}`
  }




  const storeGroups = ['本社/松本', '長野', '上田', '伊那', 'その他'] as const

  const staffList = useMemo(() => {
    if (selectedStoreGroups.length === 0) return []
    const base = deals.filter((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return false
      return selectedStoreGroups.includes(getStoreGroup(d.store_name))
    })
    const names = new Set<string>()
    base.forEach((d) => {
      const n = cleanStaffName(d.staff_name)
      if (n !== '-') names.add(n)
    })
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [deals, selectedStoreGroups, dealFilter])

  // 9月〜8月の全月を生成
  const buildMonths = (snYear: number) => {
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      const m = ((i + 8) % 12) + 1
      const y = m >= 9 ? snYear - 1 : snYear
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
    return months
  }

  type MonthData = Map<string, { count: number; amount: number; names: string[] }>

  const buildByMonth = (getDate: (d: OrderDeal) => string | null) => {
    const nextFiscal = { from: `${fiscal.snYear}-09-01`, to: `${fiscal.snYear + 1}-08-31` }
    const currentMap: MonthData = new Map()
    const nextMap: MonthData = new Map()
    filteredDeals.forEach((d) => {
      const dt = getDate(d)
      if (!dt) return
      const ym = dt.slice(0, 7)
      const label = d.customer_name || d.name
      const amt = d.order_amount || d.estimate_amount || 0
      let targetMap: MonthData | null = null
      if (dt >= fiscal.from && dt <= fiscal.to) targetMap = currentMap
      else if (dt >= nextFiscal.from && dt <= nextFiscal.to) targetMap = nextMap
      if (!targetMap) return
      const entry = targetMap.get(ym) || { count: 0, amount: 0, names: [] }
      entry.count++
      entry.amount += amt
      entry.names.push(label)
      targetMap.set(ym, entry)
    })
    return { currentMap, nextMap }
  }

  // 半期ごとのテーブルデータを生成
  type HalfPeriod = { months: string[]; data: MonthData; label: string }

  const monthlyTables = useMemo(() => {
    const contractData = buildByMonth((d) => d.order_date || d.order_date_planned)
    const handoverData = buildByMonth((d) => d.handover_date_actual || d.handover_date_planned)
    const tables: HalfPeriod[] = []

    const addHalves = (snYear: number, data: MonthData, prefix: string) => {
      const months = buildMonths(snYear)
      const h1 = months.slice(0, 6)
      const h2 = months.slice(6, 12)
      tables.push({ months: h1, data, label: `${prefix} 上期（9〜2月）` })
      tables.push({ months: h2, data, label: `${prefix} 下期（3〜8月）` })
    }

    addHalves(fiscal.snYear, contractData.currentMap, `${fiscal.snYear}sn 今期契約`)
    addHalves(fiscal.snYear + 1, contractData.nextMap, `${fiscal.snYear + 1}sn 来期契約`)
    addHalves(fiscal.snYear, handoverData.currentMap, `${fiscal.snYear}sn 今期引渡し`)
    addHalves(fiscal.snYear + 1, handoverData.nextMap, `${fiscal.snYear + 1}sn 来期引渡し`)

    return tables
  }, [filteredDeals, fiscal])

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
                <DollarSign className="w-5 h-5" />D
              </span>
              売上管理
            </h1>
            <span className="text-sm text-slate-500">{fiscal.snYear}sn（{fiscal.from.slice(0, 7).replace('-', '/')}〜{fiscal.to.slice(0, 7).replace('-', '/')}）</span>
          </div>
          <div className="flex flex-col items-end flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="text-slate-500">件数</span>
              <span className="text-lg font-bold text-slate-900 min-w-[3ch] text-right">{filteredDeals.length}</span>
              <span className="text-slate-500 ml-3">金額合計</span>
              <span className="text-lg font-bold text-red-600 min-w-[12ch] text-right">{formatAmount(totalAmount)}</span>
            </div>
            <div className="flex items-baseline gap-1.5 text-xs text-slate-400 mt-0.5">
              <span>検算: {verifyTotal.count}件</span>
              <span>受注額{formatAmount(verifyTotal.orderSum)}</span>
              <span>+ 見積額{formatAmount(verifyTotal.estimateSum)}</span>
              <span>= {formatAmount(verifyTotal.total)}</span>
              {totalAmount !== verifyTotal.total && <span className="text-red-500 font-bold">※不一致</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          {/* 事業部フィルタ */}
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dealFilter}
                onChange={(e) => setDealFilter(e.target.value as DealFilter)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="all">全事業部</option>
                <option value="リフォーム">リフォーム</option>
                <option value="新築">新築</option>
              </select>
            </div>
            {/* 受注ステータスフィルタ */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const isChecked = tabSet.has('ordered')
                return (
                  <button
                    onClick={() => {
                      const next = new Set(tabSet)
                      if (isChecked) { next.delete('ordered') } else { next.add('ordered') }
                      setTabSet(next)
                    }}
                    className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                      isChecked ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    受注済
                  </button>
                )
              })()}
            </div>
            {/* 成約確度フィルタ */}
            <div className="flex items-center gap-1.5">
              {(['90%', '50%', 'その他'] as const).map((prob) => {
                const isChecked = selectedProbs.includes(prob)
                return (
                  <button
                    key={prob}
                    onClick={() => {
                      const next = isChecked ? selectedProbs.filter((p) => p !== prob) : [...selectedProbs, prob]
                      setSelectedProbs(next)
                    }}
                    className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                      isChecked ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                    style={{ minWidth: 40 }}
                  >
                    {prob}
                  </button>
                )
              })}
            </div>
            {/* 店舗フィルタ */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {storeGroups.map((group) => {
                const isChecked = selectedStoreGroups.includes(group)
                return (
                  <button
                    key={group}
                    onClick={() => {
                      const next = isChecked ? selectedStoreGroups.filter((s) => s !== group) : [...selectedStoreGroups, group]
                      setSelectedStoreGroups(next); setStaffFilter('all')
                    }}
                    className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                      isChecked ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                    style={{ minWidth: 52 }}
                  >
                    {group}
                  </button>
                )
              })}
            </div>
        </div>
        {/* 担当者フィルタ */}
        {staffList.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {staffList.map((name) => {
              const isActive = staffFilter === name
              return (
                <button
                  key={name}
                  onClick={() => setStaffFilter(isActive ? 'all' : name)}
                  className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 契約・引渡し月別集計（半期ごと） */}
      {!loading && monthlyTables.map((period) => {
        const totalCount = period.months.reduce((s, ym) => s + (period.data.get(ym)?.count || 0), 0)
        const totalAmt = period.months.reduce((s, ym) => s + (period.data.get(ym)?.amount || 0), 0)
        if (totalCount === 0) return null
        const shortenName = (n: string) => { const s = n.replace(/\s+/g, ''); return s.length > 6 ? s.slice(0, 6) + '...' : s }
        const thClass = 'px-2 py-1 border border-slate-200 text-center font-medium text-slate-600 whitespace-nowrap'
        const summaryThClass = 'px-2 py-1 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50'
        return (
          <div key={period.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-2">{period.label}（{totalCount}件 / {formatAmount(totalAmt)}）</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse table-fixed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="bg-slate-50">
                    {period.months.map((ym) => <th key={ym} className={thClass}>{ym.slice(0, 4)}年{parseInt(ym.slice(5))}月</th>)}
                    <th className={summaryThClass}>計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {period.months.map((ym) => { const d = period.data.get(ym); return <td key={ym} className={`px-2 py-1 border border-slate-200 text-center font-bold whitespace-nowrap ${d ? 'text-slate-900' : 'text-slate-300'}`}>{d ? `${d.count}件` : '-'}</td> })}
                    <td className="px-2 py-1 border border-slate-300 text-center font-bold text-slate-900 bg-amber-50">{totalCount}件</td>
                  </tr>
                  <tr>
                    {period.months.map((ym) => { const d = period.data.get(ym); return <td key={ym} className={`px-2 py-1 border border-slate-200 text-right whitespace-nowrap ${d ? 'text-red-600 font-medium' : 'text-slate-300'}`}>{d ? formatAmount(d.amount) : '-'}</td> })}
                    <td className="px-2 py-1 border border-slate-300 text-right font-bold text-red-600 bg-amber-50 whitespace-nowrap">{formatAmount(totalAmt)}</td>
                  </tr>
                  <tr>
                    {period.months.map((ym) => { const d = period.data.get(ym); return (
                      <td key={ym} className="px-1.5 py-1 border border-slate-200 text-left align-top text-slate-600 whitespace-nowrap">
                        {d ? <NameCell names={d.names} shortenName={shortenName} /> : ''}
                      </td>
                    ) })}
                    <td className="border border-slate-300 bg-amber-50"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-slate-500">読み込み中...</span>
          </div>
        ) : filteredDeals.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">該当する案件がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('staff_name')}>
                    <span className="inline-flex items-center gap-1">担当者<SortIcon col="staff_name" /></span>
                  </th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('customer_name')}>
                    <span className="inline-flex items-center gap-1">お客様名<SortIcon col="customer_name" /></span>
                  </th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('name')}>
                    <span className="inline-flex items-center gap-1">案件名<SortIcon col="name" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('closing_probability')}>
                    <span className="inline-flex items-center gap-1">成約確度<SortIcon col="closing_probability" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('order_date')}>
                    <span className="inline-flex items-center gap-1">契約日<SortIcon col="order_date" /></span>
                  </th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('order_amount')}>
                    <span className="inline-flex items-center justify-end gap-1">契約金額<SortIcon col="order_amount" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('handover_date_actual')}>
                    <span className="inline-flex items-center gap-1">引渡日<SortIcon col="handover_date_actual" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap w-16">ANDPAD</th>
                </tr>
                <tr className="bg-slate-200 font-semibold">
                  <td className="py-1.5 px-3 border-b border-slate-300 text-slate-700" colSpan={3}>合計 {filteredDeals.length}件</td>
                  <td className="py-1.5 px-3 border-b border-slate-300"></td>
                  <td className="py-1.5 px-3 border-b border-slate-300"></td>
                  <td className="py-1.5 px-3 border-b border-slate-300 text-right text-red-600 whitespace-nowrap">{formatAmount(totalAmount)}</td>
                  <td className="py-1.5 px-3 border-b border-slate-300"></td>
                  <td className="py-1.5 px-3 border-b border-slate-300"></td>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d, idx) => {
                  const currentStaff = cleanStaffName(d.staff_name)
                  const prevStaff = idx > 0 ? cleanStaffName(filteredDeals[idx - 1].staff_name) : null
                  const isFirstOfStaff = prevStaff !== currentStaff
                  const sub = isFirstOfStaff ? staffSubtotals.get(currentStaff) : null
                  return (
                    <React.Fragment key={d.id}>
                      {sub && (
                        <tr className="bg-amber-100 font-bold">
                          <td className="py-0.5 px-3 border-b border-amber-200 text-amber-800 whitespace-nowrap">{currentStaff} 小計</td>
                          <td className="py-0.5 px-3 border-b border-amber-200" colSpan={2}></td>
                          <td className="py-0.5 px-3 border-b border-amber-200 text-center text-amber-800 whitespace-nowrap">受注済 {sub.orderedCount}件</td>
                          <td className="py-0.5 px-3 border-b border-amber-200"></td>
                          <td className="py-0.5 px-3 border-b border-amber-200 text-right text-red-700 whitespace-nowrap">{formatAmount(sub.orderedAmount)}</td>
                          <td className="py-0.5 px-3 border-b border-amber-200" colSpan={2}></td>
                        </tr>
                      )}
                      {sub && (
                        <tr className="bg-amber-100 font-bold">
                          <td className="py-0.5 px-3 border-b-2 border-amber-300 text-amber-800 whitespace-nowrap"></td>
                          <td className="py-0.5 px-3 border-b-2 border-amber-300" colSpan={2}></td>
                          <td className="py-0.5 px-3 border-b-2 border-amber-300 text-center text-amber-800 whitespace-nowrap">受注予定 {sub.plannedCount}件</td>
                          <td className="py-0.5 px-3 border-b-2 border-amber-300"></td>
                          <td className="py-0.5 px-3 border-b-2 border-amber-300 text-right text-red-700 whitespace-nowrap">{formatAmount(sub.plannedAmount)}</td>
                          <td className="py-0.5 px-3 border-b-2 border-amber-300" colSpan={2}></td>
                        </tr>
                      )}
                      <tr className={`hover:bg-slate-100 ${idx % 2 === 1 ? 'bg-slate-100/70' : ''}`}>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-slate-700 whitespace-nowrap">{currentStaff}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-slate-700">{d.customer_name || '-'}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 font-medium text-slate-900 max-w-[250px] truncate">{d.name}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">{d.order_date ? '受注済' : (d.closing_probability || '-')}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.order_date ? <>{formatDate(d.order_date)}<span className="ml-1 text-blue-500">実</span></> : d.order_date_planned ? <>{formatDate(d.order_date_planned)}<span className="ml-1 text-orange-500">予</span></> : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-red-600 whitespace-nowrap">
                          {formatAmount(d.order_amount || d.estimate_amount)}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.handover_date_actual ? <>{formatDate(d.handover_date_actual)}<span className="ml-1 text-blue-500">実</span></> : d.handover_date_planned ? <>{formatDate(d.handover_date_planned)}<span className="ml-1 text-orange-500">予</span></> : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center">
                          {d.andpad_id ? (
                            <a
                              href={`https://andpad.jp/manager/my/orders/${d.andpad_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-500 hover:text-blue-700"
                              title="ANDPADで開く"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
