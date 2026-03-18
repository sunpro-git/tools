import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ShoppingCart, Loader2, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, Building2, MapPin, User, ChevronDown, ChevronUp } from 'lucide-react'

const FOLD_LIMIT = 10

function DealInfoCell({ deals, hideSmall }: { deals: { name: string; staff: string; prob: string; amount: number }[]; hideSmall?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  if (deals.length === 0) return null
  const visibleDeals = hideSmall ? deals.filter((d) => d.amount > 5000000) : deals
  if (visibleDeals.length === 0) return null
  const showDeals = expanded ? visibleDeals : visibleDeals.slice(0, FOLD_LIMIT)
  const hasMore = visibleDeals.length > FOLD_LIMIT
  const cutName = (n: string, max: number) => { const s = n.replace(/\s+/g, ''); return s.slice(0, max) }
  const formatMan = (n: number) => n >= 10000 ? `${Math.round(n / 10000)}万` : n > 0 ? `${n.toLocaleString()}` : ''
  const probLabel = (p: string) => { const m = p.match(/(\d+)[%％]/); return m ? `${m[1]}%` : '' }
  return (
    <>
      {showDeals.map((d, i) => (
        <div key={i} className="flex items-baseline gap-1 leading-relaxed">
          <span className="font-medium text-slate-800">{cutName(d.name, 5)}</span>
          <span className="text-slate-400">{cutName(d.staff, 3)}</span>
          {d.prob !== '受注済' && probLabel(d.prob) && <span className="text-teal-500">{probLabel(d.prob)}</span>}
          <span className={d.prob === '受注済' ? 'text-red-600' : 'text-emerald-600'}>{formatMan(d.amount)}</span>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-500 hover:text-blue-700 text-[10px] flex items-center gap-0.5 mt-0.5 cursor-pointer"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />閉じる</> : <>+{visibleDeals.length - FOLD_LIMIT}件<ChevronDown className="w-3 h-3" /></>}
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

export default function OrdersPage() {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<OrderDeal[]>([])
  const [staffDepts, setStaffDepts] = useState<{ staff_name: string; department: string; start_date: string; end_date: string | null }[]>([])
  const [tabSet, setTabSet] = useState<Set<string>>(new Set())
  const [hideSmallDeals, setHideSmallDeals] = useState(false)
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

    // 担当者マスタ取得
    const { data: deptData } = await supabase
      .from('staff_departments')
      .select('staff_name,department,start_date,end_date')
      .order('staff_name')
      .limit(5000)
    if (deptData) setStaffDepts(deptData as typeof staffDepts)

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
    const base = [...orderedDeals, ...plannedDeals]
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
  }, [orderedDeals, plannedDeals, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, sort])

  const totalAmount = useMemo(() => {
    return filteredDeals.reduce((s, d) => s + (d.order_amount || d.estimate_amount || 0), 0)
  }, [filteredDeals])

  const orderedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.order_date != null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.order_amount || d.estimate_amount || 0), 0) }
  }, [filteredDeals])

  const plannedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.order_date == null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.order_amount || d.estimate_amount || 0), 0) }
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

  type DealInfo = { name: string; staff: string; prob: string; amount: number; ordered: boolean }
  type MonthEntry = { count: number; amount: number; deals: DealInfo[]; orderedCount: number; orderedAmount: number; plannedCount: number; plannedAmount: number }
  type MonthData = Map<string, MonthEntry>

  const buildByMonth = (getDate: (d: OrderDeal) => string | null) => {
    const nextFiscal = { from: `${fiscal.snYear}-09-01`, to: `${fiscal.snYear + 1}-08-31` }
    const currentMap: MonthData = new Map()
    const nextMap: MonthData = new Map()
    filteredDeals.forEach((d) => {
      const dt = getDate(d)
      if (!dt) return
      const ym = dt.slice(0, 7)
      const amt = d.order_amount || d.estimate_amount || 0
      const isOrdered = d.order_date != null
      const info: DealInfo = {
        name: d.customer_name || d.name,
        staff: cleanStaffName(d.staff_name),
        prob: isOrdered ? '受注済' : (d.closing_probability || '-'),
        amount: amt,
        ordered: isOrdered,
      }
      let targetMap: MonthData | null = null
      if (dt >= fiscal.from && dt <= fiscal.to) targetMap = currentMap
      else if (dt >= nextFiscal.from && dt <= nextFiscal.to) targetMap = nextMap
      if (!targetMap) return
      const entry = targetMap.get(ym) || { count: 0, amount: 0, deals: [], orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
      entry.count++
      entry.amount += amt
      if (isOrdered) { entry.orderedCount++; entry.orderedAmount += amt }
      else { entry.plannedCount++; entry.plannedAmount += amt }
      entry.deals.push(info)
      targetMap.set(ym, entry)
    })
    return { currentMap, nextMap }
  }

  // 半期ごとのテーブルデータを生成
  type HalfPeriod = { months: string[]; data: MonthData; label: string }

  const monthlyTables = useMemo(() => {
    const contractData = buildByMonth((d) => d.order_date || d.order_date_planned)
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

    return tables
  }, [filteredDeals, fiscal])

  const C1_DEPTS = ['中信1課', '中信2課', '北信3課', '東信4課', '南信5課'] as const

  // 担当者名→その日付時点の所属課を返す
  const getDeptForStaff = useCallback((staffName: string, date: string): string => {
    const clean = staffName.replace(/^\d+:\s*/, '').replace(/\s+/g, '')
    const match = staffDepts.find((sd) => {
      const sdClean = sd.staff_name.replace(/\s+/g, '')
      return sdClean === clean && (!sd.start_date || sd.start_date <= date) && (!sd.end_date || sd.end_date >= date)
    })
    return match?.department || ''
  }, [staffDepts])

  // C1: 課別×月別の受注金額テーブルデータ
  const c1Data = useMemo(() => {
    const months = buildMonths(fiscal.snYear)
    const data: Record<string, Record<string, number>> = {}
    for (const dept of C1_DEPTS) data[dept] = {}
    filteredDeals.forEach((d) => {
      const dt = d.order_date || d.order_date_planned
      if (!dt) return
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = d.staff_name || ''
      const dept = getDeptForStaff(staff, dt)
      if (!dept) return
      if (!data[dept]) data[dept] = {}
      data[dept][ym] = (data[dept][ym] || 0) + (d.order_amount || d.estimate_amount || 0)
    })
    return { months, data }
  }, [filteredDeals, fiscal, getDeptForStaff])

  const formatMan = (n: number) => n >= 10000 ? `${Math.round(n / 10000)}万` : n > 0 ? n.toLocaleString() : ''

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
                  <ShoppingCart className="w-5 h-5" />C
                </span>
                受注管理
              </h1>
              <span className="text-sm text-slate-500">{fiscal.snYear}sn（{fiscal.from.slice(0, 7).replace('-', '/')}〜{fiscal.to.slice(0, 7).replace('-', '/')}）</span>
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
            {/* 成約確度フィルタ */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">成約確度</span>
              {(['受注済', '90%', '50%', 'その他'] as const).map((prob) => {
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
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
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
          <div className="flex flex-col items-end flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="text-red-500 min-w-[4em] text-right">受注済</span>
              <span className="text-lg font-bold text-slate-900 min-w-[3ch] text-right">{orderedSummary.count}</span>
              <span className="text-slate-400">件</span>
              <span className="text-lg font-bold text-red-600 min-w-[12ch] text-right">{formatAmount(orderedSummary.amount)}</span>
            </div>
            <div className="flex items-baseline gap-1.5 text-sm mt-0.5">
              <span className="text-emerald-600 min-w-[4em] text-right">受注予定</span>
              <span className="text-lg font-bold text-slate-900 min-w-[3ch] text-right">{plannedSummary.count}</span>
              <span className="text-slate-400">件</span>
              <span className="text-lg font-bold text-emerald-600 min-w-[12ch] text-right">{formatAmount(plannedSummary.amount)}</span>
            </div>
            <div className="border-t border-slate-300 mt-1 pt-1 flex items-baseline gap-1.5 text-sm">
              <span className="text-purple-600 min-w-[4em] text-right">合計</span>
              <span className="text-lg font-bold text-slate-900 min-w-[3ch] text-right">{filteredDeals.length}</span>
              <span className="text-slate-400">件</span>
              <span className="text-lg font-bold text-purple-600 min-w-[12ch] text-right">{formatAmount(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* C1: 課別×月別の受注金額 */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">C1</span>
            月ごとの受注金額（課別）
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap w-24">課</th>
                  {c1Data.months.map((ym) => (
                    <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap">
                      {parseInt(ym.slice(5))}月
                    </th>
                  ))}
                  <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">合計</th>
                </tr>
              </thead>
              <tbody>
                {C1_DEPTS.map((dept) => {
                  const yearTotal = c1Data.months.reduce((s, ym) => s + (c1Data.data[dept]?.[ym] || 0), 0)
                  return (
                    <tr key={dept} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-800 whitespace-nowrap">{dept}</td>
                      {c1Data.months.map((ym) => {
                        const v = c1Data.data[dept]?.[ym] || 0
                        return (
                          <td key={ym} className={`px-2 py-1.5 border border-slate-200 text-right whitespace-nowrap ${v ? 'text-red-600 font-medium' : 'text-slate-300'}`}>
                            {v ? formatAmount(v) : '-'}
                          </td>
                        )
                      })}
                      <td className={`px-2 py-1.5 border border-slate-300 text-right font-bold whitespace-nowrap bg-amber-50 ${yearTotal ? 'text-red-600' : 'text-slate-300'}`}>
                        {yearTotal ? formatAmount(yearTotal) : '-'}
                      </td>
                    </tr>
                  )
                })}
                {/* 合計行 */}
                <tr className="bg-purple-50/50 font-bold">
                  <td className="px-3 py-1.5 border border-slate-300 text-purple-600">合計</td>
                  {c1Data.months.map((ym) => {
                    const total = C1_DEPTS.reduce((s, dept) => s + (c1Data.data[dept]?.[ym] || 0), 0)
                    return (
                      <td key={ym} className={`px-2 py-1.5 border border-slate-300 text-right whitespace-nowrap ${total ? 'text-purple-600' : 'text-slate-300'}`}>
                        {total ? formatAmount(total) : '-'}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 border border-slate-300 text-right text-purple-600 whitespace-nowrap bg-amber-50">
                    {formatAmount(C1_DEPTS.reduce((s, dept) => s + c1Data.months.reduce((ss, ym) => ss + (c1Data.data[dept]?.[ym] || 0), 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {staffDepts.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">※ 担当者管理にデータがありません。担当者管理ページで所属課を登録してください。</p>
          )}
        </div>
      )}

      {/* 契約・引渡し月別集計（半期ごと） */}
      {!loading && (() => {
        const pairs: [HalfPeriod, HalfPeriod][] = []
        for (let i = 0; i < monthlyTables.length; i += 2) {
          if (monthlyTables[i + 1]) pairs.push([monthlyTables[i], monthlyTables[i + 1]])
        }
        const thClass = 'px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap text-sm'
        const summaryThClass = 'px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50 text-sm'
        const colStyle = { width: '12.5%' }
        const sumStyle = { width: '12.5%' }
        return pairs.map(([h1, h2]) => {
          const h1Count = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.count || 0), 0)
          const h1Amt = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.amount || 0), 0)
          const h1OrdCnt = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.orderedCount || 0), 0)
          const h1OrdAmt = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.orderedAmount || 0), 0)
          const h1PlnCnt = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.plannedCount || 0), 0)
          const h1PlnAmt = h1.months.reduce((s, ym) => s + (h1.data.get(ym)?.plannedAmount || 0), 0)
          const h2Count = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.count || 0), 0)
          const h2Amt = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.amount || 0), 0)
          const h2OrdCnt = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.orderedCount || 0), 0)
          const h2OrdAmt = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.orderedAmount || 0), 0)
          const h2PlnCnt = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.plannedCount || 0), 0)
          const h2PlnAmt = h2.months.reduce((s, ym) => s + (h2.data.get(ym)?.plannedAmount || 0), 0)
          const yearCount = h1Count + h2Count
          const yearAmt = h1Amt + h2Amt
          if (yearCount === 0) return null
          const yearThClass = 'px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50 text-sm'
          return (
            <div key={h1.label} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">C3</span>
                月ごとの受注案件
              </h2>
              {/* 上期 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
                  <colgroup>
                    {h1.months.map((ym) => <col key={ym} style={colStyle} />)}
                    <col style={sumStyle} />
                    <col style={sumStyle} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50">
                      {h1.months.map((ym) => <th key={ym} className={thClass}>{ym.slice(0, 4)}年{parseInt(ym.slice(5))}月</th>)}
                      <th className={summaryThClass}>上期計</th>
                      <th className="px-2 py-1 border border-slate-100"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-red-50/50">
                      {h1.months.map((ym) => { const d = h1.data.get(ym); const c = d?.orderedCount || 0; const a = d?.orderedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${c ? 'text-red-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-red-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h1OrdAmt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-sm font-semibold text-red-600 whitespace-nowrap">■ 受注済</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      {h1.months.map((ym) => { const d = h1.data.get(ym); const c = d?.plannedCount || 0; const a = d?.plannedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${c ? 'text-emerald-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-emerald-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h1PlnAmt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-sm font-semibold text-emerald-600 whitespace-nowrap">■ 受注予定</td>
                    </tr>
                    <tr className="bg-purple-50/50">
                      {h1.months.map((ym) => { const d = h1.data.get(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${d ? 'text-purple-600 font-semibold' : 'text-slate-300 text-center'}`}>{d ? <span className="flex px-1"><span className="w-[3ch] text-right">{d.count}件</span><span className="flex-1 text-right">{formatAmount(d.amount)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-purple-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1Count}件</span><span className="flex-1 text-right">{formatAmount(h1Amt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-sm font-semibold text-purple-600 whitespace-nowrap">■ 合計</td>
                    </tr>
                    <tr>
                      {h1.months.map((ym) => { const d = h1.data.get(ym); return (
                        <td key={ym} className="px-1.5 py-1 border border-slate-200 text-left align-top text-slate-600 whitespace-nowrap">
                          {d ? <DealInfoCell deals={d.deals} hideSmall={hideSmallDeals} /> : ''}
                        </td>
                      ) })}
                      <td className="border border-slate-300 bg-amber-50"></td>
                      <td className="pl-4 pr-1.5 pt-3 pb-1 border border-slate-100 align-top">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
                          <input type="checkbox" checked={hideSmallDeals} onChange={(e) => setHideSmallDeals(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                          <span className="text-xs text-slate-500">500万円以下を非表示</span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5 ml-6">※集計には影響しません</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* 下期 + 年間計 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
                  <colgroup>
                    {h2.months.map((ym) => <col key={ym} style={colStyle} />)}
                    <col style={sumStyle} />
                    <col style={sumStyle} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50">
                      {h2.months.map((ym) => <th key={ym} className={thClass}>{ym.slice(0, 4)}年{parseInt(ym.slice(5))}月</th>)}
                      <th className={summaryThClass}>下期計</th>
                      <th className={yearThClass}>年間計</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-red-50/50">
                      {h2.months.map((ym) => { const d = h2.data.get(ym); const c = d?.orderedCount || 0; const a = d?.orderedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${c ? 'text-red-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-red-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h2OrdAmt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-red-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1OrdCnt + h2OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h1OrdAmt + h2OrdAmt)}</span></span></td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      {h2.months.map((ym) => { const d = h2.data.get(ym); const c = d?.plannedCount || 0; const a = d?.plannedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${c ? 'text-emerald-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-emerald-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h2PlnAmt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-emerald-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1PlnCnt + h2PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h1PlnAmt + h2PlnAmt)}</span></span></td>
                    </tr>
                    <tr className="bg-purple-50/50">
                      {h2.months.map((ym) => { const d = h2.data.get(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-sm ${d ? 'text-purple-600 font-semibold' : 'text-slate-300 text-center'}`}>{d ? <span className="flex px-1"><span className="w-[3ch] text-right">{d.count}件</span><span className="flex-1 text-right">{formatAmount(d.amount)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-purple-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2Count}件</span><span className="flex-1 text-right">{formatAmount(h2Amt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-sm font-semibold text-purple-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{yearCount}件</span><span className="flex-1 text-right">{formatAmount(yearAmt)}</span></span></td>
                    </tr>
                    <tr>
                      {h2.months.map((ym) => { const d = h2.data.get(ym); return (
                        <td key={ym} className="px-1.5 py-1 border border-slate-200 text-left align-top text-slate-600 whitespace-nowrap">
                          {d ? <DealInfoCell deals={d.deals} hideSmall={hideSmallDeals} /> : ''}
                        </td>
                      ) })}
                      <td className="border border-slate-300 bg-amber-50"></td>
                      <td className="border border-slate-300 bg-blue-50"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      })()}

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
