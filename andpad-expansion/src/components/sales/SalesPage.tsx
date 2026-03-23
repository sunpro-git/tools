import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { cacheGet, cacheSet } from '../../lib/cache'
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, MapPin, User, ChevronDown, ChevronUp, RefreshCw, Download } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import * as XLSX from 'xlsx'

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
          {d.prob !== '完工済' && probLabel(d.prob) && <span className="text-teal-500">{probLabel(d.prob)}</span>}
          <span className={d.prob === '完工済' ? 'text-red-600' : 'text-emerald-600'}>{formatMan(d.amount)}</span>
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

interface SalesDeal {
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
  lost_date: string | null
  response_category: string | null
  progress_amount_ex_tax: number | null
  start_date: string | null
  start_date_planned: string | null
}

type DealFilter = 'リフォーム' | '新築' | '不動産' | 'all'

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
  const { businessType, setBusinessType } = useBusinessType()
  const { snYear: globalSnYear, setSnYear: setGlobalSnYear } = useFiscalYear()
  const snYearOptions = [globalSnYear - 1, globalSnYear, globalSnYear + 1]
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<SalesDeal[]>([])
  const [prevDeals, setPrevDeals] = useState<SalesDeal[]>([])
  const [nextDeals, setNextDeals] = useState<SalesDeal[]>([])
  const [staffDepts, setStaffDepts] = useState<{ staff_name: string; department: string; start_date: string; end_date: string | null }[]>([])
  const [hideSmallDeals, setHideSmallDeals] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [targetsLoaded, setTargetsLoaded] = useState(false)
  const targetsLoading = showTargets && !targetsLoaded
  const [dealFilter, setDealFilter] = useState<DealFilter>(businessType as DealFilter)
  useEffect(() => { setDealFilter(businessType as DealFilter) }, [businessType])
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null)
  const [selectedStoreGroups, setSelectedStoreGroups] = useState<string[]>([])
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [deptByStoreStaff, setDeptByStoreStaff] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('deptByStoreStaff') || '{}') } catch { return {} }
  })

  // localStorageの変更を監視（担当者管理ページでの変更を検知）
  useEffect(() => {
    const handler = () => {
      try { setDeptByStoreStaff(JSON.parse(localStorage.getItem('deptByStoreStaff') || '{}')) } catch { /* */ }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  const [selectedProbs, setSelectedProbs] = useState<string[]>([])
  const [selectedClosingProbs, setSelectedClosingProbs] = useState<string[]>(['成約済'])
  const [includePastPlanned, setIncludePastPlanned] = useState(false)

  const [d1NextOpen, setD1NextOpen] = useState(false)
  const [d1PrevOpen, setD1PrevOpen] = useState(false)
  const [d2PrevOpen, setD2PrevOpen] = useState(false)
  const [d2NextOpen, setD2NextOpen] = useState(false)
  const [d3PrevOpen, setD3PrevOpen] = useState(false)
  const [d3NextOpen, setD3NextOpen] = useState(false)

  const [d1Detail, setD1Detail] = useState<{ dept: string; ym: string; deals: SalesDeal[] } | null>(null)

  const [stale, setStale] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fiscal = useMemo(() => getCurrentFiscalYear(), [])

  const nextFiscalPeriod = useMemo(() => ({
    snYear: fiscal.snYear + 1,
    from: `${fiscal.snYear}-09-01`,
    to: `${fiscal.snYear + 1}-08-31`,
  }), [fiscal])

  const prevFiscal = useMemo(() => ({
    snYear: fiscal.snYear - 1,
    from: `${fiscal.snYear - 2}-09-01`,
    to: `${fiscal.snYear - 1}-08-31`,
  }), [fiscal])

  // Supabaseから最新データを取得してキャッシュ更新
  const fetchLatest = useCallback(async () => {
    const columns = 'id,andpad_id,name,deal_category,customer_name,store_name,staff_name,status,order_date,order_amount,order_date_planned,estimate_amount,inquiry_date,contract_amount_ex_tax,handover_date_actual,handover_date_planned,closing_probability,lost_date,response_category,progress_amount_ex_tax,start_date,start_date_planned'

    // ページネーションで全件取得（Supabaseデフォルト1000件制限対策）
    const PAGE = 1000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchAll = async (buildQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null }>) => {
      const all: SalesDeal[] = []
      let offset = 0
      while (true) {
        const { data } = await buildQuery(offset, offset + PAGE - 1)
        if (!data || data.length === 0) break
        all.push(...(data as SalesDeal[]))
        if (data.length < PAGE) break
        offset += PAGE
      }
      return all
    }

    // 今期データ: 完工済（handover_date_actualが今期範囲内）
    const completedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('handover_date_actual', fiscal.from).lte('handover_date_actual', fiscal.to)
        .order('handover_date_actual', { ascending: false }).range(from, to)
    )

    // 今期データ: 完工予定（handover_date_actualがnullで、handover_date_plannedが今期範囲内）
    const plannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('handover_date_actual', null)
        .gte('handover_date_planned', fiscal.from).lte('handover_date_planned', fiscal.to)
        .order('handover_date_planned', { ascending: true }).range(from, to)
    )

    const excludeLost = (d: SalesDeal) => !d.lost_date
    const all: SalesDeal[] = []
    all.push(...completedData.filter(excludeLost))
    all.push(...plannedData.filter(excludeLost))

    setDeals(all)
    cacheSet('sales_deals', all)

    // 担当者マスタ
    const deptRes = await supabase.from('staff_departments')
      .select('staff_name,department,start_date,end_date')
      .order('staff_name').limit(5000)
    if (deptRes.data) {
      setStaffDepts(deptRes.data as typeof staffDepts)
      cacheSet('sales_staff_depts', deptRes.data)
    }

    // 前期データ
    // 1. 前期に完工済み（handover_date_actualが前期範囲内）
    const prevCompletedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('handover_date_actual', prevFiscal.from).lte('handover_date_actual', prevFiscal.to)
        .order('handover_date_actual', { ascending: false }).range(from, to)
    )

    // 2. 前期に完工予定だったが未完工のもの
    const prevPlannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('handover_date_actual', null)
        .gte('handover_date_planned', prevFiscal.from).lte('handover_date_planned', prevFiscal.to)
        .order('handover_date_planned', { ascending: true }).range(from, to)
    )

    // 3. 前期に完工予定だったが今期以降に完工済みになったもの
    const prevPlannedNowCompletedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gt('handover_date_actual', prevFiscal.to)
        .gte('handover_date_planned', prevFiscal.from).lte('handover_date_planned', prevFiscal.to)
        .order('handover_date_planned', { ascending: true }).range(from, to)
    )

    const prevAll: SalesDeal[] = []
    const prevSeenIds = new Set<string>()
    for (const d of prevCompletedData.filter(excludeLost)) {
      prevSeenIds.add(d.id)
      prevAll.push(d)
    }
    for (const d of prevPlannedData.filter(excludeLost)) {
      if (!prevSeenIds.has(d.id)) { prevSeenIds.add(d.id); prevAll.push(d) }
    }
    for (const d of prevPlannedNowCompletedData.filter(excludeLost)) {
      if (!prevSeenIds.has(d.id)) { prevSeenIds.add(d.id); prevAll.push(d) }
    }

    setPrevDeals(prevAll)
    cacheSet('sales_prev_deals', prevAll)

    // 来期データ（受注残＝完工予定が来期範囲内で未完工）
    const nextPlannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('handover_date_actual', null)
        .gte('handover_date_planned', nextFiscalPeriod.from).lte('handover_date_planned', nextFiscalPeriod.to)
        .order('handover_date_planned', { ascending: true }).range(from, to)
    )
    // 来期に完工済み
    const nextCompletedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('handover_date_actual', nextFiscalPeriod.from).lte('handover_date_actual', nextFiscalPeriod.to)
        .order('handover_date_actual', { ascending: false }).range(from, to)
    )
    const nextAll: SalesDeal[] = []
    const nextSeenIds = new Set<string>()
    for (const d of nextCompletedData.filter(excludeLost)) {
      nextSeenIds.add(d.id); nextAll.push(d)
    }
    for (const d of nextPlannedData.filter(excludeLost)) {
      if (!nextSeenIds.has(d.id)) { nextSeenIds.add(d.id); nextAll.push(d) }
    }
    setNextDeals(nextAll)
    cacheSet('sales_next_deals', nextAll)

    // 目標データ取得
    const targetRes = await supabase.from('targets')
      .select('department,month,amount')
      .eq('sn_year', fiscal.snYear)
      .eq('category', '完工')
      .eq('business_type', businessType)
      .limit(5000)
    if (targetRes.data) {
      const tMap: Record<string, number> = {}
      for (const t of targetRes.data as { department: string; month: string; amount: number }[]) {
        tMap[`${t.department}-${t.month}`] = t.amount
      }
      setTargets(tMap)
    }
    setTargetsLoaded(true)
  }, [fiscal, prevFiscal, nextFiscalPeriod])

  // 手動再取得
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchLatest()
    setRefreshing(false)
    setStale(false)
  }, [fetchLatest])

  // stale-while-revalidate: キャッシュから即表示→裏で最新取得
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)

      const [cachedDeals, cachedPrev, cachedNext, cachedDepts] = await Promise.all([
        cacheGet<SalesDeal[]>('sales_deals'),
        cacheGet<SalesDeal[]>('sales_prev_deals'),
        cacheGet<SalesDeal[]>('sales_next_deals'),
        cacheGet<typeof staffDepts>('sales_staff_depts'),
      ])
      if (!cancelled && cachedDeals?.data) {
        setDeals(cachedDeals.data)
        if (cachedPrev?.data) setPrevDeals(cachedPrev.data)
        if (cachedNext?.data) setNextDeals(cachedNext.data)
        if (cachedDepts?.data) setStaffDepts(cachedDepts.data)
        setLoading(false)
        setStale(true)
      }

      if (!cancelled) await fetchLatest()
      if (!cancelled) { setLoading(false); setStale(false) }
    })()
    return () => { cancelled = true }
  }, [fetchLatest])

  const cleanStaffName = (s: string | null) => {
    if (!s) return '-'
    return s.replace(/^\d+:\s*/, '').replace(/\s+/g, '')
  }

  // 今月の1日（YYYY-MM-01）
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }, [])

  const completedDeals = useMemo(() => deals.filter((d) => d.handover_date_actual != null), [deals])
  const plannedDeals = useMemo(() => {
    return deals.filter((d) => {
      if (d.handover_date_actual != null) return false
      // 前月以前の完工予定を除外（includePastPlannedがtrueなら全て表示）
      if (!includePastPlanned && d.handover_date_planned && d.handover_date_planned < currentMonth) return false
      return true
    })
  }, [deals, includePastPlanned, currentMonth])

  const getStoreGroup = (storeName: string | null): string => {
    if (!storeName) return 'その他'
    if (/本社|松本/.test(storeName)) return '本社/松本'
    if (/長野/.test(storeName)) return '長野'
    if (/上田/.test(storeName)) return '上田'
    if (/伊那/.test(storeName)) return '伊那'
    return 'その他'
  }

  const filteredDeals = useMemo(() => {
    const base = [...completedDeals, ...plannedDeals]
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
      const probToGroup = (d: SalesDeal): string => {
        if (d.handover_date_actual) return '完工済'
        return '完工予定'
      }
      filtered = filtered.filter((d) => selectedProbs.includes(probToGroup(d)))
    }
    if (selectedClosingProbs.length > 0) {
      const closingProbToGroup = (d: SalesDeal): string => {
        if (d.order_date) return '成約済'
        const p = d.closing_probability
        if (p === '90%') return '90%'
        if (p === '50%') return '50%'
        return 'その他'
      }
      filtered = filtered.filter((d) => selectedClosingProbs.includes(closingProbToGroup(d)))
    }
    const getProbRank = (d: SalesDeal) => {
      if (d.handover_date_actual) return 0
      return 1
    }
    if (sort) {
      return [...filtered].sort((a, b) => {
        let aVal = (a as unknown as Record<string, unknown>)[sort.key]
        let bVal = (b as unknown as Record<string, unknown>)[sort.key]
        if (sort.key === 'contract_amount_ex_tax') {
          aVal = a.contract_amount_ex_tax
          bVal = b.contract_amount_ex_tax
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
    // デフォルト: 担当者名→完工状態→引渡日→お客様名
    return [...filtered].sort((a, b) => {
      const staffCmp = cleanStaffName(a.staff_name).localeCompare(cleanStaffName(b.staff_name), 'ja')
      if (staffCmp !== 0) return staffCmp
      const probCmp = getProbRank(a) - getProbRank(b)
      if (probCmp !== 0) return probCmp
      const aDate = a.handover_date_actual || a.handover_date_planned || ''
      const bDate = b.handover_date_actual || b.handover_date_planned || ''
      const dateCmp = aDate.localeCompare(bDate)
      if (dateCmp !== 0) return dateCmp
      return (a.customer_name || '').localeCompare(b.customer_name || '', 'ja')
    })
  }, [completedDeals, plannedDeals, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, selectedClosingProbs, sort])

  const totalAmount = useMemo(() => {
    return filteredDeals.reduce((s, d) => s + (d.contract_amount_ex_tax || 0), 0)
  }, [filteredDeals])

  const completedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.handover_date_actual != null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.contract_amount_ex_tax || 0), 0) }
  }, [filteredDeals])

  const plannedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.handover_date_actual == null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.contract_amount_ex_tax || 0), 0) }
  }, [filteredDeals])

  // 担当者ごとの小計を計算（完工済/完工予定を分けて）
  const staffSubtotals = useMemo(() => {
    const map = new Map<string, { orderedCount: number; orderedAmount: number; plannedCount: number; plannedAmount: number }>()
    filteredDeals.forEach((d) => {
      const name = cleanStaffName(d.staff_name)
      const entry = map.get(name) || { orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
      const amt = d.contract_amount_ex_tax || 0
      if (d.handover_date_actual) {
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
    return n.toLocaleString()
  }

  const downloadXls = () => {
    const rows = filteredDeals.map((d) => ({
      '担当者': cleanStaffName(d.staff_name),
      '店舗': d.store_name || '',
      'お客様名': d.customer_name || '',
      '案件名': d.name,
      '反響きっかけ': d.response_category || '',
      '完工状態': d.handover_date_actual ? '完工済' : '完工予定',
      '引渡日': d.handover_date_actual ? formatDate(d.handover_date_actual) : d.handover_date_planned ? formatDate(d.handover_date_planned) : '',
      '引渡日区分': d.handover_date_actual ? '実績' : d.handover_date_planned ? '予定' : '',
      '売上金額': d.contract_amount_ex_tax || 0,
      '契約日': d.order_date ? formatDate(d.order_date) : d.order_date_planned ? formatDate(d.order_date_planned) : '',
      '契約日区分': d.order_date ? '実績' : d.order_date_planned ? '予定' : '',
      '契約金額': d.order_amount || d.estimate_amount || 0,
      'ANDPAD URL': d.andpad_id ? `https://andpad.jp/manager/my/orders/${d.andpad_id}` : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '完工案件一覧')
    XLSX.writeFile(wb, `完工案件一覧_${fiscal.snYear}sn.xlsx`)
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

  const buildByMonth = (sourceDeals: SalesDeal[], getDate: (d: SalesDeal) => string | null, periods: { label: string; from: string; to: string }[]) => {
    const maps: MonthData[] = periods.map(() => new Map())
    sourceDeals.forEach((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return
      const dt = getDate(d)
      if (!dt) return
      const ym = dt.slice(0, 7)
      const amt = d.contract_amount_ex_tax || 0
      const isCompleted = d.handover_date_actual != null
      const info: DealInfo = {
        name: d.customer_name || d.name,
        staff: cleanStaffName(d.staff_name),
        prob: isCompleted ? '完工済' : (d.closing_probability || '-'),
        amount: amt,
        ordered: isCompleted,
      }
      for (let i = 0; i < periods.length; i++) {
        if (dt >= periods[i].from && dt <= periods[i].to) {
          const entry = maps[i].get(ym) || { count: 0, amount: 0, deals: [], orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
          entry.count++
          entry.amount += amt
          if (isCompleted) { entry.orderedCount++; entry.orderedAmount += amt }
          else { entry.plannedCount++; entry.plannedAmount += amt }
          entry.deals.push(info)
          maps[i].set(ym, entry)
          break
        }
      }
    })
    return maps
  }

  // 半期ごとのテーブルデータを生成
  type HalfPeriod = { months: string[]; data: MonthData; label: string }

  type D3Group = { label: string; labelClass: string; isCollapsible: boolean; tables: HalfPeriod[] }

  const d3Groups = useMemo(() => {
    const allDeals = [...prevDeals, ...deals, ...nextDeals]
    const periods = [
      { label: 'prev', from: prevFiscal.from, to: prevFiscal.to },
      { label: 'current', from: fiscal.from, to: fiscal.to },
      { label: 'next', from: nextFiscalPeriod.from, to: nextFiscalPeriod.to },
    ]
    const [prevMap, currentMap, nextMap] = buildByMonth(allDeals, (d) => d.handover_date_actual || d.handover_date_planned, periods)

    const addHalves = (snYear: number, data: MonthData, prefix: string) => {
      const months = buildMonths(snYear)
      return [
        { months: months.slice(0, 6), data, label: `${prefix} 上期（9〜2月）` },
        { months: months.slice(6, 12), data, label: `${prefix} 下期（3〜8月）` },
      ]
    }

    return [
      { label: `${fiscal.snYear}sn（今期）`, labelClass: 'text-blue-700 bg-blue-50 border-blue-200', isCollapsible: false, tables: addHalves(fiscal.snYear, currentMap, `${fiscal.snYear}sn 今期引渡`) },
      { label: `${prevFiscal.snYear}sn（前期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, tables: addHalves(prevFiscal.snYear, prevMap, `${prevFiscal.snYear}sn 前期引渡`) },
      { label: `${nextFiscalPeriod.snYear}sn（来期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, tables: addHalves(nextFiscalPeriod.snYear, nextMap, `${nextFiscalPeriod.snYear}sn 来期引渡`) },
    ] as D3Group[]
  }, [prevDeals, deals, nextDeals, fiscal, prevFiscal, nextFiscalPeriod, dealFilter, selectedStoreGroups, staffFilter])

  const D1_DEPTS = ['中信1課', '中信2課', '北信3課', '東信4課', '南信5課', 'その他'] as const

  // 店舗名→地域課を判定（中信の場合は担当者マスタで1課/2課を判定）
  const getRegionDept = useCallback((storeName: string | null, staffName: string, date: string): string => {
    if (!storeName) return ''
    if (/長野/.test(storeName)) return '北信3課'
    if (/上田/.test(storeName)) return '東信4課'
    if (/伊那/.test(storeName)) return '南信5課'
    if (/本社|松本/.test(storeName)) {
      // 中信: 担当者マスタで1課/2課を判定
      const clean = staffName.replace(/^\d+:\s*/, '').replace(/\s+/g, '')
      const match = staffDepts.find((sd) => {
        const sdClean = sd.staff_name.replace(/\s+/g, '')
        return sdClean === clean && (sd.department === '中信1課' || sd.department === '中信2課')
          && (!sd.start_date || sd.start_date <= date) && (!sd.end_date || sd.end_date >= date)
      })
      return match?.department || '中信1課'
    }
    return ''
  }, [staffDepts])

  // 担当者名→その日付時点の所属課を返す
  const getDeptForStaff = useCallback((staffName: string, date: string, storeName?: string | null): string => {
    const clean = staffName.replace(/^\d+:\s*/, '').replace(/\s+/g, '')
    if (deptByStoreStaff[clean] && storeName) {
      return getRegionDept(storeName, staffName, date)
    }
    const match = staffDepts.find((sd) => {
      const sdClean = sd.staff_name.replace(/\s+/g, '')
      return sdClean === clean && (!sd.start_date || sd.start_date <= date) && (!sd.end_date || sd.end_date >= date)
    })
    return match?.department || ''
  }, [staffDepts, deptByStoreStaff, getRegionDept])

  // D1用データビルダー
  type D1Entry = { ordered: number; planned: number; total: number }
  const buildD1 = (sourceDeals: SalesDeal[], snYear: number) => {
    const months = buildMonths(snYear)
    const data: Record<string, Record<string, D1Entry>> = {}
    const details: Record<string, Record<string, SalesDeal[]>> = {}
    for (const dept of D1_DEPTS) { data[dept] = {}; details[dept] = {} }
    const filtered = sourceDeals.filter((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return false
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return false
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return false
      if (!includePastPlanned && !d.handover_date_actual && d.handover_date_planned && d.handover_date_planned < currentMonth) return false
      return true
    })
    filtered.forEach((d) => {
      // handover_date_actualが期間外の場合はhandover_date_plannedにフォールバック
      let dt = d.handover_date_actual || d.handover_date_planned
      if (!dt) return
      if (d.handover_date_actual && !months.includes(d.handover_date_actual.slice(0, 7)) && d.handover_date_planned) {
        dt = d.handover_date_planned
      }
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = d.staff_name || ''
      const dept = getDeptForStaff(staff, dt, d.store_name) || 'その他'
      if (!data[dept]) data[dept] = {}
      if (!details[dept]) details[dept] = {}
      const entry = data[dept][ym] || { ordered: 0, planned: 0, total: 0 }
      const amt = d.contract_amount_ex_tax || 0
      if (d.handover_date_actual) { entry.ordered += amt } else { entry.planned += amt }
      entry.total += amt
      data[dept][ym] = entry
      if (!details[dept][ym]) details[dept][ym] = []
      details[dept][ym].push(d)
    })
    return { months, data, details }
  }

  // D1: 課別×月別の完工金額テーブルデータ
  const d1Data = useMemo(() => buildD1(deals, fiscal.snYear), [deals, fiscal, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, includePastPlanned, currentMonth])

  // D1来期: 課別×月別の完工金額テーブルデータ（受注残）
  const d1NextData = useMemo(() => buildD1(nextDeals, nextFiscalPeriod.snYear), [nextDeals, nextFiscalPeriod, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, includePastPlanned, currentMonth])

  // D1前年: 課別×月別の完工金額テーブルデータ
  const d1PrevData = useMemo(() => buildD1(prevDeals, prevFiscal.snYear), [prevDeals, prevFiscal, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, includePastPlanned, currentMonth])

  // D2: 担当者別×月別の完工金額
  // D2用データビルダー（同じ担当者でも課が異なれば別行）
  type D2Key = string // "担当者名\t課名"
  const buildD2 = (sourceDeals: SalesDeal[], snYear: number) => {
    const months = buildMonths(snYear)
    const data: Record<D2Key, Record<string, D1Entry>> = {}
    const details: Record<D2Key, Record<string, SalesDeal[]>> = {}
    const keyDeptMap: Record<D2Key, string> = {}
    const keyStaffMap: Record<D2Key, string> = {}
    const filtered = sourceDeals.filter((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return false
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return false
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return false
      if (!includePastPlanned && !d.handover_date_actual && d.handover_date_planned && d.handover_date_planned < currentMonth) return false
      return true
    })
    filtered.forEach((d) => {
      let dt = d.handover_date_actual || d.handover_date_planned
      if (!dt) return
      if (d.handover_date_actual && !months.includes(d.handover_date_actual.slice(0, 7)) && d.handover_date_planned) {
        dt = d.handover_date_planned
      }
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = cleanStaffName(d.staff_name)
      const dept = getDeptForStaff(d.staff_name || '', dt, d.store_name) || 'その他'
      const key = `${staff}\t${dept}`
      if (!data[key]) data[key] = {}
      if (!details[key]) details[key] = {}
      keyDeptMap[key] = dept
      keyStaffMap[key] = staff
      const entry = data[key][ym] || { ordered: 0, planned: 0, total: 0 }
      const amt = d.contract_amount_ex_tax || 0
      if (d.handover_date_actual) { entry.ordered += amt } else { entry.planned += amt }
      entry.total += amt
      data[key][ym] = entry
      if (!details[key][ym]) details[key][ym] = []
      details[key][ym].push(d)
    })
    const deptOrder: Record<string, number> = {}
    D1_DEPTS.forEach((d, i) => { deptOrder[d] = i })
    const keys = Object.keys(data).sort((a, b) => {
      const deptCmp = (deptOrder[keyDeptMap[a]] ?? 99) - (deptOrder[keyDeptMap[b]] ?? 99)
      if (deptCmp !== 0) return deptCmp
      return keyStaffMap[a].localeCompare(keyStaffMap[b], 'ja')
    })
    return { months, data, details, keys, keyDeptMap, keyStaffMap }
  }

  const d2Data = useMemo(() => buildD2(deals, fiscal.snYear), [deals, fiscal, dealFilter, selectedStoreGroups, staffFilter, getDeptForStaff, includePastPlanned, currentMonth])
  const d2PrevData = useMemo(() => buildD2(prevDeals, prevFiscal.snYear), [prevDeals, prevFiscal, dealFilter, selectedStoreGroups, staffFilter, getDeptForStaff, includePastPlanned, currentMonth])
  const d2NextData = useMemo(() => buildD2(nextDeals, nextFiscalPeriod.snYear), [nextDeals, nextFiscalPeriod, dealFilter, selectedStoreGroups, staffFilter, getDeptForStaff, includePastPlanned, currentMonth])

  // 検算用: フィルター無し全量で2つの異なるロジックから比較
  const verifyListTotal = useMemo(() => {
    const months = buildMonths(fiscal.snYear)
    return deals.reduce((s, d) => {
      let dt = d.handover_date_actual || d.handover_date_planned
      if (!dt) return s
      if (d.handover_date_actual && !months.includes(d.handover_date_actual.slice(0, 7)) && d.handover_date_planned) dt = d.handover_date_planned
      if (!months.includes(dt.slice(0, 7))) return s
      return s + (d.contract_amount_ex_tax || 0)
    }, 0)
  }, [deals, fiscal])
  const verifyD1Total = useMemo(() => {
    const months = buildMonths(fiscal.snYear)
    let sum = 0
    deals.forEach((d) => {
      let dt = d.handover_date_actual || d.handover_date_planned
      if (!dt) return
      if (d.handover_date_actual && !months.includes(d.handover_date_actual.slice(0, 7)) && d.handover_date_planned) dt = d.handover_date_planned
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = d.staff_name || ''
      const dept = getDeptForStaff(staff, dt, d.store_name) || 'その他'
      if (!dept) return
      sum += d.contract_amount_ex_tax || 0
    })
    return sum
  }, [deals, fiscal, getDeptForStaff])

  // 完工済のみ選択時は予定・合計を非表示
  const onlyCompleted = selectedProbs.length === 1 && selectedProbs[0] === '完工済'

  return (
    <div className="space-y-6">
      {/* ヘッダー: 3段構成 */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* 1段目: タイトル + 期間 + 更新 */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="w-5 h-5"><path d="M512 64L512 96L640 96L640 256L512 256L512 576L448 576L448 64L512 64zM240 112L400 256L400 576L50.5 576L50.5 368L0 368L0 328L240 112zM288 320L192 320L192 416L288 416L288 320z"/></svg>D1
            </span>
            完工集計
          </h1>
          <div className="relative">
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="opacity-0 absolute inset-0 z-10 cursor-pointer"
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
            </select>
            <div className="pointer-events-none flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-100">
              <span className="text-base font-bold text-slate-700">{businessType}</span>
              <span className="text-slate-400 text-[10px] ml-1">▼</span>
            </div>
          </div>
          <div className="relative">
            <select
              value={globalSnYear}
              onChange={(e) => setGlobalSnYear(Number(e.target.value))}
              className="opacity-0 absolute inset-0 z-10 cursor-pointer"
            >
              {snYearOptions.map((y) => <option key={y} value={y}>{y}sn（{y-1}年9月 → {y}年8月）</option>)}
            </select>
            <div className="pointer-events-none flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-100">
              <span className="text-base font-bold text-slate-700">{fiscal.snYear}</span>
              <span className="text-xs text-slate-500">sn</span>
              <span className="text-xs text-slate-400 ml-1">
                <span className="text-sm font-bold text-slate-600">{fiscal.snYear - 1}</span>年9月→<span className="text-sm font-bold text-slate-600">{fiscal.snYear}</span>年8月
              </span>
              <span className="text-slate-400 text-[10px] ml-1">▼</span>
            </div>
          </div>
          {stale && <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">キャッシュ表示中…</span>}
          <button onClick={handleRefresh} disabled={refreshing} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer" title="最新データを取得">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* 2段目: フィルター（グループ間を縦線で区切り） */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 完工状態 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">完工状態</span>
              {(['完工済', '完工予定'] as const).map((prob) => {
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
            <div className="border-l border-slate-200 h-6" />
            {/* 成約確度 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">成約確度</span>
              {(['成約済', '90%', '50%', 'その他'] as const).map((prob) => {
                const isChecked = selectedClosingProbs.includes(prob)
                return (
                  <button
                    key={prob}
                    onClick={() => {
                      const next = isChecked ? selectedClosingProbs.filter((p) => p !== prob) : [...selectedClosingProbs, prob]
                      setSelectedClosingProbs(next)
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
            <div className="border-l border-slate-200 h-6" />
            {/* 前月以前 */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={includePastPlanned} onChange={(e) => setIncludePastPlanned(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
              <span className="text-xs text-slate-500">前月以前の完工予定も集計する</span>
            </label>
            <div className="border-l border-slate-200 h-6" />
            {/* 店舗 */}
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
          {/* 担当者フィルタ（2行目） */}
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
        {/* 3段目: サマリー */}
        <div className="flex items-center gap-6 px-4 py-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className="text-red-500">完工済</span>
            <span className="text-lg font-bold text-slate-900">{completedSummary.count}</span>
            <span className="text-slate-400">件</span>
            <span className="text-lg font-bold text-red-600">{formatAmount(completedSummary.amount)}</span>
          </div>
          {!onlyCompleted && <>
            <div className="border-l border-slate-200 h-6" />
            <div className="flex items-baseline gap-1.5 text-xs">
              <span className="text-emerald-600">完工予定</span>
              <span className="text-lg font-bold text-slate-900">{plannedSummary.count}</span>
              <span className="text-slate-400">件</span>
              <span className="text-lg font-bold text-emerald-600">{formatAmount(plannedSummary.amount)}</span>
            </div>
            <div className="border-l border-slate-200 h-6" />
            <div className="flex items-baseline gap-1.5 text-xs">
              <span className="text-purple-600 font-semibold">合計</span>
              <span className="text-lg font-bold text-slate-900">{filteredDeals.length}</span>
              <span className="text-slate-400">件</span>
              <span className="text-lg font-bold text-purple-600">{formatAmount(totalAmount)}</span>
            </div>
            <div className="border-l border-slate-200 h-6" />
            <div className={`flex items-baseline gap-1 text-[10px] ${verifyListTotal === verifyD1Total ? 'text-slate-400' : 'text-red-500 font-bold'}`}>
              <span>検算(全量)</span>
              <span>{formatAmount(verifyListTotal)}</span>
              <span>{verifyListTotal === verifyD1Total ? '=' : '≠'}</span>
              <span>{formatAmount(verifyD1Total)}</span>
            </div>
          </>}
        </div>
      </div>

      {/* D1: 課別×月別の完工金額 */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">D1 - <span className="text-xl">1</span></span>
              課別の完工金額
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-red-600">■ 完工済</span>
              {!onlyCompleted && <span className="font-semibold text-emerald-600">■ 完工予定</span>}
              {!onlyCompleted && <span className="font-semibold text-purple-600">■ 合計</span>}
              {showTargets && <span className="font-semibold text-white bg-gray-600 px-1.5 py-0.5 rounded">■ 目標・達成率</span>}
              <div className="border-l border-slate-200 h-6" />
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={showTargets} onChange={(e) => setShowTargets(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" />
                <span className="text-xs text-slate-500">目標を表示する</span>
                {showTargets && targetsLoading && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
              </label>
            </div>
          </div>
          {[{ tableData: d1Data, label: `${fiscal.snYear}sn（今期）`, labelClass: 'text-blue-700 bg-blue-50 border-blue-200', isCollapsible: false, isPrev: false, isNext: false, open: true, setOpen: undefined as unknown as ((v: boolean) => void) },
            { tableData: d1PrevData, label: `${prevFiscal.snYear}sn（前期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, isPrev: true, isNext: false, open: d1PrevOpen, setOpen: setD1PrevOpen },
            { tableData: d1NextData, label: `${nextFiscalPeriod.snYear}sn（来期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, isPrev: false, isNext: true, open: d1NextOpen, setOpen: setD1NextOpen }].map(({ tableData, label, labelClass, isCollapsible, isPrev, isNext, open, setOpen }) => {
            const getVal = (dept: string, ym: string, key: 'ordered' | 'planned' | 'total') => tableData.data[dept]?.[ym]?.[key] || 0
            const yearVal = (dept: string, key: 'ordered' | 'planned' | 'total') => tableData.months.reduce((s, ym) => s + getVal(dept, ym, key), 0)
            const h1Val = (dept: string, key: 'ordered' | 'planned' | 'total') => tableData.months.slice(0, 6).reduce((s, ym) => s + getVal(dept, ym, key), 0)
            const h2Val = (dept: string, key: 'ordered' | 'planned' | 'total') => tableData.months.slice(6, 12).reduce((s, ym) => s + getVal(dept, ym, key), 0)
            const allTotal = (ym: string, key: 'ordered' | 'planned' | 'total') => D1_DEPTS.reduce((s, dept) => s + getVal(dept, ym, key), 0)
            const allYearTotal = (key: 'ordered' | 'planned' | 'total') => D1_DEPTS.reduce((s, dept) => s + yearVal(dept, key), 0)
            const allH1Total = (key: 'ordered' | 'planned' | 'total') => D1_DEPTS.reduce((s, dept) => s + h1Val(dept, key), 0)
            const allH2Total = (key: 'ordered' | 'planned' | 'total') => D1_DEPTS.reduce((s, dept) => s + h2Val(dept, key), 0)
            return (
            <React.Fragment key={label}>
            {isCollapsible ? (
              <button onClick={() => setOpen(!open)} className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 flex items-center gap-1.5 cursor-pointer select-none w-fit ${labelClass}`}>
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {label}
              </button>
            ) : (
              <h3 className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 block w-fit ${labelClass}`}>{label}</h3>
            )}
            {open && <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
                <colgroup>
                  {Array.from({ length: 16 }, (_, i) => <col key={i} style={{ width: `${100 / 16}%` }} />)}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap">課</th>
                    {tableData.months.slice(0, 6).map((ym) => (
                      <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {ym.slice(0, 4)}年{parseInt(ym.slice(5))}月
                      </th>
                    ))}
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期計</th>
                    {tableData.months.slice(6, 12).map((ym) => (
                      <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {ym.slice(0, 4)}年{parseInt(ym.slice(5))}月
                      </th>
                    ))}
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50">下期計</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const showOnlyCompleted = onlyCompleted || isPrev
                    const showOnlyPlanned = isNext
                    const visibleRows = showOnlyPlanned
                      ? [{ key: 'planned' as const, color: 'text-emerald-600', bgClass: 'bg-emerald-50/50' }]
                      : showOnlyCompleted
                      ? [{ key: 'ordered' as const, color: 'text-red-600', bgClass: 'bg-red-50/50' }]
                      : [
                          { key: 'ordered' as const, color: 'text-red-600', bgClass: 'bg-red-50/50' },
                          { key: 'planned' as const, color: 'text-emerald-600', bgClass: 'bg-emerald-50/50' },
                          { key: 'total' as const, color: 'text-purple-600', bgClass: 'bg-purple-50/50' },
                        ]
                    const rowCount = visibleRows.length
                    const visibleDepts = D1_DEPTS.filter((dept) => {
                      if (dept === 'その他' || selectedStoreGroups.length > 0) {
                        return tableData.months.some((ym) => (tableData.data[dept]?.[ym]?.total || 0) > 0)
                      }
                      return true
                    })
                    const getTarget = (dept: string, ym: string) => targets[`${dept}-${ym}`] || 0
                    const targetH1 = (dept: string) => tableData.months.slice(0, 6).reduce((s, ym) => s + getTarget(dept, ym), 0)
                    const targetH2 = (dept: string) => tableData.months.slice(6, 12).reduce((s, ym) => s + getTarget(dept, ym), 0)
                    const targetYear = (dept: string) => tableData.months.reduce((s, ym) => s + getTarget(dept, ym), 0)
                    const pct = (actual: number, target: number) => target > 0 ? Math.round((actual / target) * 100) : 0
                    const showTargetRows = showTargets && !isPrev && !isNext
                    const totalRowCount = showTargetRows ? rowCount + 2 : rowCount
                    return (<>
                    {visibleDepts.map((dept, deptIdx) => (<React.Fragment key={dept}>
                      {visibleRows.map((row, ri) => (
                        <tr key={`${dept}-${row.key}`} className={`${row.bgClass} ${!showTargetRows && ri === rowCount - 1 && deptIdx < visibleDepts.length - 1 ? 'border-b-2 border-slate-300' : ''}`}>
                          {ri === 0 && (
                            <td rowSpan={totalRowCount} className="px-3 py-1 border border-slate-200 font-medium text-slate-800 whitespace-nowrap align-middle">{dept}</td>
                          )}
                          {tableData.months.slice(0, 6).map((ym) => {
                            const v = getVal(dept, ym, row.key)
                            const clickable = (tableData.details[dept]?.[ym]?.length || 0) > 0
                            return (
                              <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right whitespace-nowrap text-xs font-semibold ${v ? row.color : 'text-slate-300'} ${clickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => { if (clickable) setD1Detail({ dept, ym, deals: tableData.details[dept][ym] }) }}>
                                {v ? formatAmount(v) : '-'}
                              </td>
                            )
                          })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-blue-50 ${h1Val(dept, row.key) ? row.color : 'text-slate-300'}`}>
                            {h1Val(dept, row.key) ? formatAmount(h1Val(dept, row.key)) : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const v = getVal(dept, ym, row.key)
                            const clickable = (tableData.details[dept]?.[ym]?.length || 0) > 0
                            return (
                              <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right whitespace-nowrap text-xs font-semibold ${v ? row.color : 'text-slate-300'} ${clickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => { if (clickable) setD1Detail({ dept, ym, deals: tableData.details[dept][ym] }) }}>
                                {v ? formatAmount(v) : '-'}
                              </td>
                            )
                          })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-green-50 ${h2Val(dept, row.key) ? row.color : 'text-slate-300'}`}>
                            {h2Val(dept, row.key) ? formatAmount(h2Val(dept, row.key)) : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-amber-50 ${yearVal(dept, row.key) ? row.color : 'text-slate-300'}`}>
                            {yearVal(dept, row.key) ? formatAmount(yearVal(dept, row.key)) : '-'}
                          </td>
                        </tr>
                      ))}
                      {/* 目標行 */}
                      {showTargetRows && (
                        <tr style={{ backgroundColor: '#6b7280' }}>
                          {tableData.months.slice(0, 6).map((ym) => {
                            const t = getTarget(dept, ym)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right whitespace-nowrap text-xs font-semibold ${targetsLoading ? '' : t ? 'text-white' : 'text-slate-400'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? formatAmount(t) : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : targetH1(dept) ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetH1(dept) ? formatAmount(targetH1(dept)) : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const t = getTarget(dept, ym)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right whitespace-nowrap text-xs font-semibold ${targetsLoading ? '' : t ? 'text-white' : 'text-slate-400'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? formatAmount(t) : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : targetH2(dept) ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetH2(dept) ? formatAmount(targetH2(dept)) : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : targetYear(dept) ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetYear(dept) ? formatAmount(targetYear(dept)) : '-'}
                          </td>
                        </tr>
                      )}
                      {/* 達成率行 */}
                      {showTargetRows && (
                        <tr className={`${deptIdx < visibleDepts.length - 1 ? 'border-b-2 border-slate-300' : ''}`} style={{ backgroundColor: '#6b7280' }}>
                          {tableData.months.slice(0, 6).map((ym) => {
                            const t = getTarget(dept, ym)
                            const a = getVal(dept, ym, 'total')
                            const p = pct(a, t)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right whitespace-nowrap text-xs font-bold ${targetsLoading ? '' : !t ? 'text-slate-400' : p >= 100 ? 'text-green-300' : 'text-white'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? `${p}%` : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !targetH1(dept) ? 'text-slate-400' : pct(h1Val(dept, 'total'), targetH1(dept)) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetH1(dept) ? `${pct(h1Val(dept, 'total'), targetH1(dept))}%` : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const t = getTarget(dept, ym)
                            const a = getVal(dept, ym, 'total')
                            const p = pct(a, t)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right whitespace-nowrap text-xs font-bold ${targetsLoading ? '' : !t ? 'text-slate-400' : p >= 100 ? 'text-green-300' : 'text-white'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? `${p}%` : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !targetH2(dept) ? 'text-slate-400' : pct(h2Val(dept, 'total'), targetH2(dept)) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetH2(dept) ? `${pct(h2Val(dept, 'total'), targetH2(dept))}%` : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !targetYear(dept) ? 'text-slate-400' : pct(yearVal(dept, 'total'), targetYear(dept)) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : targetYear(dept) ? `${pct(yearVal(dept, 'total'), targetYear(dept))}%` : '-'}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>))}
                    {/* 全体合計行 */}
                    {visibleRows.map((row, ri) => {
                      const topBorder = ri === 0 ? 'border-t-2 border-t-slate-500' : ''
                      return (
                      <tr key={`total-${row.key}`} className={`${row.bgClass} font-bold`}>
                        {ri === 0 && <td rowSpan={showTargetRows ? rowCount + 2 : rowCount} className={`px-3 py-1 border border-slate-300 ${topBorder} text-slate-900 align-middle font-bold`}>全体計</td>}
                        {tableData.months.slice(0, 6).map((ym) => {
                          const v = allTotal(ym, row.key)
                          return (
                            <td key={ym} className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs ${v ? row.color : 'text-slate-300'}`}>
                              {v ? formatAmount(v) : '-'}
                            </td>
                          )
                        })}
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-blue-50 ${allH1Total(row.key) ? row.color : 'text-slate-300'}`}>
                          {allH1Total(row.key) ? formatAmount(allH1Total(row.key)) : '-'}
                        </td>
                        {tableData.months.slice(6, 12).map((ym) => {
                          const v = allTotal(ym, row.key)
                          return (
                            <td key={ym} className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs ${v ? row.color : 'text-slate-300'}`}>
                              {v ? formatAmount(v) : '-'}
                            </td>
                          )
                        })}
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-green-50 ${allH2Total(row.key) ? row.color : 'text-slate-300'}`}>
                          {allH2Total(row.key) ? formatAmount(allH2Total(row.key)) : '-'}
                        </td>
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-amber-50 ${allYearTotal(row.key) ? row.color : 'text-slate-300'}`}>
                          {allYearTotal(row.key) ? formatAmount(allYearTotal(row.key)) : '-'}
                        </td>
                      </tr>
                      )
                    })}
                    {/* 全体計 目標行 */}
                    {showTargetRows && (() => {
                      const allTarget = (ym: string) => visibleDepts.reduce((s, dept) => s + getTarget(dept, ym), 0)
                      const allTargetH1 = visibleDepts.reduce((s, dept) => s + targetH1(dept), 0)
                      const allTargetH2 = visibleDepts.reduce((s, dept) => s + targetH2(dept), 0)
                      const allTargetYear = visibleDepts.reduce((s, dept) => s + targetYear(dept), 0)
                      return (<>
                        <tr style={{ backgroundColor: '#6b7280' }}>
                          {tableData.months.slice(0, 6).map((ym) => {
                            const t = allTarget(ym)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right whitespace-nowrap text-xs font-semibold ${targetsLoading ? '' : t ? 'text-white' : 'text-slate-400'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? formatAmount(t) : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : allTargetH1 ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetH1 ? formatAmount(allTargetH1) : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const t = allTarget(ym)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right whitespace-nowrap text-xs font-semibold ${targetsLoading ? '' : t ? 'text-white' : 'text-slate-400'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? formatAmount(t) : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : allTargetH2 ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetH2 ? formatAmount(allTargetH2) : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border-l border-r border-t border-slate-500 border-b-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : allTargetYear ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetYear ? formatAmount(allTargetYear) : '-'}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#6b7280' }}>
                          {tableData.months.slice(0, 6).map((ym) => {
                            const t = allTarget(ym); const a = allTotal(ym, 'total'); const p = pct(a, t)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right whitespace-nowrap text-xs font-bold ${targetsLoading ? '' : !t ? 'text-slate-400' : p >= 100 ? 'text-green-300' : 'text-white'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? `${p}%` : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !allTargetH1 ? 'text-slate-400' : pct(allH1Total('total'), allTargetH1) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetH1 ? `${pct(allH1Total('total'), allTargetH1)}%` : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const t = allTarget(ym); const a = allTotal(ym, 'total'); const p = pct(a, t)
                            return <td key={ym} className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right whitespace-nowrap text-xs font-bold ${targetsLoading ? '' : !t ? 'text-slate-400' : p >= 100 ? 'text-green-300' : 'text-white'}`}>
                              {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : t ? `${p}%` : '-'}
                            </td>
                          })}
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !allTargetH2 ? 'text-slate-400' : pct(allH2Total('total'), allTargetH2) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetH2 ? `${pct(allH2Total('total'), allTargetH2)}%` : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border-l border-r border-b border-slate-500 border-t-0 text-right font-bold whitespace-nowrap text-xs ${targetsLoading ? '' : !allTargetYear ? 'text-slate-400' : pct(allYearTotal('total'), allTargetYear) >= 100 ? 'text-green-300' : 'text-white'}`} style={{ backgroundColor: '#4b5563' }}>
                            {targetsLoading ? <span className="inline-block w-8 h-3 bg-slate-500 rounded animate-pulse" /> : allTargetYear ? `${pct(allYearTotal('total'), allTargetYear)}%` : '-'}
                          </td>
                        </tr>
                      </>)
                    })()}
                    </>)
                  })()}
                </tbody>
              </table>
            </div>}
            </React.Fragment>
            )
          })}
          {staffDepts.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">※ 担当者管理にデータがありません。担当者管理ページで所属課を登録してください。</p>
          )}
        </div>
      )}

      {/* D2: 担当者別×月別の完工金額 */}
      {!loading && (d2Data.keys.length > 0 || d2PrevData.keys.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">D1 - <span className="text-xl">2</span></span>
              担当者別の完工金額
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-red-600">■ 完工済</span>
              {!onlyCompleted && <span className="font-semibold text-emerald-600">■ 完工予定</span>}
              {!onlyCompleted && <span className="font-semibold text-purple-600">■ 合計</span>}
            </div>
          </div>
          {[{ tableData: d2Data, label: `${fiscal.snYear}sn（今期）`, labelClass: 'text-blue-700 bg-blue-50 border-blue-200', isCollapsible: false, isPrev: false, isNext: false, open: true, setOpen: undefined as unknown as ((v: boolean) => void) },
            { tableData: d2PrevData, label: `${prevFiscal.snYear}sn（前期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, isPrev: true, isNext: false, open: d2PrevOpen, setOpen: setD2PrevOpen },
            { tableData: d2NextData, label: `${nextFiscalPeriod.snYear}sn（来期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, isPrev: false, isNext: true, open: d2NextOpen, setOpen: setD2NextOpen }].map(({ tableData, label, labelClass, isCollapsible, isPrev, isNext, open, setOpen }) => {
            if (tableData.keys.length === 0) return null
            const getVal = (k: D2Key, ym: string, key: 'ordered' | 'planned' | 'total') => tableData.data[k]?.[ym]?.[key] || 0
            const yearVal = (k: D2Key, key: 'ordered' | 'planned' | 'total') => tableData.months.reduce((s, ym) => s + getVal(k, ym, key), 0)
            const h1Val = (k: D2Key, key: 'ordered' | 'planned' | 'total') => tableData.months.slice(0, 6).reduce((s, ym) => s + getVal(k, ym, key), 0)
            const h2Val = (k: D2Key, key: 'ordered' | 'planned' | 'total') => tableData.months.slice(6, 12).reduce((s, ym) => s + getVal(k, ym, key), 0)
            const allTotal = (ym: string, key: 'ordered' | 'planned' | 'total') => tableData.keys.reduce((s, k) => s + getVal(k, ym, key), 0)
            const allYearTotal = (key: 'ordered' | 'planned' | 'total') => tableData.keys.reduce((s, k) => s + yearVal(k, key), 0)
            const allH1Total = (key: 'ordered' | 'planned' | 'total') => tableData.keys.reduce((s, k) => s + h1Val(k, key), 0)
            const allH2Total = (key: 'ordered' | 'planned' | 'total') => tableData.keys.reduce((s, k) => s + h2Val(k, key), 0)
            const showOnlyCompleted = onlyCompleted || isPrev
            const showOnlyPlanned = isNext
            const visibleRows = showOnlyPlanned
              ? [{ key: 'planned' as const, color: 'text-emerald-600', bgClass: 'bg-emerald-50/50' }]
              : showOnlyCompleted
              ? [{ key: 'ordered' as const, color: 'text-red-600', bgClass: 'bg-red-50/50' }]
              : [
                  { key: 'ordered' as const, color: 'text-red-600', bgClass: 'bg-red-50/50' },
                  { key: 'planned' as const, color: 'text-emerald-600', bgClass: 'bg-emerald-50/50' },
                  { key: 'total' as const, color: 'text-purple-600', bgClass: 'bg-purple-50/50' },
                ]
            const rowCount = visibleRows.length
            return (
            <React.Fragment key={label}>
            {isCollapsible ? (
              <button onClick={() => setOpen(!open)} className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 flex items-center gap-1.5 cursor-pointer select-none w-fit ${labelClass}`}>
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {label}
              </button>
            ) : (
              <h3 className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 block w-fit ${labelClass}`}>{label}</h3>
            )}
            {open && <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
                <colgroup>
                  {Array.from({ length: 17 }, (_, i) => <col key={i} style={{ width: `${100 / 17}%` }} />)}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap">課</th>
                    <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap">担当者</th>
                    {tableData.months.slice(0, 6).map((ym) => (
                      <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {ym.slice(0, 4)}年{parseInt(ym.slice(5))}月
                      </th>
                    ))}
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期計</th>
                    {tableData.months.slice(6, 12).map((ym) => (
                      <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {ym.slice(0, 4)}年{parseInt(ym.slice(5))}月
                      </th>
                    ))}
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50">下期計</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    return (<>
                    {tableData.keys.map((k, idx) => {
                      const dept = tableData.keyDeptMap[k] || 'その他'
                      const staff = tableData.keyStaffMap[k] || k
                      const prevDept = idx > 0 ? (tableData.keyDeptMap[tableData.keys[idx - 1]] || 'その他') : null
                      const isFirstOfDept = dept !== prevDept
                      const deptKeys = tableData.keys.filter((kk) => (tableData.keyDeptMap[kk] || 'その他') === dept)
                      const deptRowSpan = deptKeys.length * rowCount
                      return visibleRows.map((row, ri) => (
                        <tr key={`${k}-${row.key}`} className={`${row.bgClass} ${ri === rowCount - 1 ? 'border-b border-slate-300' : ''}`}>
                          {isFirstOfDept && ri === 0 && (
                            <td rowSpan={deptRowSpan} className="px-2 py-1.5 border border-slate-200 font-bold text-slate-700 whitespace-nowrap align-middle text-xs">{dept}</td>
                          )}
                          {ri === 0 && (
                            <td rowSpan={rowCount} className="px-2 py-1 border border-slate-200 font-medium text-slate-800 whitespace-nowrap align-middle">{staff}</td>
                          )}
                          {tableData.months.slice(0, 6).map((ym) => {
                            const v = getVal(k, ym, row.key)
                            const clickable = (tableData.details[k]?.[ym]?.length || 0) > 0
                            return (
                              <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right whitespace-nowrap text-xs font-semibold ${v ? row.color : 'text-slate-300'} ${clickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => { if (clickable) setD1Detail({ dept: `${dept} ${staff}`, ym, deals: tableData.details[k][ym] }) }}>
                                {v ? formatAmount(v) : '-'}
                              </td>
                            )
                          })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-blue-50 ${h1Val(k, row.key) ? row.color : 'text-slate-300'}`}>
                            {h1Val(k, row.key) ? formatAmount(h1Val(k, row.key)) : '-'}
                          </td>
                          {tableData.months.slice(6, 12).map((ym) => {
                            const v = getVal(k, ym, row.key)
                            const clickable = (tableData.details[k]?.[ym]?.length || 0) > 0
                            return (
                              <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right whitespace-nowrap text-xs font-semibold ${v ? row.color : 'text-slate-300'} ${clickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => { if (clickable) setD1Detail({ dept: `${dept} ${staff}`, ym, deals: tableData.details[k][ym] }) }}>
                                {v ? formatAmount(v) : '-'}
                              </td>
                            )
                          })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-green-50 ${h2Val(k, row.key) ? row.color : 'text-slate-300'}`}>
                            {h2Val(k, row.key) ? formatAmount(h2Val(k, row.key)) : '-'}
                          </td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold whitespace-nowrap text-xs bg-amber-50 ${yearVal(k, row.key) ? row.color : 'text-slate-300'}`}>
                            {yearVal(k, row.key) ? formatAmount(yearVal(k, row.key)) : '-'}
                          </td>
                        </tr>
                      ))
                    })}
                    {/* 全体合計行 */}
                    {visibleRows.map((row, ri) => {
                      const topBorder = ri === 0 ? 'border-t-2 border-t-slate-500' : ''
                      return (
                      <tr key={`total-${row.key}`} className={`${row.bgClass} font-bold`}>
                        {ri === 0 && <td rowSpan={rowCount} colSpan={2} className={`px-3 py-1 border border-slate-300 ${topBorder} text-slate-900 align-middle font-bold`}>全体計</td>}
                        {tableData.months.slice(0, 6).map((ym) => {
                          const v = allTotal(ym, row.key)
                          return (
                            <td key={ym} className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs ${v ? row.color : 'text-slate-300'}`}>
                              {v ? formatAmount(v) : '-'}
                            </td>
                          )
                        })}
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-blue-50 ${allH1Total(row.key) ? row.color : 'text-slate-300'}`}>
                          {allH1Total(row.key) ? formatAmount(allH1Total(row.key)) : '-'}
                        </td>
                        {tableData.months.slice(6, 12).map((ym) => {
                          const v = allTotal(ym, row.key)
                          return (
                            <td key={ym} className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs ${v ? row.color : 'text-slate-300'}`}>
                              {v ? formatAmount(v) : '-'}
                            </td>
                          )
                        })}
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-green-50 ${allH2Total(row.key) ? row.color : 'text-slate-300'}`}>
                          {allH2Total(row.key) ? formatAmount(allH2Total(row.key)) : '-'}
                        </td>
                        <td className={`px-1 py-0.5 border border-slate-300 ${topBorder} text-right whitespace-nowrap text-xs bg-amber-50 ${allYearTotal(row.key) ? row.color : 'text-slate-300'}`}>
                          {allYearTotal(row.key) ? formatAmount(allYearTotal(row.key)) : '-'}
                        </td>
                      </tr>
                      )
                    })}
                    </>)
                  })()}
                </tbody>
              </table>
            </div>}
            </React.Fragment>
            )
          })}
        </div>
      )}

      {/* 引渡し月別集計（半期ごと） */}
      {!loading && (() => {
        const d3OpenMap: Record<number, { open: boolean; setOpen: (v: boolean) => void }> = {
          0: { open: true, setOpen: () => {} },
          1: { open: d3PrevOpen, setOpen: setD3PrevOpen },
          2: { open: d3NextOpen, setOpen: setD3NextOpen },
        }
        const thClass = 'px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 whitespace-nowrap text-xs'
        const summaryThClass = 'px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50 text-xs'
        const colStyle = { width: '12.5%' }
        const sumStyle = { width: '12.5%' }
        const result = d3Groups.map((group, gi) => {
        const { open, setOpen } = d3OpenMap[gi]
        const [h1, h2] = group.tables
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
          if (yearCount === 0 && !group.isCollapsible) return null
          const yearThClass = 'px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50 text-xs'
          return (
            <React.Fragment key={group.label}>
              {gi === 0 && (
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">D1 - <span className="text-xl">3</span></span>
                  月ごとの完工案件
                </h2>
              )}
              {group.isCollapsible ? (
                <button onClick={() => setOpen(!open)} className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 flex items-center gap-1.5 cursor-pointer select-none w-fit ${group.labelClass}`}>
                  {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {group.label}
                </button>
              ) : (
                <h3 className={`text-sm font-bold border rounded px-3 py-1.5 mb-2 block w-fit ${group.labelClass}`}>{group.label}</h3>
              )}
              {!open ? null : (<>

              {/* 上期 */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
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
                      {h1.months.map((ym) => { const d = h1.data.get(ym); const c = d?.orderedCount || 0; const a = d?.orderedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${c ? 'text-red-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-red-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h1OrdAmt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-xs font-semibold text-red-600 whitespace-nowrap">■ 完工済</td>
                    </tr>
                    {!onlyCompleted && <tr className="bg-emerald-50/50">
                      {h1.months.map((ym) => { const d = h1.data.get(ym); const c = d?.plannedCount || 0; const a = d?.plannedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${c ? 'text-emerald-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-emerald-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h1PlnAmt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-xs font-semibold text-emerald-600 whitespace-nowrap">■ 完工予定</td>
                    </tr>}
                    {!onlyCompleted && <tr className="bg-purple-50/50">
                      {h1.months.map((ym) => { const d = h1.data.get(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${d ? 'text-purple-600 font-semibold' : 'text-slate-300 text-center'}`}>{d ? <span className="flex px-1"><span className="w-[3ch] text-right">{d.count}件</span><span className="flex-1 text-right">{formatAmount(d.amount)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-purple-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1Count}件</span><span className="flex-1 text-right">{formatAmount(h1Amt)}</span></span></td>
                      <td className="px-2 py-0.5 border border-slate-100 text-xs font-semibold text-purple-600 whitespace-nowrap">■ 合計</td>
                    </tr>}
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
                <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
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
                      {h2.months.map((ym) => { const d = h2.data.get(ym); const c = d?.orderedCount || 0; const a = d?.orderedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${c ? 'text-red-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-red-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h2OrdAmt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-red-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1OrdCnt + h2OrdCnt}件</span><span className="flex-1 text-right">{formatAmount(h1OrdAmt + h2OrdAmt)}</span></span></td>
                    </tr>
                    {!onlyCompleted && <tr className="bg-emerald-50/50">
                      {h2.months.map((ym) => { const d = h2.data.get(ym); const c = d?.plannedCount || 0; const a = d?.plannedAmount || 0; return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${c ? 'text-emerald-600 font-semibold' : 'text-slate-300 text-center'}`}>{c ? <span className="flex px-1"><span className="w-[3ch] text-right">{c}件</span><span className="flex-1 text-right">{formatAmount(a)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-emerald-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h2PlnAmt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-emerald-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h1PlnCnt + h2PlnCnt}件</span><span className="flex-1 text-right">{formatAmount(h1PlnAmt + h2PlnAmt)}</span></span></td>
                    </tr>}
                    {!onlyCompleted && <tr className="bg-purple-50/50">
                      {h2.months.map((ym) => { const d = h2.data.get(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 whitespace-nowrap text-xs ${d ? 'text-purple-600 font-semibold' : 'text-slate-300 text-center'}`}>{d ? <span className="flex px-1"><span className="w-[3ch] text-right">{d.count}件</span><span className="flex-1 text-right">{formatAmount(d.amount)}</span></span> : '-'}</td> })}
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-purple-600 bg-amber-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{h2Count}件</span><span className="flex-1 text-right">{formatAmount(h2Amt)}</span></span></td>
                      <td className="px-1 py-0.5 border border-slate-300 text-xs font-semibold text-purple-600 bg-purple-50 whitespace-nowrap"><span className="flex px-1"><span className="w-[5ch] text-right">{yearCount}件</span><span className="flex-1 text-right">{formatAmount(yearAmt)}</span></span></td>
                    </tr>}
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
              </>)}
            </React.Fragment>
          )
        })
      return <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">{result}</div>
      })()}

      {/* D4: 完工案件一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">D1 - <span className="text-xl">4</span></span>
            完工案件一覧
          </h2>
          {filteredDeals.length > 0 && (
            <button onClick={downloadXls} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              XLSダウンロード
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-xs text-slate-500">読み込み中...</span>
          </div>
        ) : filteredDeals.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">該当する案件がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('staff_name')}>
                    <span className="inline-flex items-center gap-1">担当者<SortIcon col="staff_name" /></span>
                  </th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('store_name')}>
                    <span className="inline-flex items-center gap-1">店舗<SortIcon col="store_name" /></span>
                  </th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('customer_name')}>
                    <span className="inline-flex items-center gap-1">お客様名<SortIcon col="customer_name" /></span>
                  </th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('name')}>
                    <span className="inline-flex items-center gap-1">案件名<SortIcon col="name" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('order_date')}>
                    <span className="inline-flex items-center gap-1">契約日<SortIcon col="order_date" /></span>
                  </th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-blue-600 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('order_amount')}>
                    <span className="inline-flex items-center justify-end gap-1">契約金額<SortIcon col="order_amount" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('start_date')}>
                    <span className="inline-flex items-center gap-1">着工日<SortIcon col="start_date" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('closing_probability')}>
                    <span className="inline-flex items-center gap-1">完工日<SortIcon col="closing_probability" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('handover_date_actual')}>
                    <span className="inline-flex items-center gap-1">引渡日<SortIcon col="handover_date_actual" /></span>
                  </th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none" onClick={() => handleSort('contract_amount_ex_tax')}>
                    <span className="inline-flex items-center justify-end gap-1">売上金額<SortIcon col="contract_amount_ex_tax" /></span>
                  </th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap w-16">ANDPAD</th>
                </tr>
                <tr className="bg-slate-300 font-semibold">
                  <td className="py-1 px-3 text-slate-700" colSpan={4}>{onlyCompleted ? '合計' : ''}</td>
                  <td className="py-1 px-3" colSpan={5}></td>
                  <td className="py-1 px-3 text-right text-red-600 whitespace-nowrap">完工済 {completedSummary.count}件 {formatAmount(completedSummary.amount)}</td>
                  <td className="py-1 px-3"></td>
                </tr>
                {!onlyCompleted && <tr className="bg-slate-300 font-semibold">
                  <td className="py-1 px-3 text-slate-700" colSpan={4}>合計</td>
                  <td className="py-1 px-3" colSpan={5}></td>
                  <td className="py-1 px-3 text-right text-emerald-600 whitespace-nowrap">完工予定 {plannedSummary.count}件 {formatAmount(plannedSummary.amount)}</td>
                  <td className="py-1 px-3"></td>
                </tr>}
                {!onlyCompleted && <tr className="bg-slate-300 font-semibold">
                  <td className="py-1 px-3 border-b-2 border-slate-400" colSpan={4}></td>
                  <td className="py-1 px-3 border-b-2 border-slate-400" colSpan={5}></td>
                  <td className="py-1 px-3 border-b-2 border-slate-400 text-right text-purple-600 whitespace-nowrap">合計 {filteredDeals.length}件 {formatAmount(totalAmount)}</td>
                  <td className="py-1 px-3 border-b-2 border-slate-400"></td>
                </tr>}
              </thead>
              <tbody>
                {filteredDeals.map((d, idx) => {
                  const currentStaff = cleanStaffName(d.staff_name)
                  const prevStaff = idx > 0 ? cleanStaffName(filteredDeals[idx - 1].staff_name) : null
                  const isFirstOfStaff = prevStaff !== currentStaff
                  const showSubtotal = !sort || sort.key === 'staff_name'
                  const sub = isFirstOfStaff && showSubtotal ? staffSubtotals.get(currentStaff) : null
                  return (
                    <React.Fragment key={d.id}>
                      {sub && (
                        <tr className="bg-slate-200 font-bold">
                          <td className="py-0.5 px-3 text-slate-700 whitespace-nowrap" colSpan={4}>{onlyCompleted ? `${currentStaff} 小計` : ''}</td>
                          <td className="py-0.5 px-3" colSpan={5}></td>
                          <td className="py-0.5 px-3 text-right text-red-600 whitespace-nowrap">完工済 {sub.orderedCount}件 {formatAmount(sub.orderedAmount)}</td>
                          <td className="py-0.5 px-3"></td>
                        </tr>
                      )}
                      {sub && !onlyCompleted && (
                        <tr className="bg-slate-200 font-bold">
                          <td className="py-0.5 px-3 text-slate-700 whitespace-nowrap" colSpan={4}>{currentStaff} 小計</td>
                          <td className="py-0.5 px-3" colSpan={5}></td>
                          <td className="py-0.5 px-3 text-right text-emerald-600 whitespace-nowrap">完工予定 {sub.plannedCount}件 {formatAmount(sub.plannedAmount)}</td>
                          <td className="py-0.5 px-3"></td>
                        </tr>
                      )}
                      {sub && !onlyCompleted && (
                        <tr className="bg-slate-200 font-bold">
                          <td className="py-0.5 px-3 border-b-2 border-slate-400 whitespace-nowrap" colSpan={4}></td>
                          <td className="py-0.5 px-3 border-b-2 border-slate-400" colSpan={5}></td>
                          <td className="py-0.5 px-3 border-b-2 border-slate-400 text-right text-purple-600 whitespace-nowrap">合計 {sub.orderedCount + sub.plannedCount}件 {formatAmount(sub.orderedAmount + sub.plannedAmount)}</td>
                          <td className="py-0.5 px-3 border-b-2 border-slate-400"></td>
                        </tr>
                      )}
                      <tr className={`hover:bg-slate-100 ${idx % 2 === 1 ? 'bg-slate-100/70' : ''}`}>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-slate-700 whitespace-nowrap">{currentStaff}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-slate-500 whitespace-nowrap">{d.store_name || '-'}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-slate-700">{d.customer_name || '-'}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 font-medium text-slate-900 max-w-[250px] truncate">{d.name}</td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.order_date ? <>{formatDate(d.order_date)}<span className="ml-1 text-blue-500">実</span></> : d.order_date_planned ? <>{formatDate(d.order_date_planned)}<span className="ml-1 text-orange-500">予</span></> : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-blue-600 whitespace-nowrap">
                          {d.order_amount || d.estimate_amount ? formatAmount(d.order_amount || d.estimate_amount) : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.start_date ? <>{formatDate(d.start_date)}<span className="ml-1 text-blue-500">実</span></> : d.start_date_planned ? <>{formatDate(d.start_date_planned)}<span className="ml-1 text-orange-500">予</span></> : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.handover_date_actual
                            ? <>{formatDate(d.handover_date_planned || d.handover_date_actual)}<span className="ml-1 text-blue-500">実</span></>
                            : d.handover_date_planned ? <>{formatDate(d.handover_date_planned)}<span className="ml-1 text-orange-500">予</span></> : '-'}
                        </td>
                        <td className="py-1.5 px-3 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                          {d.handover_date_actual ? <>{formatDate(d.handover_date_actual)}<span className="ml-1 text-blue-500">実</span></> : '-'}
                        </td>
                        <td className={`py-1.5 px-3 border-b border-slate-100 text-right font-medium whitespace-nowrap ${d.handover_date_actual ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatAmount(d.contract_amount_ex_tax)}
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

      {/* E1詳細モーダル */}
      {d1Detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setD1Detail(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[90vw] w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {d1Detail.dept} — {d1Detail.ym.slice(0, 4)}年{parseInt(d1Detail.ym.slice(5))}月（{d1Detail.deals.length}件）
              </h3>
              <button onClick={() => setD1Detail(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer px-2">×</button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">担当者</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">店舗</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">反響</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">お客様名</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700">案件名</th>
                    <th className="text-center py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">引渡日</th>
                    <th className="text-right py-1 px-2 border-b border-slate-200 font-semibold text-red-600 whitespace-nowrap">売上金額</th>
                    <th className="text-center py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">契約日</th>
                    <th className="text-right py-1 px-2 border-b border-slate-200 font-semibold text-blue-600 whitespace-nowrap">契約金額</th>
                    <th className="text-center py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">ANDPAD</th>
                  </tr>
                  <tr className="bg-slate-200 font-bold">
                    <td className="py-1 px-2 border-b border-slate-300 text-slate-700" colSpan={6}>合計 {d1Detail.deals.length}件</td>
                    <td className="py-1 px-2 border-b border-slate-300 text-right text-red-600 whitespace-nowrap">{formatAmount(d1Detail.deals.reduce((s, d) => s + (d.contract_amount_ex_tax || 0), 0))}</td>
                    <td className="py-1 px-2 border-b border-slate-300"></td>
                    <td className="py-1 px-2 border-b border-slate-300 text-right text-blue-600 whitespace-nowrap">{formatAmount(d1Detail.deals.reduce((s, d) => s + (d.order_amount || d.estimate_amount || 0), 0))}</td>
                    <td className="py-1 px-2 border-b border-slate-300"></td>
                  </tr>
                </thead>
                <tbody>
                  {d1Detail.deals.map((d, i) => (
                    <tr key={d.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-700 whitespace-nowrap">{cleanStaffName(d.staff_name)}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-500 whitespace-nowrap">{d.store_name || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{d.response_category || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-700 whitespace-nowrap">{d.customer_name || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 font-medium text-slate-900 max-w-[180px] truncate">{d.name}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                        {d.handover_date_actual ? <>{formatDate(d.handover_date_actual)}<span className="ml-0.5 text-blue-500">実</span></> : d.handover_date_planned ? <>{formatDate(d.handover_date_planned)}<span className="ml-0.5 text-orange-500">予</span></> : '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-slate-100 text-right font-semibold text-red-600 whitespace-nowrap">{formatAmount(d.contract_amount_ex_tax)}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-center text-slate-600 whitespace-nowrap">
                        {d.order_date ? <>{formatDate(d.order_date)}<span className="ml-0.5 text-blue-500">実</span></> : d.order_date_planned ? <>{formatDate(d.order_date_planned)}<span className="ml-0.5 text-orange-500">予</span></> : '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-slate-100 text-right font-semibold text-blue-600 whitespace-nowrap">{d.order_amount || d.estimate_amount ? formatAmount(d.order_amount || d.estimate_amount) : '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-center">
                        {d.andpad_id ? <a href={`https://andpad.jp/manager/my/orders/${d.andpad_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink className="w-3 h-3" /></a> : <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
