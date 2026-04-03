import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { cacheGet, cacheSet } from '../../lib/cache'
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, MapPin, User, UserSearch, ChevronDown, ChevronUp, RefreshCw, Download, ClipboardCopy, Check } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES, useDepartments } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import * as XLSX from 'xlsx'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'

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
  estimate_amount_ex_tax: number | null
  handover_date_actual: string | null
  handover_date_planned: string | null
  closing_probability: string | null
  lost_date: string | null
  response_category: string | null
  progress_amount_ex_tax: number | null
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

export default function FollowUpPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const { snYear: globalSnYear, setSnYear: setGlobalSnYear } = useFiscalYear()
  const snYearOptions = [globalSnYear - 1, globalSnYear, globalSnYear + 1]
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<OrderDeal[]>([])
  const [prevDeals, setPrevDeals] = useState<OrderDeal[]>([])
  const [nextDeals, setNextDeals] = useState<OrderDeal[]>([])
  const [staffDepts, setStaffDepts] = useState<{ staff_name: string; department: string; start_date: string; end_date: string | null }[]>([])
  const [hideSmallDeals, setHideSmallDeals] = useState(false)
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
  const [selectedProbs, setSelectedProbs] = useState<string[]>(['受注済', '90%', '50%'])
  const [includePastPlanned, setIncludePastPlanned] = useState(false)

  const [targets, setTargets] = useState<Record<string, number>>({})
  const [targetsLoaded, setTargetsLoaded] = useState(false)
  const [showTargets, setShowTargets] = useState(false)
  const targetsLoading = showTargets && !targetsLoaded
  const [c1PrevOpen, setC1PrevOpen] = useState(false)
  const [c1NextOpen, setC1NextOpen] = useState(false)
  const [c2PrevOpen, setC2PrevOpen] = useState(false)
  const [c2NextOpen, setC2NextOpen] = useState(false)
  const [c3PrevOpen, setC3PrevOpen] = useState(false)
  const [c3NextOpen, setC3NextOpen] = useState(false)

  // B1-1: 担当者別商談数
  type VisitRow = { staff1: string | null; visit_date: string; has_appointment: string | null; customer_type: string | null; model_house_type: string | null; customer_name: string | null; appointment_content: string | null }
  const [visitData, setVisitData] = useState<VisitRow[]>([])
  useEffect(() => {
    const fiscal = { from: `${globalSnYear - 1}-09-01`, to: `${globalSnYear}-08-31` }
    supabase.from('model_house_visits')
      .select('staff1,visit_date,has_appointment,customer_type,model_house_type,customer_name,appointment_content')
      .eq('business_type', businessType)
      .gte('visit_date', fiscal.from).lte('visit_date', fiscal.to)
      .limit(5000)
      .then(({ data }) => { if (data) setVisitData(data) })
  }, [businessType, globalSnYear])

  const b1Data = useMemo(() => {
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      const m = ((8 + i) % 12) + 1
      const y = m >= 9 ? globalSnYear - 1 : globalSnYear
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
    const staffMap = new Map<string, Record<string, { visits: number; appos: number }>>()
    const staffDetailMap = new Map<string, Record<string, VisitRow[]>>()
    for (const v of visitData) {
      const staff = v.staff1?.trim() || '未設定'
      const ym = v.visit_date?.slice(0, 7)
      if (!ym || !months.includes(ym)) continue
      if (!staffMap.has(staff)) staffMap.set(staff, {})
      const row = staffMap.get(staff)!
      if (!row[ym]) row[ym] = { visits: 0, appos: 0 }
      row[ym].visits++
      if (v.has_appointment === '有') row[ym].appos++
      if (!staffDetailMap.has(staff)) staffDetailMap.set(staff, {})
      const detail = staffDetailMap.get(staff)!
      if (!detail[ym]) detail[ym] = []
      detail[ym].push(v)
    }
    // 担当者→部門マッピング
    const staffDeptMap = new Map<string, string>()
    for (const sd of staffDepts) {
      const clean = sd.staff_name.replace(/\s+/g, '')
      if (!staffDeptMap.has(clean)) staffDeptMap.set(clean, sd.department)
    }
    const getDept = (name: string) => staffDeptMap.get(name.replace(/\s+/g, '')) || 'その他'
    const staffList = [...staffMap.keys()].sort((a, b) => {
      const da = getDept(a), db = getDept(b)
      if (da !== db) return da.localeCompare(db, 'ja')
      return a.localeCompare(b, 'ja')
    })
    return { months, staffMap, staffDetailMap, staffList, getDept }
  }, [visitData, globalSnYear])

  // B1部門フィルター（事業部に紐づく部門のみ表示）
  const { deptNames: businessDeptNames } = useDepartments(businessType as '新築' | 'リフォーム' | '不動産')
  const b1Depts = useMemo(() => {
    const depts = [...businessDeptNames]
    depts.push('その他')
    return depts
  }, [businessDeptNames])
  const [selectedB1Depts, setSelectedB1Depts] = useState<string[]>([])
  // 初期状態：「その他」以外を選択。事業部変更時にリセット
  useEffect(() => {
    setSelectedB1Depts(b1Depts.filter(d => d !== 'その他'))
  }, [b1Depts])

  const [b1Detail, setB1Detail] = useState<{ title: string; visits: VisitRow[] } | null>(null)
  const [selectedB1_3Staff, setSelectedB1_3Staff] = useState<string>('')

  const [c1Detail, setC1Detail] = useState<{ dept: string; ym: string; deals: OrderDeal[] } | null>(null)
  const [c1DetailCopied, setC1DetailCopied] = useState(false)

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

  // 契約情報で案件を分割する
  type ContractRow = { andpad_id: string; contract_date: string | null; sales_amount_tax_excluded: number | null; is_main_contract: boolean; contract_name: string | null }

  const splitDealsByContracts = (deals: OrderDeal[], contracts: ContractRow[]): OrderDeal[] => {
    // andpad_id（=システムID）でグループ化
    const contractsByDealId = new Map<string, ContractRow[]>()
    for (const c of contracts) {
      if (!c.andpad_id) continue
      const list = contractsByDealId.get(c.andpad_id) || []
      list.push(c)
      contractsByDealId.set(c.andpad_id, list)
    }

    const result: OrderDeal[] = []
    for (const deal of deals) {
      const dealContracts = deal.andpad_id ? contractsByDealId.get(deal.andpad_id) : null
      if (!dealContracts || dealContracts.length === 0) {
        // 契約情報なし → そのまま
        result.push(deal)
        continue
      }
      // 契約あり → 各契約ごとにOrderDealを生成
      for (const c of dealContracts) {
        result.push({
          ...deal,
          order_date: c.contract_date || deal.order_date,
          order_amount: c.sales_amount_tax_excluded ?? deal.order_amount,
          contract_amount_ex_tax: c.sales_amount_tax_excluded ?? deal.contract_amount_ex_tax,
          name: c.is_main_contract ? deal.name : `${deal.name}（${c.contract_name || '追加'}）`,
        })
      }
    }
    return result
  }

  // Supabaseから最新データを取得してキャッシュ更新
  const fetchLatest = useCallback(async () => {
    const columns = 'id,andpad_id,name,deal_category,customer_name,store_name,staff_name,status,order_date,order_amount,order_date_planned,estimate_amount,inquiry_date,contract_amount_ex_tax,estimate_amount_ex_tax,handover_date_actual,handover_date_planned,closing_probability,lost_date,response_category,progress_amount_ex_tax'

    // ページネーションで全件取得（Supabaseデフォルト1000件制限対策）
    const PAGE = 1000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchAll = async (buildQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null }>) => {
      const all: OrderDeal[] = []
      let offset = 0
      while (true) {
        const { data } = await buildQuery(offset, offset + PAGE - 1)
        if (!data || data.length === 0) break
        all.push(...(data as OrderDeal[]))
        if (data.length < PAGE) break
        offset += PAGE
      }
      return all
    }

    // 今期データ（順次実行で接続プール枯渇を防ぐ）
    const orderedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('order_date', fiscal.from).lte('order_date', fiscal.to)
        .order('order_date', { ascending: false }).range(from, to)
    )

    const plannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('order_date', null)
        .gte('order_date_planned', fiscal.from).lte('order_date_planned', fiscal.to)
        .order('order_date_planned', { ascending: true }).range(from, to)
    )

    const excludeLost = (d: OrderDeal) => !d.lost_date
    const allRaw: OrderDeal[] = []
    allRaw.push(...orderedData.filter(excludeLost))
    allRaw.push(...plannedData.filter(excludeLost))

    // 契約テーブルから期間内の契約を取得（契約日ベース）
    const contractSelect = 'andpad_id,contract_date,sales_amount_tax_excluded,is_main_contract,contract_name'
    let allContracts: ContractRow[] = []
    {
      let offset = 0
      while (true) {
        const { data } = await supabase.from('contracts').select(contractSelect)
          .gte('contract_date', fiscal.from).lte('contract_date', fiscal.to)
          .range(offset, offset + 999)
        if (!data || data.length === 0) break
        allContracts.push(...data)
        if (data.length < 1000) break
        offset += 1000
      }
    }

    // 契約の親案件が未取得なら追加フェッチ
    const existingIds = new Set(allRaw.map(d => d.andpad_id).filter(Boolean))
    const missingIds = [...new Set(allContracts.map(c => c.andpad_id))].filter(id => !existingIds.has(id))
    if (missingIds.length > 0) {
      for (let i = 0; i < missingIds.length; i += 200) {
        const chunk = missingIds.slice(i, i + 200)
        const { data } = await supabase.from('deals').select(columns).in('andpad_id', chunk)
        if (data) allRaw.push(...(data as OrderDeal[]).filter(excludeLost))
      }
    }

    const all = splitDealsByContracts(allRaw, allContracts)
    setDeals(all)
    cacheSet('followup_deals', all)

    // 担当者マスタ
    const deptRes = await supabase.from('staff_departments')
      .select('staff_name,department,start_date,end_date')
      .order('staff_name').limit(5000)
    if (deptRes.data) {
      setStaffDepts(deptRes.data as typeof staffDepts)
      cacheSet('followup_staff_depts', deptRes.data)
    }

    // 前期データ
    // 1. 前期に契約済み（order_dateが前期範囲内）
    const prevOrderedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('order_date', prevFiscal.from).lte('order_date', prevFiscal.to)
        .order('order_date', { ascending: false }).range(from, to)
    )

    // 2. 前期に契約予定だったが未契約のもの
    const prevPlannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('order_date', null)
        .gte('order_date_planned', prevFiscal.from).lte('order_date_planned', prevFiscal.to)
        .order('order_date_planned', { ascending: true }).range(from, to)
    )

    // 3. 前期に契約予定だったが今期以降に契約済みになったもの
    const prevPlannedNowOrderedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gt('order_date', prevFiscal.to)
        .gte('order_date_planned', prevFiscal.from).lte('order_date_planned', prevFiscal.to)
        .order('order_date_planned', { ascending: true }).range(from, to)
    )

    const prevAllRaw: OrderDeal[] = []
    const prevSeenIds = new Set<string>()
    for (const d of prevOrderedData.filter(excludeLost)) {
      prevSeenIds.add(d.id)
      prevAllRaw.push(d)
    }
    for (const d of prevPlannedData.filter(excludeLost)) {
      if (!prevSeenIds.has(d.id)) { prevSeenIds.add(d.id); prevAllRaw.push(d) }
    }
    for (const d of prevPlannedNowOrderedData.filter(excludeLost)) {
      if (!prevSeenIds.has(d.id)) { prevSeenIds.add(d.id); prevAllRaw.push(d) }
    }

    // 前期も契約日ベースで取得
    let prevContracts: ContractRow[] = []
    {
      let offset = 0
      while (true) {
        const { data } = await supabase.from('contracts').select(contractSelect)
          .gte('contract_date', prevFiscal.from).lte('contract_date', prevFiscal.to)
          .range(offset, offset + 999)
        if (!data || data.length === 0) break
        prevContracts.push(...data)
        if (data.length < 1000) break
        offset += 1000
      }
    }
    const prevExistingIds = new Set(prevAllRaw.map(d => d.andpad_id).filter(Boolean))
    const prevMissingIds = [...new Set(prevContracts.map(c => c.andpad_id))].filter(id => !prevExistingIds.has(id))
    if (prevMissingIds.length > 0) {
      for (let i = 0; i < prevMissingIds.length; i += 200) {
        const chunk = prevMissingIds.slice(i, i + 200)
        const { data } = await supabase.from('deals').select(columns).in('andpad_id', chunk)
        if (data) prevAllRaw.push(...(data as OrderDeal[]).filter(excludeLost))
      }
    }

    const prevAll = splitDealsByContracts(prevAllRaw, prevContracts)
    setPrevDeals(prevAll)
    cacheSet('followup_prev_deals', prevAll)

    // 来期データ
    const nextOrderedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .gte('order_date', nextFiscalPeriod.from).lte('order_date', nextFiscalPeriod.to)
        .order('order_date', { ascending: false }).range(from, to)
    )
    const nextPlannedData = await fetchAll((from, to) =>
      supabase.from('deals').select(columns)
        .is('order_date', null)
        .gte('order_date_planned', nextFiscalPeriod.from).lte('order_date_planned', nextFiscalPeriod.to)
        .order('order_date_planned', { ascending: true }).range(from, to)
    )
    const nextAllRaw: OrderDeal[] = []
    const nextSeenIds = new Set<string>()
    for (const d of nextOrderedData.filter(excludeLost)) { nextSeenIds.add(d.id); nextAllRaw.push(d) }
    for (const d of nextPlannedData.filter(excludeLost)) { if (!nextSeenIds.has(d.id)) { nextSeenIds.add(d.id); nextAllRaw.push(d) } }
    // 来期も契約日ベースで取得
    let nextContracts: ContractRow[] = []
    {
      let offset = 0
      while (true) {
        const { data } = await supabase.from('contracts').select(contractSelect)
          .gte('contract_date', nextFiscalPeriod.from).lte('contract_date', nextFiscalPeriod.to)
          .range(offset, offset + 999)
        if (!data || data.length === 0) break
        nextContracts.push(...data)
        if (data.length < 1000) break
        offset += 1000
      }
    }
    const nextExistingIds = new Set(nextAllRaw.map(d => d.andpad_id).filter(Boolean))
    const nextMissingIds = [...new Set(nextContracts.map(c => c.andpad_id))].filter(id => !nextExistingIds.has(id))
    if (nextMissingIds.length > 0) {
      for (let i = 0; i < nextMissingIds.length; i += 200) {
        const chunk = nextMissingIds.slice(i, i + 200)
        const { data } = await supabase.from('deals').select(columns).in('andpad_id', chunk)
        if (data) nextAllRaw.push(...(data as OrderDeal[]).filter(excludeLost))
      }
    }
    const nextAll = splitDealsByContracts(nextAllRaw, nextContracts)
    setNextDeals(nextAll)
    cacheSet('followup_next_deals', nextAll)

    // 目標データ取得
    const targetRes = await supabase.from('targets')
      .select('department,month,amount')
      .eq('sn_year', fiscal.snYear)
      .eq('category', '受注')
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
        cacheGet<OrderDeal[]>('followup_deals'),
        cacheGet<OrderDeal[]>('followup_prev_deals'),
        cacheGet<OrderDeal[]>('followup_next_deals'),
        cacheGet<typeof staffDepts>('followup_staff_depts'),
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

  const orderedDeals = useMemo(() => deals.filter((d) => d.order_date != null), [deals])
  const plannedDeals = useMemo(() => {
    return deals.filter((d) => {
      if (d.order_date != null) return false
      // 前月以前の受注予定を除外（includePastPlannedがtrueなら全て表示）
      if (!includePastPlanned && d.order_date_planned && d.order_date_planned < currentMonth) return false
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

  // 成約確度グループ判定（共通）
  const probToGroup = (d: OrderDeal): string => {
    if (d.order_date) return '受注済'
    const p = d.closing_probability || ''
    if (p.includes('90')) return '90%'
    if (p.includes('50')) return '50%'
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
          aVal = a.contract_amount_ex_tax || a.estimate_amount_ex_tax
          bVal = b.contract_amount_ex_tax || b.estimate_amount_ex_tax
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
    return filteredDeals.reduce((s, d) => s + (d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0), 0)
  }, [filteredDeals])

  const orderedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.order_date != null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0), 0) }
  }, [filteredDeals])

  const plannedSummary = useMemo(() => {
    const items = filteredDeals.filter((d) => d.order_date == null)
    return { count: items.length, amount: items.reduce((s, d) => s + (d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0), 0) }
  }, [filteredDeals])


  // 担当者ごとの小計を計算（受注済/受注予定を分けて）
  const staffSubtotals = useMemo(() => {
    const map = new Map<string, { orderedCount: number; orderedAmount: number; plannedCount: number; plannedAmount: number }>()
    filteredDeals.forEach((d) => {
      const name = cleanStaffName(d.staff_name)
      const entry = map.get(name) || { orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
      const amt = d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0
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
    return n.toLocaleString()
  }

  const downloadXls = () => {
    const rows = filteredDeals.map((d) => ({
      '担当者': cleanStaffName(d.staff_name),
      '店舗': d.store_name || '',
      'お客様名': d.customer_name || '',
      '案件名': d.name,
      '反響きっかけ': d.response_category || '',
      '成約確度': d.order_date ? '受注済' : (d.closing_probability || ''),
      '契約日': d.order_date ? formatDate(d.order_date) : d.order_date_planned ? formatDate(d.order_date_planned) : '',
      '契約日区分': d.order_date ? '実績' : d.order_date_planned ? '予定' : '',
      '契約金額': d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0,
      '引渡日': d.handover_date_actual ? formatDate(d.handover_date_actual) : d.handover_date_planned ? formatDate(d.handover_date_planned) : '',
      '引渡日区分': d.handover_date_actual ? '実績' : d.handover_date_planned ? '予定' : '',
      '売上金額': d.contract_amount_ex_tax || 0,
      'ANDPAD URL': d.andpad_id ? `https://andpad.jp/manager/my/orders/${d.andpad_id}` : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '受注案件一覧')
    XLSX.writeFile(wb, `受注案件一覧_${fiscal.snYear}sn.xlsx`)
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

  const buildMonthMap = (sourceDeals: OrderDeal[], snYear: number): MonthData => {
    const map: MonthData = new Map()
    const months = buildMonths(snYear)
    sourceDeals.forEach((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return
      if (selectedProbs.length > 0 && !selectedProbs.includes(probToGroup(d))) return
      if (!includePastPlanned && !d.order_date && d.order_date_planned && d.order_date_planned < currentMonth) return
      let dt = d.order_date || d.order_date_planned
      if (!dt) return
      // order_dateが期間外の場合はorder_date_plannedにフォールバック
      if (d.order_date && !months.includes(d.order_date.slice(0, 7)) && d.order_date_planned) {
        dt = d.order_date_planned
      }
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const amt = d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0
      const isOrdered = d.order_date != null
      const info: DealInfo = {
        name: d.customer_name || d.name,
        staff: cleanStaffName(d.staff_name),
        prob: isOrdered ? '受注済' : (d.closing_probability || '-'),
        amount: amt,
        ordered: isOrdered,
      }
      const entry = map.get(ym) || { count: 0, amount: 0, deals: [], orderedCount: 0, orderedAmount: 0, plannedCount: 0, plannedAmount: 0 }
      entry.count++
      entry.amount += amt
      if (isOrdered) { entry.orderedCount++; entry.orderedAmount += amt }
      else { entry.plannedCount++; entry.plannedAmount += amt }
      entry.deals.push(info)
      map.set(ym, entry)
    })
    return map
  }

  // 半期ごとのテーブルデータを生成
  type HalfPeriod = { months: string[]; data: MonthData; label: string }
  type C3Group = { label: string; labelClass: string; isCollapsible: boolean; tables: HalfPeriod[] }

  const c3Groups = useMemo(() => {
    const prevMap = buildMonthMap(prevDeals, prevFiscal.snYear)
    const currentMap = buildMonthMap(deals, fiscal.snYear)
    const nextMap = buildMonthMap(nextDeals, nextFiscalPeriod.snYear)

    const addHalves = (snYear: number, data: MonthData, prefix: string) => {
      const months = buildMonths(snYear)
      return [
        { months: months.slice(0, 6), data, label: `${prefix} 上期（9〜2月）` },
        { months: months.slice(6, 12), data, label: `${prefix} 下期（3〜8月）` },
      ]
    }

    return [
      { label: `${fiscal.snYear}sn（今期）`, labelClass: 'text-blue-700 bg-blue-50 border-blue-200', isCollapsible: false, tables: addHalves(fiscal.snYear, currentMap, `${fiscal.snYear}sn 今期契約`) },
      { label: `${prevFiscal.snYear}sn（前期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, tables: addHalves(prevFiscal.snYear, prevMap, `${prevFiscal.snYear}sn 前期契約`) },
      { label: `${nextFiscalPeriod.snYear}sn（来期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', isCollapsible: true, tables: addHalves(nextFiscalPeriod.snYear, nextMap, `${nextFiscalPeriod.snYear}sn 来期契約`) },
    ] as C3Group[]
  }, [prevDeals, deals, nextDeals, fiscal, prevFiscal, nextFiscalPeriod, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, includePastPlanned, currentMonth])

  const C1_DEPTS = ['中信1課', '中信2課', '北信3課', '東信4課', '南信5課', 'その他'] as const

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

  // C1用データビルダー
  type C1Entry = { ordered: number; planned: number; total: number }
  const buildC1 = (sourceDeals: OrderDeal[], snYear: number) => {
    const months = buildMonths(snYear)
    const data: Record<string, Record<string, C1Entry>> = {}
    const details: Record<string, Record<string, OrderDeal[]>> = {}
    for (const dept of C1_DEPTS) { data[dept] = {}; details[dept] = {} }
    const filtered = sourceDeals.filter((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return false
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return false
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return false
      if (!includePastPlanned && !d.order_date && d.order_date_planned && d.order_date_planned < currentMonth) return false
      if (selectedProbs.length > 0 && !selectedProbs.includes(probToGroup(d))) return false
      return true
    })
    filtered.forEach((d) => {
      // order_dateが期間外の場合はorder_date_plannedにフォールバック
      let dt = d.order_date || d.order_date_planned
      if (!dt) return
      if (d.order_date && !months.includes(d.order_date.slice(0, 7)) && d.order_date_planned) {
        dt = d.order_date_planned
      }
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = d.staff_name || ''
      const dept = getDeptForStaff(staff, dt, d.store_name) || 'その他'
      if (!data[dept]) data[dept] = {}
      if (!details[dept]) details[dept] = {}
      const entry = data[dept][ym] || { ordered: 0, planned: 0, total: 0 }
      const amt = d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0
      if (d.order_date) { entry.ordered += amt } else { entry.planned += amt }
      entry.total += amt
      data[dept][ym] = entry
      if (!details[dept][ym]) details[dept][ym] = []
      details[dept][ym].push(d)
    })
    return { months, data, details }
  }

  // C1: 課別×月別の受注金額テーブルデータ
  const c1Data = useMemo(() => buildC1(deals, fiscal.snYear), [deals, fiscal, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, includePastPlanned, currentMonth])

  const c1PrevData = useMemo(() => buildC1(prevDeals, prevFiscal.snYear), [prevDeals, prevFiscal, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, includePastPlanned, currentMonth])
  const c1NextData = useMemo(() => buildC1(nextDeals, nextFiscalPeriod.snYear), [nextDeals, nextFiscalPeriod, getDeptForStaff, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, includePastPlanned, currentMonth])

  // C2: 担当者別×月別の受注金額
  // C2用データビルダー（同じ担当者でも課が異なれば別行）
  type C2Key = string // "担当者名\t課名"
  const buildC2 = (sourceDeals: OrderDeal[], snYear: number) => {
    const months = buildMonths(snYear)
    const data: Record<C2Key, Record<string, C1Entry>> = {}
    const details: Record<C2Key, Record<string, OrderDeal[]>> = {}
    const keyDeptMap: Record<C2Key, string> = {}
    const keyStaffMap: Record<C2Key, string> = {}
    const filtered = sourceDeals.filter((d) => {
      if (dealFilter !== 'all' && d.deal_category !== dealFilter) return false
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(d.store_name))) return false
      if (staffFilter !== 'all' && cleanStaffName(d.staff_name) !== staffFilter) return false
      if (!includePastPlanned && !d.order_date && d.order_date_planned && d.order_date_planned < currentMonth) return false
      if (selectedProbs.length > 0 && !selectedProbs.includes(probToGroup(d))) return false
      return true
    })
    filtered.forEach((d) => {
      let dt = d.order_date || d.order_date_planned
      if (!dt) return
      if (d.order_date && !months.includes(d.order_date.slice(0, 7)) && d.order_date_planned) {
        dt = d.order_date_planned
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
      const amt = d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0
      if (d.order_date) { entry.ordered += amt } else { entry.planned += amt }
      entry.total += amt
      data[key][ym] = entry
      if (!details[key][ym]) details[key][ym] = []
      details[key][ym].push(d)
    })
    const deptOrder: Record<string, number> = {}
    C1_DEPTS.forEach((d, i) => { deptOrder[d] = i })
    const keys = Object.keys(data).sort((a, b) => {
      const deptCmp = (deptOrder[keyDeptMap[a]] ?? 99) - (deptOrder[keyDeptMap[b]] ?? 99)
      if (deptCmp !== 0) return deptCmp
      return keyStaffMap[a].localeCompare(keyStaffMap[b], 'ja')
    })
    return { months, data, details, keys, keyDeptMap, keyStaffMap }
  }

  const c2Data = useMemo(() => buildC2(deals, fiscal.snYear), [deals, fiscal, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, getDeptForStaff, includePastPlanned, currentMonth])
  const c2PrevData = useMemo(() => buildC2(prevDeals, prevFiscal.snYear), [prevDeals, prevFiscal, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, getDeptForStaff, includePastPlanned, currentMonth])
  const c2NextData = useMemo(() => buildC2(nextDeals, nextFiscalPeriod.snYear), [nextDeals, nextFiscalPeriod, dealFilter, selectedStoreGroups, staffFilter, selectedProbs, getDeptForStaff, includePastPlanned, currentMonth])

  // 検算用: フィルター無し全量で2つの異なるロジックから比較
  // 左: deals全件の金額を単純合算（月判定のみ）
  const verifyListTotal = useMemo(() => {
    const months = buildMonths(fiscal.snYear)
    return deals.reduce((s, d) => {
      let dt = d.order_date || d.order_date_planned
      if (!dt) return s
      if (d.order_date && !months.includes(d.order_date.slice(0, 7)) && d.order_date_planned) dt = d.order_date_planned
      if (!months.includes(dt.slice(0, 7))) return s
      return s + (d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0)
    }, 0)
  }, [deals, fiscal])
  // 右: deals全件をC1課別振分ロジック経由で合算（フィルター無し）
  const verifyC1Total = useMemo(() => {
    const months = buildMonths(fiscal.snYear)
    let sum = 0
    deals.forEach((d) => {
      let dt = d.order_date || d.order_date_planned
      if (!dt) return
      if (d.order_date && !months.includes(d.order_date.slice(0, 7)) && d.order_date_planned) dt = d.order_date_planned
      const ym = dt.slice(0, 7)
      if (!months.includes(ym)) return
      const staff = d.staff_name || ''
      const dept = getDeptForStaff(staff, dt, d.store_name) || 'その他'
      if (!dept) return
      sum += d.contract_amount_ex_tax || d.estimate_amount_ex_tax || 0
    })
    return sum
  }, [deals, fiscal, getDeptForStaff])

  // 受注済のみ選択時は予定・合計を非表示
  const onlyOrdered = selectedProbs.length === 1 && selectedProbs[0] === '受注済'

  return (
    <div className="space-y-6">
      {/* ヘッダー: 3段構成 */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* 1段目: タイトル + 期間 + 更新 */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <UserSearch className="w-5 h-5" />A4
            </span>
            個人商談集計
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
            {/* 部門 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">部門</span>
              {b1Depts.map((dept) => {
                const isChecked = selectedB1Depts.includes(dept)
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      const next = isChecked ? selectedB1Depts.filter(d => d !== dept) : [...selectedB1Depts, dept]
                      setSelectedB1Depts(next)
                    }}
                    className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                      isChecked ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {dept}
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
        {/* 3段目: サマリー（来場数・アポ数・アポ率） */}
        <div className="flex items-center gap-6 px-4 py-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {(() => {
            const totalVisits = visitData.length
            const totalAppos = visitData.filter(v => v.has_appointment === '有').length
            const appoRate = totalVisits > 0 ? Math.round((totalAppos / totalVisits) * 100) : 0
            return <>
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="text-blue-600">来場数</span>
                <span className="text-lg font-bold text-slate-900">{totalVisits.toLocaleString()}</span>
                <span className="text-slate-400">件</span>
              </div>
              <div className="border-l border-slate-200 h-6" />
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="text-emerald-600">アポ数</span>
                <span className="text-lg font-bold text-slate-900">{totalAppos.toLocaleString()}</span>
                <span className="text-slate-400">件</span>
              </div>
              <div className="border-l border-slate-200 h-6" />
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="text-purple-600 font-semibold">アポ率</span>
                <span className="text-lg font-bold text-purple-600">{appoRate}%</span>
              </div>
            </>
          })()}
        </div>
      </div>

      {/* B1-1: 担当者別の商談数 */}
      {b1Data.staffList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A4 - <span className="text-xl">1</span></span>
              担当者別の商談数
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-blue-600">■ 来場数</span>
              <span className="font-semibold text-emerald-600">■ アポ数</span>
              <span className="font-semibold text-purple-600">■ アポ率</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-10">部門</th>
                  <th className="px-3 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap">担当者</th>
                  {b1Data.months.slice(0, 6).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(0, 4))}年{parseInt(ym.slice(5))}月</th>)}
                  <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期</th>
                  {b1Data.months.slice(6, 12).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(0, 4))}年{parseInt(ym.slice(5))}月</th>)}
                  <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50">下期</th>
                  <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">年間</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredList = b1Data.staffList.filter(s => selectedB1Depts.length === 0 || selectedB1Depts.includes(b1Data.getDept(s)))
                  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 100) : 0
                  const sumStaffRange = (staffs: string[], yms: string[]) => {
                    let visits = 0, appos = 0
                    for (const s of staffs) { const row = b1Data.staffMap.get(s) || {}; for (const ym of yms) { const v = row[ym]; if (v) { visits += v.visits; appos += v.appos } } }
                    return { visits, appos }
                  }
                  const result: React.ReactNode[] = []
                  for (let si = 0; si < filteredList.length; si++) {
                    const staff = filteredList[si]
                    const dept = b1Data.getDept(staff)
                    const row = b1Data.staffMap.get(staff) || {}
                    const getVal = (ym: string) => row[ym] || { visits: 0, appos: 0 }
                    const sumRange = (yms: string[]) => yms.reduce((s, ym) => { const v = getVal(ym); return { visits: s.visits + v.visits, appos: s.appos + v.appos } }, { visits: 0, appos: 0 })
                    const h1 = sumRange(b1Data.months.slice(0, 6))
                    const h2 = sumRange(b1Data.months.slice(6, 12))
                    const year = sumRange(b1Data.months)
                    const cellClass = (v: { visits: number; appos: number }) => v.visits ? '' : 'text-slate-300'
                    const getDetails = (yms: string[]) => yms.flatMap(ym => (b1Data.staffDetailMap.get(staff) || {})[ym] || [])
                    const clickCell = (title: string, yms: string[], appoOnly?: boolean) => {
                      const list = getDetails(yms)
                      setB1Detail({ title, visits: appoOnly ? list.filter(v => v.has_appointment === '有') : list })
                    }
                    const prevDept = si > 0 ? b1Data.getDept(filteredList[si - 1]) : null
                    const isNewDept = dept !== prevDept
                    const deptStaffs = filteredList.filter(s => b1Data.getDept(s) === dept)
                    const nextDept = si < filteredList.length - 1 ? b1Data.getDept(filteredList[si + 1]) : null
                    const isLastInDept = dept !== nextDept

                    result.push(
                      <React.Fragment key={staff}>
                        <tr className={`bg-blue-50/30 ${isNewDept && si > 0 ? 'border-t-4 border-slate-500' : si > 0 ? 'border-t border-slate-200' : ''}`}>
                          {isNewDept && <td rowSpan={deptStaffs.length * 3} className="px-2 py-1 border border-slate-200 text-slate-600 whitespace-nowrap align-middle text-xs sticky left-0 bg-white z-10">{dept}</td>}
                          <td rowSpan={3} className="px-3 py-1 border border-slate-200 font-medium text-slate-800 whitespace-nowrap align-middle">{staff}</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = getVal(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-blue-600 ${cellClass(v)} ${v.visits ? 'cursor-pointer hover:bg-blue-50' : ''}`} onClick={() => v.visits && clickCell(`${staff} ${parseInt(ym.slice(5))}月 来場`, [ym])}>{v.visits || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-blue-600 bg-blue-50 ${h1.visits ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={() => h1.visits && clickCell(`${staff} 上期 来場`, b1Data.months.slice(0, 6))}>{h1.visits || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getVal(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-blue-600 ${cellClass(v)} ${v.visits ? 'cursor-pointer hover:bg-blue-50' : ''}`} onClick={() => v.visits && clickCell(`${staff} ${parseInt(ym.slice(5))}月 来場`, [ym])}>{v.visits || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-blue-600 bg-green-50 ${h2.visits ? 'cursor-pointer hover:bg-green-100' : ''}`} onClick={() => h2.visits && clickCell(`${staff} 下期 来場`, b1Data.months.slice(6, 12))}>{h2.visits || '-'}</td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-blue-600 bg-amber-50 ${year.visits ? 'cursor-pointer hover:bg-amber-100' : ''}`} onClick={() => year.visits && clickCell(`${staff} 年間 来場`, b1Data.months)}>{year.visits || '-'}</td>
                        </tr>
                        <tr className="bg-emerald-50/30">
                          {b1Data.months.slice(0, 6).map(ym => { const v = getVal(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-emerald-600 ${v.appos ? 'cursor-pointer hover:bg-emerald-50' : 'text-slate-300'}`} onClick={() => v.appos && clickCell(`${staff} ${parseInt(ym.slice(5))}月 アポ`, [ym], true)}>{v.appos || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-emerald-600 bg-blue-50 ${h1.appos ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={() => h1.appos && clickCell(`${staff} 上期 アポ`, b1Data.months.slice(0, 6), true)}>{h1.appos || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getVal(ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-emerald-600 ${v.appos ? 'cursor-pointer hover:bg-emerald-50' : 'text-slate-300'}`} onClick={() => v.appos && clickCell(`${staff} ${parseInt(ym.slice(5))}月 アポ`, [ym], true)}>{v.appos || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-emerald-600 bg-green-50 ${h2.appos ? 'cursor-pointer hover:bg-green-100' : ''}`} onClick={() => h2.appos && clickCell(`${staff} 下期 アポ`, b1Data.months.slice(6, 12), true)}>{h2.appos || '-'}</td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-emerald-600 bg-amber-50 ${year.appos ? 'cursor-pointer hover:bg-amber-100' : ''}`} onClick={() => year.appos && clickCell(`${staff} 年間 アポ`, b1Data.months, true)}>{year.appos || '-'}</td>
                        </tr>
                        <tr className="bg-purple-50/30">
                          {b1Data.months.slice(0, 6).map(ym => { const v = getVal(ym); const p = pct(v.appos, v.visits); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-purple-600 ${v.visits ? '' : 'text-slate-300'}`}>{v.visits ? `${p}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-purple-600 bg-blue-50">{h1.visits ? `${pct(h1.appos, h1.visits)}%` : '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getVal(ym); const p = pct(v.appos, v.visits); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right text-xs font-semibold text-purple-600 ${v.visits ? '' : 'text-slate-300'}`}>{v.visits ? `${p}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-purple-600 bg-green-50">{h2.visits ? `${pct(h2.appos, h2.visits)}%` : '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-xs text-purple-600 bg-amber-50">{year.visits ? `${pct(year.appos, year.visits)}%` : '-'}</td>
                        </tr>
                      </React.Fragment>
                    )

                    // 部門小計行
                    if (isLastInDept && deptStaffs.length > 1) {
                      const dh1 = sumStaffRange(deptStaffs, b1Data.months.slice(0, 6))
                      const dh2 = sumStaffRange(deptStaffs, b1Data.months.slice(6, 12))
                      const dy = sumStaffRange(deptStaffs, b1Data.months)
                      result.push(
                        <React.Fragment key={`${dept}-subtotal`}>
                          <tr className="border-t-2 border-slate-400" style={{ backgroundColor: '#f1f5f9' }}>
                            <td colSpan={2} className="px-3 py-0.5 border border-slate-300 font-bold text-slate-700 text-xs text-right">{dept}計</td>
                            {b1Data.months.slice(0, 6).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-blue-700">{v.visits || '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-blue-700 bg-blue-100">{dh1.visits || '-'}</td>
                            {b1Data.months.slice(6, 12).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-blue-700">{v.visits || '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-blue-700 bg-green-100">{dh2.visits || '-'}</td>
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-blue-700 bg-amber-100">{dy.visits || '-'}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <td colSpan={2} className="px-3 py-0.5 border border-slate-300 text-xs text-right text-slate-400">アポ</td>
                            {b1Data.months.slice(0, 6).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-emerald-700">{v.appos || '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-emerald-700 bg-blue-100">{dh1.appos || '-'}</td>
                            {b1Data.months.slice(6, 12).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-emerald-700">{v.appos || '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-emerald-700 bg-green-100">{dh2.appos || '-'}</td>
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-emerald-700 bg-amber-100">{dy.appos || '-'}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <td colSpan={2} className="px-3 py-0.5 border border-slate-300 text-xs text-right text-slate-400">率</td>
                            {b1Data.months.slice(0, 6).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-purple-700">{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-purple-700 bg-blue-100">{dh1.visits ? `${pct(dh1.appos, dh1.visits)}%` : '-'}</td>
                            {b1Data.months.slice(6, 12).map(ym => { const v = sumStaffRange(deptStaffs, [ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-purple-700">{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-purple-700 bg-green-100">{dh2.visits ? `${pct(dh2.appos, dh2.visits)}%` : '-'}</td>
                            <td className="px-1 py-0.5 border border-slate-300 text-right text-xs font-bold text-purple-700 bg-amber-100">{dy.visits ? `${pct(dy.appos, dy.visits)}%` : '-'}</td>
                          </tr>
                        </React.Fragment>
                      )
                    }
                  }
                  return result
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B1-2: サンキーダイアグラム */}
      {visitData.length > 0 && (() => {
        const filtered = visitData.filter(v => {
          const staff = v.staff1?.trim() || '未設定'
          const dept = b1Data.getDept(staff)
          return selectedB1Depts.length === 0 || selectedB1Depts.includes(dept)
        })
        const total = filtered.length
        if (total === 0) return null

        const typeLabels = ['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし']
        const typeColors: Record<string, string> = { '新築新規': '#3b82f6', '新築再来': '#93c5fd', 'リフォーム新規': '#f59e0b', 'リフォーム再来': '#fcd34d', '計画なし': '#94a3b8' }

        // ノードとリンクを構築
        type SNode = { id: string; label: string; color: string }
        type SLink = { source: string; target: string; value: number; color: string }
        const nodes: SNode[] = []
        const links: SLink[] = []

        for (const t of typeLabels) {
          const count = filtered.filter(v => (v.customer_type || '計画なし') === t).length
          if (count > 0) nodes.push({ id: t, label: t, color: typeColors[t] })
        }
        nodes.push({ id: 'アポ取得', label: 'アポ取得', color: '#10b981' })
        nodes.push({ id: 'アポ未取得', label: 'アポ未取得', color: '#ef4444' })

        for (const t of typeLabels) {
          const items = filtered.filter(v => (v.customer_type || '計画なし') === t)
          const appo = items.filter(v => v.has_appointment === '有').length
          const noAppo = items.length - appo
          if (appo > 0) links.push({ source: t, target: 'アポ取得', value: appo, color: '#10b981' })
          if (noAppo > 0) links.push({ source: t, target: 'アポ未取得', value: noAppo, color: '#fca5a5' })
        }

        // d3-sankey でレイアウト計算
        const W = 700, H = 320, pad = 24
        const nodeIds = nodes.map(n => n.id)
        const sankeyGen = d3Sankey<SNode, SLink>()
          .nodeId((d: SNode) => d.id)
          .nodeWidth(20)
          .nodePadding(12)
          .extent([[pad, pad], [W - pad, H - pad]])

        const sNodes = nodes.map(n => ({ ...n }))
        const sLinks = links.filter(l => nodeIds.includes(l.source) && nodeIds.includes(l.target)).map(l => ({ ...l }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const graph = sankeyGen({ nodes: sNodes as any[], links: sLinks as any[] })
        const linkPath = sankeyLinkHorizontal()

        const totalAppo = filtered.filter(v => v.has_appointment === '有').length

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A4 - <span className="text-xl">2</span></span>
                来場→アポ転換フロー
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">期間内 {total}件</span>
                <span className="text-emerald-600 font-bold">アポ取得 {totalAppo}件（{Math.round((totalAppo / total) * 100)}%）</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 360 }}>
              {/* リンク */}
              {(graph.links || []).map((link, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = linkPath(link as any)
                const orig = sLinks[i]
                return (
                  <path key={i} d={d || ''} fill="none" stroke={orig?.color || '#ccc'} strokeWidth={Math.max((link as { width?: number }).width || 1, 2)} opacity={0.4} />
                )
              })}
              {/* ノード */}
              {(graph.nodes || []).map((node, i) => {
                const n = node as { x0?: number; x1?: number; y0?: number; y1?: number; id?: string }
                const x0 = n.x0 || 0, x1 = n.x1 || 0, y0 = n.y0 || 0, y1 = n.y1 || 0
                const orig = nodes.find(nn => nn.id === n.id)
                const nodeTotal = links.filter(l => l.source === n.id).reduce((s, l) => s + l.value, 0)
                  || links.filter(l => l.target === n.id).reduce((s, l) => s + l.value, 0)
                const isRight = n.id === 'アポ取得' || n.id === 'アポ未取得'
                return (
                  <g key={i}>
                    <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={3} fill={orig?.color || '#ccc'} />
                    <text x={isRight ? x1 + 6 : x0 - 6} y={(y0 + y1) / 2} dy="0.35em" textAnchor={isRight ? 'start' : 'end'} className="text-xs font-semibold" fill="#334155" style={{ fontSize: 11 }}>
                      {orig?.label} ({nodeTotal})
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )
      })()}

      {/* B1-3: 担当者別 来場区分別アポイント率 */}
      {visitData.length > 0 && (() => {
        const filteredStaffs = b1Data.staffList.filter(s => selectedB1Depts.length === 0 || selectedB1Depts.includes(b1Data.getDept(s)))
        if (filteredStaffs.length === 0) return null
        const staff = selectedB1_3Staff && filteredStaffs.includes(selectedB1_3Staff) ? selectedB1_3Staff : (filteredStaffs.find(s => s.replace(/\s+/g, '') === '鈴木颯太郎') || filteredStaffs[0])
        const staffVisits = visitData.filter(v => (v.staff1?.trim() || '未設定') === staff)
        const typeLabels = ['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし'] as const
        const typeColors: Record<string, { bg: string; text: string }> = {
          '新築新規': { bg: 'bg-blue-50/50', text: 'text-blue-700' },
          '新築再来': { bg: 'bg-sky-50/50', text: 'text-sky-600' },
          'リフォーム新規': { bg: 'bg-amber-50/50', text: 'text-amber-700' },
          'リフォーム再来': { bg: 'bg-yellow-50/50', text: 'text-yellow-600' },
          '計画なし': { bg: 'bg-slate-50/50', text: 'text-slate-500' },
        }
        const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 100) : 0
        const getTypeMonth = (type: string, ym: string) => {
          const items = staffVisits.filter(v => (v.customer_type || '計画なし') === type && v.visit_date?.slice(0, 7) === ym)
          return { visits: items.length, appos: items.filter(v => v.has_appointment === '有').length }
        }
        const getTypeRange = (type: string, yms: string[]) => {
          const items = staffVisits.filter(v => (v.customer_type || '計画なし') === type && yms.includes(v.visit_date?.slice(0, 7) || ''))
          return { visits: items.length, appos: items.filter(v => v.has_appointment === '有').length }
        }
        const totalRange = (yms: string[]) => {
          const items = staffVisits.filter(v => yms.includes(v.visit_date?.slice(0, 7) || ''))
          return { visits: items.length, appos: items.filter(v => v.has_appointment === '有').length }
        }
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A4 - <span className="text-xl">3</span></span>
                来場区分別アポイント率
              </h2>
              <div className="flex items-center gap-3">
                <select
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={staff}
                  onChange={e => setSelectedB1_3Staff(e.target.value)}
                >
                  {filteredStaffs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-10">来場区分</th>
                    <th className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap w-10"></th>
                    {b1Data.months.slice(0, 6).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(5))}月</th>)}
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期</th>
                    {b1Data.months.slice(6, 12).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(5))}月</th>)}
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50">下期</th>
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">年間</th>
                  </tr>
                </thead>
                <tbody>
                  {typeLabels.map((type, ti) => {
                    const h1 = getTypeRange(type, b1Data.months.slice(0, 6))
                    const h2 = getTypeRange(type, b1Data.months.slice(6, 12))
                    const year = getTypeRange(type, b1Data.months)
                    const tc = typeColors[type]
                    const clickDetail = (title: string, yms: string[], appoOnly?: boolean) => {
                      const items = staffVisits.filter(v => (v.customer_type || '計画なし') === type && yms.includes(v.visit_date?.slice(0, 7) || ''))
                      setB1Detail({ title, visits: appoOnly ? items.filter(v => v.has_appointment === '有') : items })
                    }
                    return (
                      <React.Fragment key={type}>
                        <tr className={`${tc.bg} ${ti > 0 ? 'border-t border-slate-200' : ''}`}>
                          <td rowSpan={3} className={`px-2 py-1 border border-slate-200 font-semibold whitespace-nowrap align-middle sticky left-0 bg-white z-10 ${tc.text}`}>{type}</td>
                          <td className="px-1 py-0.5 border border-slate-200 text-center text-blue-600 font-semibold whitespace-nowrap">来場</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-blue-600 ${v.visits ? 'cursor-pointer hover:bg-blue-50' : 'text-slate-300'}`} onClick={() => v.visits && clickDetail(`${staff} ${type} ${parseInt(ym.slice(5))}月 来場`, [ym])}>{v.visits || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-blue-50 ${h1.visits ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={() => h1.visits && clickDetail(`${staff} ${type} 上期 来場`, b1Data.months.slice(0, 6))}>{h1.visits || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-blue-600 ${v.visits ? 'cursor-pointer hover:bg-blue-50' : 'text-slate-300'}`} onClick={() => v.visits && clickDetail(`${staff} ${type} ${parseInt(ym.slice(5))}月 来場`, [ym])}>{v.visits || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-green-50 ${h2.visits ? 'cursor-pointer hover:bg-green-100' : ''}`} onClick={() => h2.visits && clickDetail(`${staff} ${type} 下期 来場`, b1Data.months.slice(6, 12))}>{h2.visits || '-'}</td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-amber-50 ${year.visits ? 'cursor-pointer hover:bg-amber-100' : ''}`} onClick={() => year.visits && clickDetail(`${staff} ${type} 年間 来場`, b1Data.months)}>{year.visits || '-'}</td>
                        </tr>
                        <tr className={tc.bg}>
                          <td className="px-1 py-0.5 border border-slate-200 text-center text-emerald-600 font-semibold whitespace-nowrap">アポ</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-emerald-600 ${v.appos ? 'cursor-pointer hover:bg-emerald-50' : 'text-slate-300'}`} onClick={() => v.appos && clickDetail(`${staff} ${type} ${parseInt(ym.slice(5))}月 アポ`, [ym], true)}>{v.appos || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-blue-50 ${h1.appos ? 'cursor-pointer hover:bg-blue-100' : ''}`} onClick={() => h1.appos && clickDetail(`${staff} ${type} 上期 アポ`, b1Data.months.slice(0, 6), true)}>{h1.appos || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-emerald-600 ${v.appos ? 'cursor-pointer hover:bg-emerald-50' : 'text-slate-300'}`} onClick={() => v.appos && clickDetail(`${staff} ${type} ${parseInt(ym.slice(5))}月 アポ`, [ym], true)}>{v.appos || '-'}</td> })}
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-green-50 ${h2.appos ? 'cursor-pointer hover:bg-green-100' : ''}`} onClick={() => h2.appos && clickDetail(`${staff} ${type} 下期 アポ`, b1Data.months.slice(6, 12), true)}>{h2.appos || '-'}</td>
                          <td className={`px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-amber-50 ${year.appos ? 'cursor-pointer hover:bg-amber-100' : ''}`} onClick={() => year.appos && clickDetail(`${staff} ${type} 年間 アポ`, b1Data.months, true)}>{year.appos || '-'}</td>
                        </tr>
                        <tr className={tc.bg}>
                          <td className="px-1 py-0.5 border border-slate-200 text-center text-purple-600 font-semibold whitespace-nowrap">率</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-purple-600 ${v.visits ? '' : 'text-slate-300'}`}>{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-600 bg-blue-50">{h1.visits ? `${pct(h1.appos, h1.visits)}%` : '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = getTypeMonth(type, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-purple-600 ${v.visits ? '' : 'text-slate-300'}`}>{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-600 bg-green-50">{h2.visits ? `${pct(h2.appos, h2.visits)}%` : '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-600 bg-amber-50">{year.visits ? `${pct(year.appos, year.visits)}%` : '-'}</td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                  {/* 合計行 */}
                  {(() => {
                    const h1 = totalRange(b1Data.months.slice(0, 6))
                    const h2 = totalRange(b1Data.months.slice(6, 12))
                    const year = totalRange(b1Data.months)
                    return (
                      <React.Fragment>
                        <tr className="border-t-2 border-slate-400" style={{ backgroundColor: '#f1f5f9' }}>
                          <td rowSpan={3} className="px-2 py-1 border border-slate-300 font-bold text-slate-700 whitespace-nowrap align-middle sticky left-0 z-10" style={{ backgroundColor: '#f1f5f9' }}>合計</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-center text-blue-700 font-bold whitespace-nowrap">来場</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700">{v.visits || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-blue-100">{h1.visits || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700">{v.visits || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-green-100">{h2.visits || '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-amber-100">{year.visits || '-'}</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td className="px-1 py-0.5 border border-slate-300 text-center text-emerald-700 font-bold whitespace-nowrap">アポ</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700">{v.appos || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-blue-100">{h1.appos || '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700">{v.appos || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-green-100">{h2.appos || '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-amber-100">{year.appos || '-'}</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td className="px-1 py-0.5 border border-slate-300 text-center text-purple-700 font-bold whitespace-nowrap">率</td>
                          {b1Data.months.slice(0, 6).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-700">{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-700 bg-blue-100">{h1.visits ? `${pct(h1.appos, h1.visits)}%` : '-'}</td>
                          {b1Data.months.slice(6, 12).map(ym => { const v = totalRange([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-700">{v.visits ? `${pct(v.appos, v.visits)}%` : '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-700 bg-green-100">{h2.visits ? `${pct(h2.appos, h2.visits)}%` : '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-purple-700 bg-amber-100">{year.visits ? `${pct(year.appos, year.visits)}%` : '-'}</td>
                        </tr>
                      </React.Fragment>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* B1詳細モーダル */}
      {b1Detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setB1Detail(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[80vw] w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">{b1Detail.title}（{b1Detail.visits.length}件）</h3>
              <button onClick={() => setB1Detail(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer px-2">×</button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">来場日</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">お客様氏名</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">来場区分</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">モデルハウス</th>
                    <th className="text-center py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">アポ</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700">アポ内容</th>
                    <th className="text-left py-1 px-2 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">担当者</th>
                  </tr>
                </thead>
                <tbody>
                  {b1Detail.visits.sort((a, b) => (a.visit_date || '').localeCompare(b.visit_date || '')).map((v, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{v.visit_date?.replace(/-/g, '/')}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-800 font-medium">{v.customer_name || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600">{v.customer_type || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600">{v.model_house_type || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-center">{v.has_appointment === '有' ? <span className="text-emerald-600 font-bold">有</span> : <span className="text-slate-300">-</span>}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600">{v.appointment_content || '-'}</td>
                      <td className="py-1 px-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{v.staff1 || '-'}</td>
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
