import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Plus, Trash2, Loader2, Search, X, Link2 } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'

interface Visit {
  id: string
  visit_date: string
  model_house_type: string | null
  customer_name: string
  customer_type: string | null
  consideration: string | null
  has_land: string | null
  plan: string | null
  land_area: string | null
  current_address: string | null
  occupation: string | null
  income: string | null
  media: string | null
  migration_trigger: string | null
  notes: string | null
  has_appointment: string | null
  appointment_content: string | null
  staff1: string | null
  transfer_staff: string | null
  staff2: string | null
  customer_andpad_id: string | null
  business_type: string
}

interface Customer {
  andpad_id: string
  name: string
  address: string | null
  phone1: string | null
}

const EMPTY_FORM = {
  visit_date: new Date().toISOString().slice(0, 10),
  model_house_type: '',
  customer_name: '',
  customer_type: '',
  consideration: '',
  has_land: '',
  plan: '',
  land_area: '',
  current_address: '',
  occupation: '',
  income: '',
  media: '',
  migration_trigger: '',
  notes: '',
  has_appointment: '',
  appointment_content: '',
  staff1: '',
  transfer_staff: '',
  staff2: '',
}

const FIELDS: { key: keyof typeof EMPTY_FORM; label: string; type?: 'date' | 'select' | 'textarea'; options?: string[]; wide?: boolean }[] = [
  { key: 'visit_date', label: '来場日', type: 'date' },
  { key: 'model_house_type', label: 'モデルハウス' },
  { key: 'customer_name', label: '氏名' },
  { key: 'customer_type', label: '顧客区分', type: 'select', options: ['新規', '既存', 'OB', 'その他'] },
  { key: 'consideration', label: '検討内容' },
  { key: 'has_land', label: '土地有無', type: 'select', options: ['有', '無', '検討中'] },
  { key: 'plan', label: 'ご計画' },
  { key: 'land_area', label: '土地希望エリア' },
  { key: 'current_address', label: '現住所' },
  { key: 'occupation', label: '職業' },
  { key: 'income', label: '年収' },
  { key: 'media', label: 'サンプロを知った媒体' },
  { key: 'migration_trigger', label: '移住を考え始めたきっかけや時期' },
  { key: 'notes', label: '備考欄（メモ）', type: 'textarea', wide: true },
  { key: 'has_appointment', label: 'アポ', type: 'select', options: ['有', '無'] },
  { key: 'appointment_content', label: 'アポ内容' },
  { key: 'staff1', label: '対応者1' },
  { key: 'transfer_staff', label: '引継ぎ担当者' },
  { key: 'staff2', label: '対応者2' },
]

const TABLE_COLUMNS: { key: keyof Visit; label: string; width?: string }[] = [
  { key: 'visit_date', label: '来場日', width: '90px' },
  { key: 'model_house_type', label: 'モデルハウス', width: '100px' },
  { key: 'customer_name', label: '氏名', width: '80px' },
  { key: 'customer_type', label: '顧客区分', width: '70px' },
  { key: 'consideration', label: '検討内容', width: '100px' },
  { key: 'has_land', label: '土地有無', width: '60px' },
  { key: 'plan', label: 'ご計画', width: '80px' },
  { key: 'land_area', label: '土地希望エリア', width: '100px' },
  { key: 'current_address', label: '現住所', width: '120px' },
  { key: 'occupation', label: '職業', width: '70px' },
  { key: 'income', label: '年収', width: '60px' },
  { key: 'media', label: '知った媒体', width: '100px' },
  { key: 'migration_trigger', label: 'きっかけ・時期', width: '120px' },
  { key: 'notes', label: '備考', width: '150px' },
  { key: 'has_appointment', label: 'アポ', width: '40px' },
  { key: 'appointment_content', label: 'アポ内容', width: '100px' },
  { key: 'staff1', label: '対応者1', width: '70px' },
  { key: 'transfer_staff', label: '引継ぎ', width: '70px' },
  { key: 'staff2', label: '対応者2', width: '70px' },
]

// ANDPAD顧客検索コンポーネント
function CustomerSearch({ onSelect, onClear, selected }: {
  onSelect: (c: Customer) => void
  onClear: () => void
  selected: Customer | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('customers')
      .select('andpad_id,name,address,phone1')
      .or(`name.ilike.%${q}%,name_kana.ilike.%${q}%,phone1.ilike.%${q}%`)
      .limit(10)
    setResults(data || [])
    setSearching(false)
    setShowResults(true)
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 border border-blue-300 bg-blue-50 rounded text-xs">
        <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
        <span className="font-medium text-blue-700">{selected.name}</span>
        <span className="text-blue-400">({selected.andpad_id})</span>
        <button type="button" onClick={onClear} className="ml-auto text-blue-400 hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
          placeholder="顧客名・カナ・電話番号で検索..."
          className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {searching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-400" />}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {results.map((c) => (
            <button
              key={c.andpad_id}
              type="button"
              onClick={() => { onSelect(c); setQuery(''); setShowResults(false) }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0 cursor-pointer"
            >
              <span className="font-medium text-slate-800">{c.name}</span>
              <span className="text-slate-400 ml-2">ID:{c.andpad_id}</span>
              {c.address && <span className="text-slate-400 ml-2">{c.address}</span>}
              {c.phone1 && <span className="text-slate-400 ml-2">{c.phone1}</span>}
            </button>
          ))}
        </div>
      )}
      {showResults && query.length >= 2 && results.length === 0 && !searching && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-400 text-center">
          該当する顧客が見つかりません
        </div>
      )}
    </div>
  )
}

