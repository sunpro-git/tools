import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, Target, RefreshCw } from 'lucide-react'
import { useDepartments, BUSINESS_TYPES } from '../../hooks/useDepartments'
import { useBusinessType } from '../../hooks/useBusinessType'
const CATEGORIES = ['受注', '完工'] as const

interface TargetRow {
  id?: string
  sn_year: number
  department: string
  category: string
  month: string
  amount: number
}

function getCurrentFiscalYear(): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 9 ? y + 1 : y
}

function buildMonths(snYear: number): string[] {
  const months: string[] = []
  for (let i = 0; i < 12; i++) {
    const m = ((i + 8) % 12) + 1
    const y = m >= 9 ? snYear - 1 : snYear
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return months
}

function formatMonth(ym: string): string {
  const y = ym.slice(0, 4)
  const m = parseInt(ym.slice(5, 7), 10)
  return `${y}年${m}月`
}

function formatAmount(n: number): string {
  if (n === 0) return ''
  return n.toLocaleString()
}

export default function TargetPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const { deptNames } = useDepartments(businessType)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allRows, setAllRows] = useState<TargetRow[]>([])
  const [snYear, setSnYear] = useState(getCurrentFiscalYear())
  const months = useMemo(() => buildMonths(snYear), [snYear])

  // 編集中の値: key = `${category}-${dept}-${month}`, value = amount
  const [edited, setEdited] = useState<Record<string, number>>({})
  const [dirty, setDirty] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('targets')
      .select('*')
      .eq('sn_year', snYear)
      .eq('business_type', businessType)
      .limit(5000)
    setAllRows((data as TargetRow[]) || [])

    const map: Record<string, number> = {}
    if (data) {
      for (const r of data as TargetRow[]) {
        map[`${r.category}-${r.department}-${r.month}`] = r.amount
      }
    }
    setEdited(map)
    setDirty(false)
    setLoading(false)
  }, [snYear, businessType])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChange = (cat: string, dept: string, month: string, value: string) => {
    const num = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10) || 0
    setEdited((prev) => ({ ...prev, [`${cat}-${dept}-${month}`]: num }))
    setDirty(true)
  }

  const handleYearInput = (cat: string, dept: string, value: string) => {
    const total = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10) || 0
    const perMonth = Math.floor(total / 12)
    const remainder = total - perMonth * 12
    setEdited((prev) => {
      const next = { ...prev }
      months.forEach((ym, i) => {
        next[`${cat}-${dept}-${ym}`] = perMonth + (i < remainder ? 1 : 0)
      })
      return next
    })
    setDirty(true)
  }

  const handleH1Input = (cat: string, dept: string, value: string) => {
    const total = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10) || 0
    const h1Months = months.slice(0, 6)
    const perMonth = Math.floor(total / 6)
    const remainder = total - perMonth * 6
    setEdited((prev) => {
      const next = { ...prev }
      h1Months.forEach((ym, i) => {
        next[`${cat}-${dept}-${ym}`] = perMonth + (i < remainder ? 1 : 0)
      })
      return next
    })
    setDirty(true)
  }

  const handleH2Input = (cat: string, dept: string, value: string) => {
    const total = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10) || 0
    const h2Months = months.slice(6)
    const perMonth = Math.floor(total / 6)
    const remainder = total - perMonth * 6
    setEdited((prev) => {
      const next = { ...prev }
      h2Months.forEach((ym, i) => {
        next[`${cat}-${dept}-${ym}`] = perMonth + (i < remainder ? 1 : 0)
      })
      return next
    })
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)

    const existingMap = new Map<string, string>()
    for (const r of allRows) {
      if (r.id) existingMap.set(`${r.category}-${r.department}-${r.month}`, r.id)
    }

    const upserts: { id?: string; sn_year: number; department: string; category: string; month: string; amount: number; business_type: string }[] = []
    for (const cat of CATEGORIES) {
      for (const dept of deptNames) {
        for (const month of months) {
          const key = `${cat}-${dept}-${month}`
          const amount = edited[key] || 0
          const existingId = existingMap.get(key)
          upserts.push({
            ...(existingId ? { id: existingId } : {}),
            sn_year: snYear,
            department: dept,
            category: cat,
            month,
            amount,
            business_type: businessType,
          })
        }
      }
    }

    // バッチで保存（カテゴリ別）
    for (const cat of CATEGORIES) {
      const catUpserts = upserts.filter((u) => u.category === cat)
      const { error } = await supabase.from('targets').upsert(catUpserts, { onConflict: 'sn_year,department,category,month,business_type' })
      if (error) console.error(`targets upsert error (${cat}):`, error.message)
    }

    setSaving(false)
    setDirty(false)
    fetchData()
  }

  const getVal = (cat: string, dept: string, month: string) => edited[`${cat}-${dept}-${month}`] || 0
  const deptTotal = (cat: string, dept: string) => months.reduce((s, m) => s + getVal(cat, dept, m), 0)
  const deptH1 = (cat: string, dept: string) => months.slice(0, 6).reduce((s, m) => s + getVal(cat, dept, m), 0)
  const deptH2 = (cat: string, dept: string) => months.slice(6).reduce((s, m) => s + getVal(cat, dept, m), 0)
  const monthTotal = (cat: string, month: string) => deptNames.reduce((s, d) => s + getVal(cat, d, month), 0)
  const grandTotal = (cat: string) => deptNames.reduce((s, d) => s + deptTotal(cat, d), 0)
  const grandH1 = (cat: string) => deptNames.reduce((s, d) => s + deptH1(cat, d), 0)
  const grandH2 = (cat: string) => deptNames.reduce((s, d) => s + deptH2(cat, d), 0)

  const yearOptions = [snYear - 1, snYear, snYear + 1]

  const catConfig: Record<string, { label: string; color: string; bgClass: string }> = {
    '受注': { label: '受注目標', color: 'text-red-600', bgClass: 'bg-red-50' },
    '完工': { label: '完工目標', color: 'text-blue-600', bgClass: 'bg-blue-50' },
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            目標管理
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="text-sm font-semibold px-2 py-0.5 rounded-lg border-0 cursor-pointer text-white"
              style={{ backgroundColor: businessType === '新築' ? '#15803d' : businessType === 'リフォーム' ? '#d97706' : '#1e40af' }}
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt} className="bg-white text-slate-700">{bt}</option>)}
            </select>
          </h1>
          <select
            value={snYear}
            onChange={(e) => setSnYear(Number(e.target.value))}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}sn</option>
            ))}
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
            title="再読み込み"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              dirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-xs text-slate-500">読み込み中...</span>
        </div>
      ) : CATEGORIES.map((cat) => {
        const cfg = catConfig[cat]
        return (
        <div key={cat} className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
          <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${cfg.color}`}>
            <span className={`px-2 py-0.5 rounded ${cfg.bgClass} ${cfg.color} text-xs font-bold`}>{cfg.label}</span>
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-2 py-1.5 border border-slate-300 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-100 z-10">課</th>
                {months.map((ym) => (
                  <th key={ym} className="px-2 py-1.5 border border-slate-300 text-center font-semibold text-slate-700 whitespace-nowrap min-w-[90px]">
                    {formatMonth(ym)}
                  </th>
                ))}
                <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap min-w-[90px] bg-yellow-50">上期計</th>
                <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap min-w-[90px] bg-green-50">下期計</th>
                <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap min-w-[90px] bg-amber-50">年計</th>
              </tr>
            </thead>
            <tbody>
              {deptNames.map((dept) => (
                <tr key={dept} className="hover:bg-slate-50">
                  <td className="px-2 py-1 border border-slate-200 font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-white z-10">{dept}</td>
                  {months.map((ym) => (
                    <td key={ym} className="px-0 py-0 border border-slate-200">
                      <input
                        type="text"
                        value={getVal(cat, dept, ym) === 0 ? '' : getVal(cat, dept, ym).toLocaleString()}
                        onChange={(e) => handleChange(cat, dept, ym, e.target.value)}
                        className="w-full px-2 py-1.5 text-right text-xs focus:outline-none focus:bg-blue-50 bg-transparent"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-0 py-0 border border-slate-300 bg-yellow-50">
                    <input
                      type="text"
                      value={deptH1(cat, dept) === 0 ? '' : deptH1(cat, dept).toLocaleString()}
                      onChange={(e) => handleH1Input(cat, dept, e.target.value)}
                      className="w-full px-2 py-1.5 text-right text-xs font-semibold focus:outline-none focus:bg-yellow-100 bg-transparent"
                      placeholder="0"
                      title="上期合計を入力すると6ヶ月に均等分割"
                    />
                  </td>
                  <td className="px-0 py-0 border border-slate-300 bg-green-50">
                    <input
                      type="text"
                      value={deptH2(cat, dept) === 0 ? '' : deptH2(cat, dept).toLocaleString()}
                      onChange={(e) => handleH2Input(cat, dept, e.target.value)}
                      className="w-full px-2 py-1.5 text-right text-xs font-semibold focus:outline-none focus:bg-green-100 bg-transparent"
                      placeholder="0"
                      title="下期合計を入力すると6ヶ月に均等分割"
                    />
                  </td>
                  <td className="px-0 py-0 border border-slate-300 bg-amber-50">
                    <input
                      type="text"
                      value={deptTotal(cat, dept) === 0 ? '' : deptTotal(cat, dept).toLocaleString()}
                      onChange={(e) => handleYearInput(cat, dept, e.target.value)}
                      className="w-full px-2 py-1.5 text-right text-xs font-bold focus:outline-none focus:bg-amber-100 bg-transparent"
                      placeholder="0"
                      title="年間合計を入力すると12ヶ月に均等分割"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-200 font-bold">
                <td className="px-2 py-1.5 border border-slate-300 text-slate-700 whitespace-nowrap sticky left-0 bg-slate-200 z-10">合計</td>
                {months.map((ym) => (
                  <td key={ym} className="px-2 py-1.5 border border-slate-300 text-right text-slate-700 whitespace-nowrap">
                    {formatAmount(monthTotal(cat, ym))}
                  </td>
                ))}
                <td className="px-2 py-1.5 border border-slate-300 text-right text-slate-700 whitespace-nowrap bg-yellow-50">{formatAmount(grandH1(cat))}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-right text-slate-700 whitespace-nowrap bg-green-50">{formatAmount(grandH2(cat))}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-right text-slate-700 whitespace-nowrap bg-amber-50">{formatAmount(grandTotal(cat))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        )
      })}
    </div>
  )
}
