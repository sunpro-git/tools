import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { RefreshCw, UserSearch, User, Pencil, X, Loader2, Plus, ExternalLink } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES, useDepartments } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
import StaffSelector from '../common/StaffSelector'

type VisitRow = { staff1: string | null; visit_date: string; has_appointment: string | null; customer_type: string | null; model_house_type: string | null; customer_name: string | null; appointment_content: string | null }

const cleanStaff = (name: unknown) => typeof name === 'string' ? name.replace(/^\d+:\s*/, '').replace(/\s+/g, '') : '-'

export default function FollowUpB2Page() {
  const { businessType, setBusinessType } = useBusinessType()
  const { snYear: globalSnYear, setSnYear: setGlobalSnYear } = useFiscalYear()
  const snYearOptions = [globalSnYear - 1, globalSnYear, globalSnYear + 1]

  const [staffDepts, setStaffDepts] = useState<{ staff_name: string; department: string; start_date: string; end_date: string | null }[]>([])
  const [visitData, setVisitData] = useState<VisitRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [b1Detail, setB1Detail] = useState<{ title: string; visits: VisitRow[] } | null>(null)

  // B1-2: 追客案件一覧
  type DealRecord = Record<string, string | number | null>
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [editDeal, setEditDeal] = useState<DealRecord | null>(null)
  const [editDealForm, setEditDealForm] = useState<Record<string, string | null>>({})
  const [dealSaving, setDealSaving] = useState(false)
  const [dealStaffFilter, setDealStaffFilter] = useState('')
  const [showAllColumns, setShowAllColumns] = useState(false)

  const HIDDEN_IN_MAIN = new Set(['custom_migration', 'custom_age', 'referrer', 'custom_employer', 'custom_finance_consult', 'custom_no_plan', 'custom_coop_appoint', 'custom_line_works', 'custom_discovery'])

  const ALL_DEAL_COLUMNS = [
    { key: 'customer_name', label: '顧客名', width: '6%' },
    { key: 'staff_name', label: '担当者', width: '5%' },
    { key: 'closing_probability', label: '見込', width: '3%' },
    { key: 'custom_age', label: '年齢', width: '3%' },
    { key: 'custom_income', label: '世帯年収', width: '4%' },
    { key: 'referrer', label: '紹介・ファミリー', width: '5%' },
    { key: 'custom_employer', label: 'お勤め先', width: '5%' },
    { key: 'amount_ab', label: '金額A+B', width: '5%' },
    { key: 'custom_floor_area', label: '坪数', width: '3%' },
    { key: 'label_area', label: 'エリア', width: '4%' },
    { key: 'construction_location', label: '建築地状況', width: '4%' },
    { key: 'order_date_planned', label: '契約目標月', width: '4%' },
    { key: 'start_date_planned', label: '着工希望月', width: '4%' },
    { key: 'custom_meeting_status', label: '最新打合わせ', width: '5%' },
    { key: 'custom_next_schedule', label: '次回の予定', width: '5%' },
    { key: 'custom_competitor', label: '競合', width: '3%' },
    { key: 'custom_migration', label: '移住', width: '3%' },
    { key: 'custom_finance_consult', label: '資金相談', width: '3%' },
    { key: 'custom_no_plan', label: '無P', width: '2%' },
    { key: 'custom_coop_appoint', label: '協ア', width: '2%' },
    { key: 'custom_line_works', label: 'LINE', width: '2%' },
    { key: 'deal_category', label: '商品', width: '4%' },
    { key: 'custom_discovery', label: '発掘', width: '3%' },
    { key: 'custom_basic_info', label: '基本情報', width: '3%' },
    { key: 'custom_plan', label: '計画', width: '3%' },
    { key: 'custom_self_fund_loan', label: '自己資金', width: '3%' },
    { key: 'custom_decision_maker', label: '決定者', width: '4%' },
  ]

  const DEAL_COLUMNS = showAllColumns ? ALL_DEAL_COLUMNS : ALL_DEAL_COLUMNS.filter(c => !HIDDEN_IN_MAIN.has(c.key))

  const DEAL_EDIT_FIELDS = [
    { key: 'custom_migration', label: '移住' },
    { key: 'closing_probability', label: '見込' },
    { key: 'custom_floor_area', label: '坪数' },
    { key: 'label_area', label: 'エリア' },
    { key: 'construction_location', label: '建築地状況' },
    { key: 'order_date_planned', label: '契約目標月', type: 'date' },
    { key: 'start_date_planned', label: '着工希望月', type: 'date' },
    { key: 'custom_meeting_status', label: '最新打合わせ状況' },
    { key: 'custom_next_schedule', label: '次回の予定' },
    { key: 'custom_competitor', label: '競合' },
    { key: 'custom_finance_consult', label: '資金相談' },
    { key: 'custom_no_plan', label: '無P' },
    { key: 'custom_coop_appoint', label: '協ア' },
    { key: 'custom_line_works', label: 'LINE WORKS' },
    { key: 'custom_discovery', label: '発掘' },
    { key: 'custom_basic_info', label: '基本情報' },
    { key: 'custom_plan', label: '計画' },
    { key: 'custom_self_fund_loan', label: '自己資金ローン審査' },
    { key: 'custom_decision_maker', label: '決定者' },
  ]

  const fetchDeals = useCallback(async () => {
    setDealsLoading(true)
    const { data } = await supabase.from('deals')
      .select('id,andpad_id,customer_name,staff_name,closing_probability,contract_amount_ex_tax,estimate_amount_ex_tax,label_area,construction_location,order_date,order_date_planned,start_date_planned,deal_category,customer_id,custom_migration,custom_floor_area,custom_meeting_status,custom_next_schedule,custom_competitor,custom_finance_consult,custom_no_plan,custom_coop_appoint,custom_line_works,custom_discovery,custom_basic_info,custom_plan,custom_self_fund_loan,custom_decision_maker')
      .eq('followup_active', true)
      .order('order_date_planned', { ascending: true })
      .limit(500)
    // customer info join
    if (data && data.length > 0) {
      const custIds = [...new Set(data.map((d: DealRecord) => d.customer_id).filter(Boolean))]
      const { data: customers } = custIds.length > 0
        ? await supabase.from('customers').select('andpad_id,custom_age,custom_income,custom_employer,referrer').in('andpad_id', custIds)
        : { data: [] }
      const custMap = new Map((customers || []).map((c: Record<string, unknown>) => [c.andpad_id, c]))
      const merged = data.map((d: DealRecord) => {
        const c = custMap.get(d.customer_id) as Record<string, unknown> | undefined
        const amtA = Number(d.contract_amount_ex_tax) || 0
        const amtB = Number(d.estimate_amount_ex_tax) || 0
        return { ...d, custom_age: c?.custom_age || null, custom_income: c?.custom_income || null, custom_employer: c?.custom_employer || null, referrer: c?.referrer || null, amount_ab: amtA + amtB > 0 ? amtA + amtB : null }
      })
      setDeals(merged)
    } else {
      setDeals([])
    }
    setDealsLoading(false)
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  // カテゴリ分け: 追客中 / 今期受注 / 前期以前受注
  const fiscalFrom = `${globalSnYear - 1}-09-01`
  const filteredDeals = useMemo(() => {
    let list = deals
    if (dealStaffFilter) list = list.filter(d => d.staff_name === dealStaffFilter)
    const followup: DealRecord[] = []
    const currentOrdered: DealRecord[] = []
    const pastOrdered: DealRecord[] = []
    for (const d of list) {
      if (!d.order_date) { followup.push(d) }
      else if (typeof d.order_date === 'string' && d.order_date >= fiscalFrom) { currentOrdered.push(d) }
      else { pastOrdered.push(d) }
    }
    return { all: list, followup, currentOrdered, pastOrdered }
  }, [deals, dealStaffFilter, fiscalFrom])

  const dealStaffNames = useMemo(() => {
    const set = new Set<string>()
    for (const d of deals) { if (typeof d.staff_name === 'string' && d.staff_name.trim()) set.add(d.staff_name.trim()) }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [deals])

  const openDealEditModal = (d: DealRecord) => {
    setEditDeal(d)
    const f: Record<string, string | null> = { staff_name: String(d.staff_name || '') }
    for (const col of DEAL_EDIT_FIELDS) { f[col.key] = String(d[col.key] || '') }
    setEditDealForm(f)
  }

  const handleDealEditSave = async () => {
    if (!editDeal) return
    setDealSaving(true)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editDealForm)) { clean[k] = typeof v === 'string' && v.trim() === '' ? null : v }
    await supabase.from('deals').update(clean).eq('id', editDeal.id)
    setEditDeal(null)
    setDealSaving(false)
    fetchDeals()
  }

  // 追客案件追加（物件検索）
  const [showDealSearch, setShowDealSearch] = useState(false)
  const [dealSearchQuery, setDealSearchQuery] = useState('')
  const [dealSearchDateFrom, setDealSearchDateFrom] = useState('')
  const [dealSearchDateTo, setDealSearchDateTo] = useState('')
  const [dealSearchDept, setDealSearchDept] = useState('')
  const [dealSearchResults, setDealSearchResults] = useState<DealRecord[]>([])
  const [dealSearching, setDealSearching] = useState(false)
  const [dealSearchDone, setDealSearchDone] = useState(false)

  const searchDeals = async () => {
    setDealSearching(true)
    setDealSearchDone(false)
    let query = supabase.from('deals')
      .select('id,customer_name,staff_name,name,store_name,inquiry_date,order_date_planned,closing_probability,followup_active,deal_category,label_area')
      .eq('followup_active', false)
    if (dealSearchQuery.trim()) {
      const q = dealSearchQuery.trim()
      query = query.or(`customer_name.ilike.%${q}%,name.ilike.%${q}%,staff_name.ilike.%${q}%`)
    }
    if (dealSearchDateFrom) query = query.gte('inquiry_date', dealSearchDateFrom)
    if (dealSearchDateTo) query = query.lte('inquiry_date', dealSearchDateTo)
    if (dealSearchDept) query = query.ilike('label_area', `%${dealSearchDept}%`)
    const { data } = await query.order('inquiry_date', { ascending: false }).limit(50)
    setDealSearchResults(data || [])
    setDealSearching(false)
    setDealSearchDone(true)
  }

  // エリア変更時に自動検索
  useEffect(() => {
    if (showDealSearch && dealSearchDone) searchDeals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealSearchDept])

  const startFollowup = async (dealId: string) => {
    await supabase.from('deals').update({ followup_active: true }).eq('id', dealId)
    setDealSearchResults(prev => prev.filter(d => d.id !== dealId))
    fetchDeals()
  }

  useEffect(() => {
    const fiscal = { from: `${globalSnYear - 1}-09-01`, to: `${globalSnYear}-08-31` }
    supabase.from('model_house_visits')
      .select('staff1,visit_date,has_appointment,customer_type,model_house_type,customer_name,appointment_content')
      .eq('business_type', businessType)
      .gte('visit_date', fiscal.from).lte('visit_date', fiscal.to)
      .limit(5000)
      .then(({ data }) => { if (data) setVisitData(data) })
  }, [businessType, globalSnYear])

  useEffect(() => {
    supabase.from('staff_departments')
      .select('staff_name,department,start_date,end_date')
      .order('staff_name').limit(5000)
      .then(({ data }) => { if (data) setStaffDepts(data as typeof staffDepts) })
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    const fiscal = { from: `${globalSnYear - 1}-09-01`, to: `${globalSnYear}-08-31` }
    const { data } = await supabase.from('model_house_visits')
      .select('staff1,visit_date,has_appointment,customer_type,model_house_type,customer_name,appointment_content')
      .eq('business_type', businessType)
      .gte('visit_date', fiscal.from).lte('visit_date', fiscal.to)
      .limit(5000)
    if (data) setVisitData(data)
    setRefreshing(false)
  }

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
  }, [visitData, globalSnYear, staffDepts])

  // 部門フィルター
  const { deptNames: businessDeptNames } = useDepartments(businessType as '新築' | 'リフォーム' | '不動産')
  const b1Depts = useMemo(() => {
    const depts = [...businessDeptNames]
    depts.push('その他')
    return depts
  }, [businessDeptNames])
  const [selectedB1Depts, setSelectedB1Depts] = useState<string[]>([])
  useEffect(() => {
    setSelectedB1Depts(b1Depts.filter(d => d !== 'その他'))
  }, [b1Depts])

  const fiscal = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const snYear = m >= 9 ? y + 1 : y
    return { snYear, from: `${snYear - 1}-09-01`, to: `${snYear}-08-31` }
  }, [])

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <UserSearch className="w-5 h-5" />B1
            </span>
            追客管理
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
          <button onClick={handleRefresh} disabled={refreshing} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer" title="最新データを取得">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* フィルター */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
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
        </div>
        {/* サマリー */}
        <div className="flex items-center gap-6 px-4 py-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {(() => {
            const filtered = visitData.filter(v => {
              const staff = v.staff1?.trim() || '未設定'
              const dept = b1Data.getDept(staff)
              return selectedB1Depts.length === 0 || selectedB1Depts.includes(dept)
            })
            const totalVisits = filtered.length
            const totalAppos = filtered.filter(v => v.has_appointment === '有').length
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

      {/* B1-1: 担当者別受注集計 */}
      {deals.length > 0 && (() => {
        // 期間の月リスト（9月〜8月）
        const months: string[] = []
        for (let i = 0; i < 12; i++) { const m = ((8 + i) % 12) + 1; const y = m >= 9 ? globalSnYear - 1 : globalSnYear; months.push(`${y}-${String(m).padStart(2, '0')}`) }
        // 担当者別×月別の受注件数・受注額
        type StaffMonth = { count: number; amount: number }
        const staffMap = new Map<string, Record<string, StaffMonth>>()
        for (const d of deals) {
          const staff = cleanStaff(d.staff_name)
          const dt = typeof d.order_date === 'string' && d.order_date ? d.order_date : null
          if (!dt) continue
          const ym = dt.slice(0, 7)
          if (!months.includes(ym)) continue
          if (!staffMap.has(staff)) staffMap.set(staff, {})
          const row = staffMap.get(staff)!
          if (!row[ym]) row[ym] = { count: 0, amount: 0 }
          row[ym].count++
          row[ym].amount += Number(d.contract_amount_ex_tax) || Number(d.estimate_amount_ex_tax) || 0
        }
        const staffList = [...staffMap.keys()].sort((a, b) => a.localeCompare(b, 'ja'))
        if (staffList.length === 0) return null
        const getVal = (staff: string, ym: string) => (staffMap.get(staff) || {})[ym] || { count: 0, amount: 0 }
        const sumRange = (staff: string, yms: string[]) => yms.reduce((s, ym) => { const v = getVal(staff, ym); return { count: s.count + v.count, amount: s.amount + v.amount } }, { count: 0, amount: 0 })
        const allSum = (yms: string[]) => staffList.reduce((s, st) => { const v = sumRange(st, yms); return { count: s.count + v.count, amount: s.amount + v.amount } }, { count: 0, amount: 0 })
        const fmtAmt = (v: number) => v > 0 ? `${Math.round(v / 10000).toLocaleString()}万` : '-'
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">B1 - <span className="text-xl">1</span></span>
                担当者別受注集計
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-blue-600">■ 受注件数</span>
                <span className="font-semibold text-emerald-600">■ 受注額</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-10">担当者</th>
                    {months.slice(0, 6).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(0, 4))}年{parseInt(ym.slice(5))}月</th>)}
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期</th>
                    {months.slice(6, 12).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(0, 4))}年{parseInt(ym.slice(5))}月</th>)}
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50">下期</th>
                    <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">年間</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(staff => {
                    const h1 = sumRange(staff, months.slice(0, 6))
                    const h2 = sumRange(staff, months.slice(6, 12))
                    const year = sumRange(staff, months)
                    return (
                      <React.Fragment key={staff}>
                        <tr className="bg-blue-50/30">
                          <td rowSpan={2} className="px-3 py-1 border border-slate-200 font-medium text-slate-800 whitespace-nowrap align-middle sticky left-0 bg-white z-10">{staff}</td>
                          {months.slice(0, 6).map(ym => { const v = getVal(staff, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-blue-600 ${v.count ? '' : 'text-slate-300'}`}>{v.count || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-blue-50">{h1.count || '-'}</td>
                          {months.slice(6, 12).map(ym => { const v = getVal(staff, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-blue-600 ${v.count ? '' : 'text-slate-300'}`}>{v.count || '-'}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-green-50">{h2.count || '-'}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-600 bg-amber-50">{year.count || '-'}</td>
                        </tr>
                        <tr className="bg-emerald-50/30">
                          {months.slice(0, 6).map(ym => { const v = getVal(staff, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-emerald-600 ${v.amount ? '' : 'text-slate-300'}`}>{fmtAmt(v.amount)}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-blue-50">{fmtAmt(h1.amount)}</td>
                          {months.slice(6, 12).map(ym => { const v = getVal(staff, ym); return <td key={ym} className={`px-1 py-0.5 border border-slate-200 text-right font-semibold text-emerald-600 ${v.amount ? '' : 'text-slate-300'}`}>{fmtAmt(v.amount)}</td> })}
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-green-50">{fmtAmt(h2.amount)}</td>
                          <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-600 bg-amber-50">{fmtAmt(year.amount)}</td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                  {/* 合計行 */}
                  <tr className="border-t-2 border-slate-400" style={{ backgroundColor: '#f1f5f9' }}>
                    <td className="px-3 py-0.5 border border-slate-300 font-bold text-slate-700 sticky left-0 z-10" style={{ backgroundColor: '#f1f5f9' }}>合計</td>
                    {months.slice(0, 6).map(ym => { const v = allSum([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700">{v.count || '-'}</td> })}
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-blue-100">{allSum(months.slice(0, 6)).count || '-'}</td>
                    {months.slice(6, 12).map(ym => { const v = allSum([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700">{v.count || '-'}</td> })}
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-green-100">{allSum(months.slice(6, 12)).count || '-'}</td>
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-blue-700 bg-amber-100">{allSum(months).count || '-'}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <td className="px-3 py-0.5 border border-slate-300 text-slate-400 text-right sticky left-0 z-10" style={{ backgroundColor: '#f1f5f9' }}>金額</td>
                    {months.slice(0, 6).map(ym => { const v = allSum([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700">{fmtAmt(v.amount)}</td> })}
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-blue-100">{fmtAmt(allSum(months.slice(0, 6)).amount)}</td>
                    {months.slice(6, 12).map(ym => { const v = allSum([ym]); return <td key={ym} className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700">{v.amount ? fmtAmt(v.amount) : '-'}</td> })}
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-green-100">{fmtAmt(allSum(months.slice(6, 12)).amount)}</td>
                    <td className="px-1 py-0.5 border border-slate-300 text-right font-bold text-emerald-700 bg-amber-100">{fmtAmt(allSum(months).amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* B1-2: 追客案件一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">B1 - <span className="text-xl">2</span></span>
            追客案件一覧
            <span className="text-xs text-slate-400 font-normal ml-1">{filteredDeals.all.length}件</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex text-xs">
              <button onClick={() => setShowAllColumns(false)} className={`px-2.5 py-1 rounded-l-lg border transition-colors ${!showAllColumns ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>主要項目</button>
              <button onClick={() => setShowAllColumns(true)} className={`px-2.5 py-1 rounded-r-lg border-t border-r border-b transition-colors ${showAllColumns ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>全項目</button>
            </div>
          <button onClick={() => {
            const today = new Date()
            const from = new Date(today); from.setDate(from.getDate() - 30)
            setDealSearchQuery(''); setDealSearchDept(''); setDealSearchDone(false)
            setDealSearchDateFrom(from.toISOString().slice(0, 10))
            setDealSearchDateTo(today.toISOString().slice(0, 10))
            setDealSearchResults([]); setShowDealSearch(true)
            // 初期検索を実行
            setTimeout(() => { const btn = document.getElementById('deal-search-btn'); btn?.click() }, 100)
          }} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />追客案件追加
          </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setDealStaffFilter('')} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${!dealStaffFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>全担当者</button>
          {dealStaffNames.map(s => (
            <button key={s} onClick={() => setDealStaffFilter(s)} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${dealStaffFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{cleanStaff(s)}</button>
          ))}
        </div>
        {dealsLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums', minWidth: showAllColumns ? '1800px' : undefined, width: '100%' }}>
              <thead>
                <tr className="bg-slate-50">
                  {DEAL_COLUMNS.map(col => (
                    <th key={col.key} className="px-1 py-1.5 border border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap" style={{ width: col.width }}>{col.label}</th>
                  ))}
                  <th className="px-1 py-1.5 border border-slate-200 text-center" style={{ width: '2%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.all.length === 0 ? (
                  <tr><td colSpan={DEAL_COLUMNS.length + 1} className="text-center py-8 text-slate-400 border border-slate-200">データがありません</td></tr>
                ) : (() => {
                  const fmt = (v: unknown) => v == null ? '-' : String(v)
                  const fmtDate = (v: unknown) => typeof v === 'string' && v ? v.slice(0, 7).replace('-', '/') : '-'
                  const fmtAmt = (v: unknown) => typeof v === 'number' && v ? `${Math.round(v / 10000)}万` : '-'
                  const renderRow = (d: DealRecord) => {
                    const cellVal = (key: string) => {
                      if (key === 'customer_name') return (
                        <span className="flex items-center gap-1">
                          <span className="truncate">{fmt(d.customer_name)}</span>
                          {d.andpad_id && <a href={`https://andpad.jp/manager/my/orders/${d.andpad_id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-700 flex-shrink-0"><ExternalLink className="w-3 h-3" /></a>}
                        </span>
                      )
                      if (key === 'closing_probability') return d.order_date ? <span className="text-emerald-600 font-bold">受注済</span> : fmt(d.closing_probability)
                      if (key === 'staff_name') return cleanStaff(d.staff_name)
                      if (key === 'amount_ab') return fmtAmt(d.amount_ab)
                      if (key === 'order_date_planned' || key === 'start_date_planned') return fmtDate(d[key])
                      return fmt(d[key])
                    }
                    return (
                      <tr key={String(d.id)} className="hover:bg-slate-50 cursor-pointer" onDoubleClick={() => openDealEditModal(d)}>
                        {DEAL_COLUMNS.map(col => (
                          <td key={col.key} className="px-1 py-1 border border-slate-200 truncate">{cellVal(col.key)}</td>
                        ))}
                        <td className="px-1 py-1 border border-slate-200 text-center">
                          <button type="button" onClick={() => openDealEditModal(d)} className="text-slate-400 hover:text-blue-600 cursor-pointer"><Pencil className="w-3.5 h-3.5 inline" /></button>
                        </td>
                      </tr>
                    )
                  }
                  const subtotalRow = (label: string, items: DealRecord[], color: string) => {
                    const totalAmt = items.reduce((s, d) => s + (Number(d.amount_ab) || 0), 0)
                    return (
                      <tr className="border-t border-b border-slate-300" style={{ backgroundColor: '#f1f5f9' }}>
                        <td colSpan={DEAL_COLUMNS.length + 1} className="px-3 py-1.5 font-bold text-xs">
                          <span className={color}>{label}</span>
                          <span className="text-slate-500 font-normal ml-3">{items.length}件</span>
                          {totalAmt > 0 && <span className="text-emerald-600 ml-3">{fmtAmt(totalAmt)}</span>}
                        </td>
                      </tr>
                    )
                  }
                  const groups = [
                    { label: '追客中', items: filteredDeals.followup, color: 'text-blue-700' },
                    { label: `${globalSnYear}sn 受注済`, items: filteredDeals.currentOrdered, color: 'text-emerald-700' },
                    { label: '前期以前 受注済', items: filteredDeals.pastOrdered, color: 'text-slate-600' },
                  ]
                  return groups.flatMap(g => g.items.length > 0 ? [
                    <React.Fragment key={`header-${g.label}`}>{subtotalRow(g.label, g.items, g.color)}</React.Fragment>,
                    ...g.items.map(d => renderRow(d)),
                  ] : [])
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* B1-2 編集モーダル */}
      {editDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditDeal(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">{editDeal.customer_name} - 追客情報編集</h3>
              <button onClick={() => setEditDeal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-auto flex-1">
              <StaffSelector category="追客" value={editDealForm.staff_name || ''} onChange={(name) => setEditDealForm(prev => ({ ...prev, staff_name: name }))} allStaffNames={dealStaffNames} />
              <div className="grid grid-cols-3 gap-3">
                {DEAL_EDIT_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{f.label}</label>
                    <input type={f.type || 'text'} value={editDealForm[f.key] || ''} onChange={(e) => setEditDealForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={async () => { if (editDeal && confirm('この案件を追客リストから削除しますか？')) { await supabase.from('deals').update({ followup_active: false }).eq('id', editDeal.id); setEditDeal(null); fetchDeals() } }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                  <X className="w-4 h-4" />追客案件から削除
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditDeal(null)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">キャンセル</button>
                  <button type="button" onClick={handleDealEditSave} disabled={dealSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    {dealSaving && <Loader2 className="w-4 h-4 animate-spin" />}保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 追客案件検索モーダル */}
      {showDealSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDealSearch(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">追客案件を追加</h3>
              <button onClick={() => setShowDealSearch(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 flex-shrink-0">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">キーワード</label>
                  <input
                    type="text"
                    value={dealSearchQuery}
                    onChange={(e) => setDealSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') searchDeals() }}
                    placeholder="顧客名・案件名・担当者名"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    autoFocus
                  />
                </div>
                <button id="deal-search-btn" type="button" onClick={searchDeals} disabled={dealSearching} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                  {dealSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '検索'}
                </button>
              </div>
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">エリア</label>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setDealSearchDept('')} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${!dealSearchDept ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>全て</button>
                    {['中信', '北信', '東信', '南信'].map(s => (
                      <button key={s} type="button" onClick={() => setDealSearchDept(dealSearchDept === s ? '' : s)} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${dealSearchDept === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">反響日</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="date" value={dealSearchDateFrom} onChange={(e) => setDealSearchDateFrom(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white" />
                      <span className="text-slate-400 text-xs">〜</span>
                      <input type="date" value={dealSearchDateTo} onChange={(e) => setDealSearchDateTo(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white" />
                      {(dealSearchDateFrom || dealSearchDateTo) && (
                        <button type="button" onClick={() => { setDealSearchDateFrom(''); setDealSearchDateTo('') }} className="text-xs text-slate-500 hover:text-red-500">クリア</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 overflow-auto flex-1">
              {dealSearchResults.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{dealSearchResults.length}件の案件が見つかりました</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">顧客名</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">案件名</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">担当者</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">店舗</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">反響日</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">区分</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-700">エリア</th>
                          <th className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealSearchResults.map(d => (
                          <tr key={String(d.id)} className="hover:bg-slate-50">
                            <td className="px-2 py-1.5 border border-slate-200">{String(d.customer_name || '-')}</td>
                            <td className="px-2 py-1.5 border border-slate-200 max-w-[300px]" style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{String(d.name || '-')}</td>
                            <td className="px-2 py-1.5 border border-slate-200">{cleanStaff(d.staff_name)}</td>
                            <td className="px-2 py-1.5 border border-slate-200">{String(d.store_name || '-')}</td>
                            <td className="px-2 py-1.5 border border-slate-200">{typeof d.inquiry_date === 'string' ? d.inquiry_date.replace(/-/g, '/') : '-'}</td>
                            <td className="px-2 py-1.5 border border-slate-200">{String(d.deal_category || '-')}</td>
                            <td className="px-2 py-1.5 border border-slate-200">{String(d.label_area || '-')}</td>
                            <td className="px-2 py-1.5 border border-slate-200 text-center">
                              <button type="button" onClick={() => startFollowup(String(d.id))} className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">追客開始</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {dealSearchResults.length === 0 && dealSearchDone && !dealSearching && (
                <p className="text-sm text-slate-400 text-center py-4">該当する案件が見つかりません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
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