export default function ModelHouseVisitPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [visitType, setVisitType] = useState<'new' | 'return' | null>(null)
  const [headerModelHouse, setHeaderModelHouse] = useState('')

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('model_house_visits')
      .select('*')
      .eq('business_type', businessType)
      .order('visit_date', { ascending: false })
      .limit(200)
    if (data) setVisits(data)
    setLoading(false)
  }, [businessType])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  const handleCustomerSelect = (c: Customer) => {
    setSelectedCustomer(c)
    setVisitType('return')
    setForm((prev) => ({
      ...prev,
      customer_name: c.name,
      current_address: c.address || prev.current_address,
      customer_type: '既存',
    }))
  }

  const handleCustomerClear = () => {
    setSelectedCustomer(null)
    setForm((prev) => ({ ...prev, customer_name: '', current_address: '', customer_type: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    setSaving(true)
    const row: Record<string, unknown> = { ...form, business_type: businessType }
    if (selectedCustomer) row.customer_andpad_id = selectedCustomer.andpad_id
    // 空文字をnullに変換
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.trim() === '') row[k] = null
    }
    await supabase.from('model_house_visits').insert(row)
    setForm({ ...EMPTY_FORM, model_house_type: headerModelHouse })
    setSelectedCustomer(null)
    setVisitType(null)
    setSaving(false)
    fetchVisits()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return
    await supabase.from('model_house_visits').delete().eq('id', id)
    fetchVisits()
  }

  const handleReset = () => {
    setForm({ ...EMPTY_FORM, model_house_type: headerModelHouse })
    setSelectedCustomer(null)
    setVisitType(null)
  }

  const formatDate = (d: string) => {
    if (!d) return '-'
    const parts = d.split('-')
    return `${parts[1]}/${parts[2]}`
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <LayoutDashboard className="w-5 h-5" />A3
            </span>
            モデルハウス
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="text-sm font-semibold px-2 py-0.5 rounded-lg border-0 cursor-pointer text-white"
              style={{ backgroundColor: businessType === '新築' ? '#15803d' : businessType === 'リフォーム' ? '#d97706' : '#1e40af' }}
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt} className="bg-white text-slate-700">{bt}</option>)}
            </select>
          </h1>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">モデルハウス:</label>
            <select
              value={headerModelHouse}
              onChange={(e) => { setHeaderModelHouse(e.target.value); setForm((prev) => ({ ...prev, model_house_type: e.target.value })) }}
              className="px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
            >
              <option value="">選択してください</option>
              {['上田モデルハウス', '長野モデルハウス', '松本モデルハウス', '長野グランシフ', '塩尻ショールーム', '松本ショールーム', '松本LIFITモデルハウス', '長野LIFITモデルハウス'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 入力フォーム（常時表示） */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-blue-500" />
          来場記録の入力
        </h2>

        {/* ステップ1: 新規来場 / 再来場 選択 */}
        {!visitType && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setVisitType('new'); setForm((prev) => ({ ...prev, customer_type: '新規', model_house_type: headerModelHouse })) }}
              className="flex-1 max-w-xs py-6 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 text-center cursor-pointer transition-colors"
            >
              <Plus className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <span className="text-sm font-bold text-blue-700">新規来場</span>
              <p className="text-xs text-blue-400 mt-1">初めてのお客様</p>
            </button>
            <button
              type="button"
              onClick={() => setVisitType('return')}
              className="flex-1 max-w-xs py-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 text-center cursor-pointer transition-colors"
            >
              <Search className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <span className="text-sm font-bold text-emerald-700">再来場</span>
              <p className="text-xs text-emerald-400 mt-1">ANDPADから顧客を検索</p>
            </button>
          </div>
        )}

        {/* ステップ2(再来場): ANDPAD顧客検索 */}
        {visitType === 'return' && !selectedCustomer && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">← 戻る</button>
              <span className="text-xs font-medium text-emerald-600">再来場 — ANDPAD顧客検索</span>
            </div>
            <div className="max-w-md">
              <CustomerSearch
                onSelect={handleCustomerSelect}
                onClear={handleCustomerClear}
                selected={selectedCustomer}
              />
            </div>
          </div>
        )}

        {/* ステップ3: 入力フォーム（新規来場 or 顧客選択後） */}
        {(visitType === 'new' || (visitType === 'return' && selectedCustomer)) && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">← 戻る</button>
              {visitType === 'new' && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">新規来場</span>}
              {visitType === 'return' && selectedCustomer && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">再来場</span>
                  <Link2 className="w-3 h-3 text-blue-500" />
                  <span className="font-medium text-blue-700">{selectedCustomer.name}</span>
                  <span className="text-slate-400">(ID:{selectedCustomer.andpad_id})</span>
                  <button type="button" onClick={handleCustomerClear} className="text-slate-300 hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {FIELDS.map((f) => (
                  <div key={f.key} className={f.wide ? 'col-span-2 md:col-span-4 lg:col-span-6' : ''}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    {f.type === 'date' ? (
                      <input
                        type="date"
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">-</option>
                        {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  disabled={saving || !form.customer_name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  登録
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  リセット
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 一覧表 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">来場記録一覧</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : visits.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="bg-slate-50">
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap" style={{ minWidth: col.width }}>
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    {TABLE_COLUMNS.map((col) => (
                      <td key={col.key} className="px-2 py-1 border border-slate-200 text-slate-700 whitespace-nowrap max-w-[200px] truncate">
                        {col.key === 'visit_date' ? formatDate(v[col.key]) : (v[col.key] || '-')}
                        {col.key === 'customer_name' && v.customer_andpad_id && (
                          <Link2 className="inline w-3 h-3 text-blue-400 ml-1" />
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1 border border-slate-200 text-center">
                      <button onClick={() => handleDelete(v.id)} className="text-slate-300 hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
