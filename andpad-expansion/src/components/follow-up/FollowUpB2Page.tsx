import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { RefreshCw, UserSearch, User } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES, useDepartments } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'

type VisitRow = { staff1: string | null; visit_date: string; has_appointment: string | null; customer_type: string | null; model_house_type: string | null; customer_name: string | null; appointment_content: string | null }

export default function FollowUpB2Page() {
  const { businessType, setBusinessType } = useBusinessType()
  const { snYear: globalSnYear, setSnYear: setGlobalSnYear } = useFiscalYear()
  const snYearOptions = [globalSnYear - 1, globalSnYear, globalSnYear + 1]

  const [staffDepts, setStaffDepts] = useState<{ staff_name: string; department: string; start_date: string; end_date: string | null }[]>([])
  const [visitData, setVisitData] = useState<VisitRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [b1Detail, setB1Detail] = useState<{ title: string; visits: VisitRow[] } | null>(null)
  const [selectedB1_3Staff, setSelectedB1_3Staff] = useState<string>('')

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
              <UserSearch className="w-5 h-5" />B2
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

      {/* B2-1: 担当者別の商談数 */}
      {b1Data.staffList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">B2 - <span className="text-xl">1</span></span>
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
                  {b1Data.months.slice(0, 6).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(5))}月</th>)}
                  <th className="px-1 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50">上期</th>
                  {b1Data.months.slice(6, 12).map(ym => <th key={ym} className="px-1 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">{parseInt(ym.slice(5))}月</th>)}
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

      {/* B2-2: サンキーダイアグラム */}
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
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">B2 - <span className="text-xl">2</span></span>
                来場→アポ転換フロー
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">期間内 {total}件</span>
                <span className="text-emerald-600 font-bold">アポ取得 {totalAppo}件（{Math.round((totalAppo / total) * 100)}%）</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 360 }}>
              {(graph.links || []).map((link, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = linkPath(link as any)
                const orig = sLinks[i]
                return (
                  <path key={i} d={d || ''} fill="none" stroke={orig?.color || '#ccc'} strokeWidth={Math.max((link as { width?: number }).width || 1, 2)} opacity={0.4} />
                )
              })}
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

      {/* B2-3: 担当者別 来場区分別アポイント率 */}
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
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">B2 - <span className="text-xl">3</span></span>
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
