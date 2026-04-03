import React, { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Plus, Trash2, Loader2, Search, X, Link2, ExternalLink, Building2, Upload, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import StaffSelector from '../common/StaffSelector'

class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-600 font-bold mb-2">エラーが発生しました</p>
          <p className="text-sm text-slate-600 mb-4">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="px-4 py-2 bg-blue-600 text-white rounded text-sm cursor-pointer">再試行</button>
        </div>
      )
    }
    return this.props.children
  }
}

function Tip({ text, children }: { text: string | null | undefined; children: ReactNode }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  if (!text) return <>{children}</>
  return (
    <span className="relative"
      onMouseEnter={(e) => { setPos({ x: e.clientX, y: e.clientY }); setShow(true) }}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="fixed z-[100] px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg max-w-xs whitespace-pre-wrap pointer-events-none"
          style={{ left: pos.x + 8, top: pos.y - 28 }}>
          {text}
        </span>
      )}
    </span>
  )
}

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
  reservation: string | null
  business_type: string
}

interface CustomerResult {
  andpad_id: string
  name: string
  name_kana: string | null
  address: string | null
  phone1: string | null
}

const EMPTY_FORM = {
  visit_date: new Date().toISOString().slice(0, 10),
  model_house_type: '',
  customer_name: '',
  reservation: '',
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


const MODEL_HOUSE_OPTIONS = ['上田グランミュゼ', '長野グランシフ', '松本グランニュクス', '伊那グランメティス', '松本LIFITモデル', '長野LIFITモデル', '塩尻ショールーム', '松本ショールーム']

const MODEL_HOUSE_SHORT: Record<string, string> = {
  '上田グランミュゼ': '上田G-Muse',
  '長野グランシフ': '長野G-Schiff',
  '松本グランニュクス': '松本G-Nyx',
  '伊那グランメティス': '伊那G-Metis',
  '松本LIFITモデル': '松本Lifit',
  '長野LIFITモデル': '長野Lifit',
  '塩尻ショールーム': '塩尻SR',
  '松本ショールーム': '松本SR',
}

const TABLE_COLUMNS: { key: string; label: string; width: string }[] = [
  { key: 'model_house_type', label: '来場場所', width: '9%' },
  { key: 'visit_date', label: '来場日', width: '7%' },
  { key: 'customer_name', label: 'お客様氏名', width: '7%' },
  { key: 'reservation', label: '予約', width: '5%' },
  { key: 'customer_type', label: '来場区分', width: '8%' },
  { key: 'andpad_guess', label: 'ANDPAD', width: '7%' },
  { key: 'visit_trigger', label: '来場きっかけ', width: '7%' },
  { key: 'last_visit_date', label: '前回来場日', width: '7%' },
  { key: 'staff1', label: '対応者', width: '6%' },
  { key: 'has_appointment', label: '次アポ', width: '4%' },
  { key: 'appointment_content', label: '次アポ内容', width: '9%' },
  { key: 'notes', label: '備考', width: '15%' },
]

// ANDPAD顧客検索コンポーネント
function CustomerSearch({ onSelect, onClear, selected }: {
  onSelect: (d: CustomerResult) => void
  onClear: () => void
  selected: CustomerResult | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerResult[]>([])
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
      .select('andpad_id,name,name_kana,address,phone1')
      .or(`name.ilike.%${q}%,name_kana.ilike.%${q}%,andpad_id.ilike.%${q}%`)
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
        <span className="font-medium text-blue-700 truncate">{selected.name}</span>
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
          placeholder="顧客名・かな・IDで検索..."
          className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {searching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-400" />}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {results.map((d) => (
            <button
              key={d.andpad_id}
              type="button"
              onClick={() => { onSelect(d); setQuery(''); setShowResults(false) }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0 cursor-pointer"
            >
              <span className="font-medium text-slate-800">{d.name}</span>
              {d.name_kana && <span className="text-slate-400 ml-2">{d.name_kana}</span>}
              {d.address && <span className="text-slate-400 ml-2">{d.address}</span>}
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

interface VisitStats {
  trigger: string | null
  visitNumber: number // この来場が何回目か
  prevVisitDate: string | null // 前回の来場日（初回ならnull）
}

// インライン編集可能な行
function VisitRow({ visit, onEdit, stats }: { visit: Visit; onEdit: () => void; stats: VisitStats | null }) {
  const cellClass = "px-2 py-1 border border-slate-200 text-xs text-slate-700 truncate"
  const mhName = visit.model_house_type || '-'
  const triggerText = stats?.trigger?.replace(/^\d{1,3}\s+/, '') || '-'
  const visitInfo = stats ? (stats.visitNumber === 1 ? '初回' : `${stats.prevVisitDate?.replace(/-/g, '/')} (${stats.visitNumber}回目)`) : '-'

  return (
    <tr className="hover:bg-slate-50 cursor-pointer" onDoubleClick={onEdit}>
      <td className={cellClass}><Tip text={mhName}>{mhName}</Tip></td>
      <td className={cellClass}>{visit.visit_date?.replace(/-/g, '/') || '-'}</td>
      <td className={cellClass}><Tip text={visit.customer_name}>{visit.customer_name || '-'}</Tip></td>
      <td className={cellClass}>{visit.reservation || '-'}</td>
      <td className={cellClass}>{visit.customer_type || '-'}</td>
      <td className={cellClass}>
        {visit.customer_andpad_id ? (
          <a href={`https://andpad.jp/manager/my/customers/${visit.customer_andpad_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
            <ExternalLink className="w-3 h-3" />ANDPAD
          </a>
        ) : '-'}
      </td>
      <td className={cellClass}><Tip text={triggerText}>{triggerText}</Tip></td>
      <td className={cellClass}><Tip text={visitInfo}>{visitInfo}</Tip></td>
      <td className={cellClass}><Tip text={visit.staff1}>{visit.staff1 || '-'}</Tip></td>
      <td className={cellClass}>{visit.has_appointment || '-'}</td>
      <td className={cellClass}><Tip text={visit.appointment_content}>{visit.appointment_content || '-'}</Tip></td>
      <td className={cellClass}><Tip text={visit.notes}>{visit.notes || '-'}</Tip></td>
      <td className="px-1 py-1 border border-slate-200 text-center whitespace-nowrap">
        <button type="button" onClick={onEdit} className="text-slate-400 hover:text-blue-600 cursor-pointer" title="編集"><Pencil className="w-3.5 h-3.5 inline" /></button>
      </td>
    </tr>
  )
}

export default function ModelHouseVisitPage() {
  const { snYear, fiscalFrom, fiscalTo } = useFiscalYear()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedDeal, setSelectedDeal] = useState<CustomerResult | null>(null)
  const [visitType, setVisitType] = useState<'new' | 'return'>('new')
  const [headerModelHouse, setHeaderModelHouse] = useState('伊那グランメティス')
  const [visitStatsMap, setVisitStatsMap] = useState<Record<string, VisitStats>>({})
  const [dateFrom, setDateFrom] = useState(fiscalFrom)
  const [dateTo, setDateTo] = useState(fiscalTo)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  // 全visitsからユニークな対応者名（StaffSelector用）
  const allStaffNames = useMemo(() => {
    const set = new Set<string>()
    for (const v of visits) { if (v.staff1?.trim()) set.add(v.staff1.trim()) }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [visits])

  const [editVisit, setEditVisit] = useState<Visit | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | null>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [importText, setImportText] = useState('')
  const [importModelHouse, setImportModelHouse] = useState('')

  interface ImportJob { id: number; modelHouse: string; status: string; success: number; matched: number; errors: string[]; done: boolean }
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const jobIdRef = useRef(0)

  // A3-1: モデルハウス来場数（今期・前期）
  const [a31CurrentVisits, setA31CurrentVisits] = useState<Visit[]>([])
  const [a31PrevVisits, setA31PrevVisits] = useState<Visit[]>([])
  const [a31PrevOpen, setA31PrevOpen] = useState(false)
  useEffect(() => {
    const curFrom = `${snYear - 1}-09-01`, curTo = `${snYear}-08-31`
    const prevFrom = `${snYear - 2}-09-01`, prevTo = `${snYear - 1}-08-31`
    supabase.from('model_house_visits').select('visit_date,model_house_type,customer_type')
      .gte('visit_date', curFrom).lte('visit_date', curTo).limit(5000)
      .then(({ data }) => { if (data) setA31CurrentVisits(data as Visit[]) })
    supabase.from('model_house_visits').select('visit_date,model_house_type,customer_type')
      .gte('visit_date', prevFrom).lte('visit_date', prevTo).limit(5000)
      .then(({ data }) => { if (data) setA31PrevVisits(data as Visit[]) })
  }, [snYear])

  type A31Summary = { months: string[]; modelHouses: string[]; map: Map<string, Record<string, { newCount: number; otherCount: number }>> }
  const buildA31 = (visits: Visit[], sn: number): A31Summary => {
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      const m = ((8 + i) % 12) + 1
      const y = m >= 9 ? sn - 1 : sn
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
    const mhSet = new Set<string>()
    for (const v of visits) { if (v.model_house_type) mhSet.add(v.model_house_type) }
    const modelHouses = MODEL_HOUSE_OPTIONS.filter(m => mhSet.has(m))
    const map = new Map<string, Record<string, { newCount: number; otherCount: number }>>()
    for (const v of visits) {
      const ym = v.visit_date?.slice(0, 7)
      const mh = v.model_house_type
      if (!ym || !mh || !months.includes(ym)) continue
      if (!map.has(mh)) map.set(mh, {})
      const row = map.get(mh)!
      if (!row[ym]) row[ym] = { newCount: 0, otherCount: 0 }
      if (v.customer_type?.includes('新規')) row[ym].newCount++
      else row[ym].otherCount++
    }
    return { months, modelHouses, map }
  }
  const a31Current = useMemo(() => buildA31(a31CurrentVisits, snYear), [a31CurrentVisits, snYear])
  const a31Prev = useMemo(() => buildA31(a31PrevVisits, snYear - 1), [a31PrevVisits, snYear])

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('model_house_visits')
      .select('*')
    if (headerModelHouse) query = query.eq('model_house_type', headerModelHouse)
    if (dateFrom) query = query.gte('visit_date', dateFrom)
    if (dateTo) query = query.lte('visit_date', dateTo)
    const { data } = await query.order('visit_date', { ascending: false }).limit(500)
    if (data) setVisits(data)
    setLoading(false)
  }, [headerModelHouse, dateFrom, dateTo])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  const updateJob = useCallback((id: number, patch: Partial<ImportJob>) => {
    setImportJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }, [])

  const runImportJob = useCallback(async (jobId: number, text: string, modelHouse: string) => {
    try {
    // 引用符内の改行を処理してから行分割
    const rawLines: string[] = []
    let current = ''
    let inQuote = false
    for (const ch of text) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === '\n' && !inQuote) { rawLines.push(current); current = ''; continue }
      if (ch === '\r') continue
      current += ch
    }
    if (current.trim()) rawLines.push(current)
    const lines = rawLines.filter(l => l.trim())
    console.log('[Import] Total lines after quote-aware split:', lines.length)
    if (lines.length > 0) {
      console.log('[Import] First line (header?):', lines[0].substring(0, 200))
      const firstCols = lines[0].split('\t')
      console.log('[Import] First line column count:', firstCols.length)
      console.log('[Import] First 5 columns:', firstCols.slice(0, 5))
    }
    if (lines.length > 1) {
      console.log('[Import] Second line (first data?):', lines[1].substring(0, 200))
    }
    const errors: string[] = []
    const records: Record<string, unknown>[] = []

    // ヘッダー行自動検出＆カラムマッピング
    const HEADER_MAP: Record<string, string> = {
      '来場日': 'visit_date', '氏名': 'customer_name', '顧客区分': 'customer_type',
      '検討内容': 'consideration', '土地有無': 'has_land', 'ご計画': 'plan',
      '備考': 'notes', '備考欄': 'notes', '備考欄（メモ）': 'notes',
      'アポ': 'has_appointment', 'アポ内容': 'appointment_content',
      '次回アポ': 'has_appointment', '次アポ': 'has_appointment',
      'アポ打診内容': 'appointment_content', '次アポ内容': 'appointment_content',
      '対応者': 'staff1', '対応者1': 'staff1', '対応者2': 'staff2',
      '引継ぎ担当者': 'transfer_staff', '引継担当者': 'transfer_staff', '引き継ぎ': 'transfer_staff',
      '予約有無': 'reservation', '予約': 'reservation',
    }

    let colMap: Record<string, number> = {}
    let startIdx = 0
    const firstLine = lines[0]?.split('\t') || []
    const hasHeader = !(/^\d{4}[\/\-]/.test(firstLine[0]?.trim() || ''))
    if (hasHeader) {
      startIdx = 1
      firstLine.forEach((h, idx) => {
        const clean = h.replace(/[\s"]/g, '').trim()
        for (const [pattern, field] of Object.entries(HEADER_MAP)) {
          if (clean === pattern.replace(/[\s"]/g, '') || clean.includes(pattern.replace(/[\s"]/g, ''))) {
            if (!colMap[field]) colMap[field] = idx
          }
        }
      })
    }
    // ヘッダーなしの場合はデフォルト位置
    if (Object.keys(colMap).length === 0) {
      colMap = { visit_date: 0, customer_name: 1, customer_type: 2, consideration: 3, has_land: 4, plan: 5, notes: 12, has_appointment: 13, appointment_content: 14, staff1: 15, transfer_staff: 16, staff2: 17 }
      console.log('[Import] No header detected, using defaults')
    }
    console.log('[Import] hasHeader:', hasHeader, 'startIdx:', startIdx)
    console.log('[Import] colMap:', JSON.stringify(colMap))
    console.log('[Import] Data lines to process:', lines.length - startIdx)

    const col = (field: string, cols: string[]) => { const idx = colMap[field]; return idx !== undefined ? cols[idx]?.trim() || null : null }

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split('\t')
      const dateRaw = col('visit_date', cols)
      if (!dateRaw) continue
      const dateMatch = dateRaw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
      if (!dateMatch) continue
      const visitDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      const customerNameRaw = col('customer_name', cols)
      if (!customerNameRaw) continue
      const customerName = customerNameRaw.replace(/\s*様\s*$/, '').trim()
      if (!customerName) continue
      const consideration = col('consideration', cols)
      const rawType = col('customer_type', cols)
      const appo = col('has_appointment', cols)
      let customerType: string | null = null
      const isNew = rawType === '新規' || rawType === '白客'
      const isReturn = rawType === '既存' || rawType === '既契約' || rawType === 'OB' || rawType === '商談中' || rawType === '他決'
      const isReform = /リフォーム|リノベ/.test(consideration || '')
      const isNewBuild = /新築/.test(consideration || '')
      const isNoPlan = /白客|イベント|見学のみ|他決|業者/.test(consideration || '') || /白客|イベント目的/.test(rawType || '') || (!isReform && !isNewBuild && !rawType)
      if (isNoPlan) customerType = '計画なし'
      else if (isReform && isNew) customerType = 'リフォーム新規'
      else if (isReform && isReturn) customerType = 'リフォーム再来'
      else if (isNew) customerType = '新築新規'
      else if (isReturn) customerType = '新築再来'
      else customerType = rawType
      records.push({
        visit_date: visitDate, customer_name: customerName, customer_type: customerType,
        consideration, has_land: col('has_land', cols), plan: col('plan', cols), notes: col('notes', cols),
        has_appointment: appo === '◎' ? '有' : appo ? '無' : null,
        appointment_content: col('appointment_content', cols), staff1: col('staff1', cols),
        transfer_staff: col('transfer_staff', cols), staff2: col('staff2', cols),
        model_house_type: modelHouse, business_type: '新築',
      })
    }

    console.log('[Import] Records parsed:', records.length)
    if (records.length > 0) console.log('[Import] First record:', JSON.stringify(records[0]))
    if (records.length === 0) console.log('[Import] WARNING: 0 records parsed! Check header mapping and data format.')

    // Step 1: INSERT
    let success = 0
    const totalBatches = Math.ceil(records.length / 100)
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100)
      const batchNum = Math.floor(i / 100) + 1
      updateJob(jobId, { status: `インポート ${batchNum}/${totalBatches} (${Math.min(i + 100, records.length)}/${records.length}件)` })
      const { error, status, statusText } = await supabase.from('model_house_visits').upsert(batch, { onConflict: 'model_house_type,visit_date,customer_name', ignoreDuplicates: false })
      console.log(`[Import] Batch ${batchNum}/${totalBatches}: status=${status} ${statusText}`, error ? `ERROR: ${error.message}` : 'OK')
      if (error) {
        console.error('[Import] Batch error detail:', error)
        errors.push(`行${i + 1}〜${i + batch.length}: ${error.message}`)
      } else {
        success += batch.length
      }
    }
    updateJob(jobId, { success })

    // Step 2: ANDPAD顧客マッチング
    const uniqueNames = [...new Set(records.map(r => r.customer_name as string).filter(Boolean))]
    const andpadMap = new Map<string, string>()
    for (let i = 0; i < uniqueNames.length; i++) {
      updateJob(jobId, { status: `ANDPADマッチング ${i + 1}/${uniqueNames.length}名` })
      const { data } = await supabase.from('customers').select('andpad_id,name').eq('name', uniqueNames[i]).limit(2)
      if (data && data.length === 1 && data[0].andpad_id) andpadMap.set(uniqueNames[i], data[0].andpad_id)
    }

    // Step 3: UPDATE
    let matchCount = 0
    const matchedNames = [...andpadMap.keys()]
    for (let i = 0; i < matchedNames.length; i++) {
      updateJob(jobId, { status: `ANDPAD割り当て ${i + 1}/${matchedNames.length}名` })
      const { data } = await supabase.from('model_house_visits')
        .update({ customer_andpad_id: andpadMap.get(matchedNames[i])! })
        .eq('customer_name', matchedNames[i]).is('customer_andpad_id', null).select('id')
      if (data) matchCount += data.length
    }

    updateJob(jobId, { status: '完了', matched: matchCount, errors, done: true })
    fetchVisits()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      updateJob(jobId, { status: `エラー: ${msg}`, errors: [msg], done: true })
    }
  }, [fetchVisits, updateJob])

  const handleImport = useCallback(() => {
    if (!importText.trim() || !importModelHouse) return
    const id = ++jobIdRef.current
    const job: ImportJob = { id, modelHouse: importModelHouse, status: '開始中...', success: 0, matched: 0, errors: [], done: false }
    setImportJobs(prev => [...prev, job])
    setShowImportModal(false)
    setImportText('')
    runImportJob(id, importText, importModelHouse)
  }, [importText, importModelHouse, runImportJob])

  // 来場きっかけ・来場回数・最終来場日を計算
  useEffect(() => {
    if (visits.length === 0) return
    ;(async () => {
      try {
      const statsMap: Record<string, VisitStats> = {}

      // 顧客名ごとの来場日リスト（昇順）を作成
      const nameVisitsMap = new Map<string, string[]>()
      for (const v of visits) {
        const name = v.customer_name?.trim()
        if (!name || !v.visit_date) continue
        const list = nameVisitsMap.get(name) || []
        list.push(v.visit_date)
        nameVisitsMap.set(name, list)
      }
      for (const [, dates] of nameVisitsMap) {
        dates.sort()
      }

      // customer_andpad_idがある来場の来場きっかけをdealsから取得
      const andpadIds = [...new Set(visits.map(v => v.customer_andpad_id).filter((id): id is string => !!id))]
      const triggerMap = new Map<string, string>()
      if (andpadIds.length > 0) {
        for (let i = 0; i < andpadIds.length; i += 200) {
          const chunk = andpadIds.slice(i, i + 200)
          const { data } = await supabase.from('deals')
            .select('customer_andpad_id,response_category_detail,inquiry_date')
            .in('customer_andpad_id', chunk)
            .order('inquiry_date', { ascending: true })
          if (data) {
            for (const d of data) {
              if (d.customer_andpad_id && d.response_category_detail && !triggerMap.has(d.customer_andpad_id)) {
                triggerMap.set(d.customer_andpad_id, d.response_category_detail)
              }
            }
          }
        }
      }

      for (const v of visits) {
        const name = v.customer_name?.trim()
        const dates = name ? nameVisitsMap.get(name) : null
        let visitNumber = 1
        let prevVisitDate: string | null = null
        if (dates && v.visit_date) {
          // この来場日以前の来場をカウント（同日含む）
          const idx = dates.indexOf(v.visit_date)
          visitNumber = idx >= 0 ? idx + 1 : 1
          if (idx > 0) prevVisitDate = dates[idx - 1]
        }
        statsMap[v.id] = {
          trigger: v.customer_andpad_id ? (triggerMap.get(v.customer_andpad_id) || null) : null,
          visitNumber,
          prevVisitDate,
        }
      }
      setVisitStatsMap(statsMap)
      } catch (e) {
        console.error('Stats calculation error:', e)
      }
    })()
  }, [visits])

  const handleDealSelect = (d: CustomerResult) => {
    setSelectedDeal(d)
    setVisitType('return')
    setForm((prev) => ({
      ...prev,
      customer_name: d.name,
      customer_type: '再来',
    }))
  }

  const handleDealClear = () => {
    setSelectedDeal(null)
    setForm((prev) => ({ ...prev, customer_name: '', customer_type: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    setSaving(true)
    const row: Record<string, unknown> = { ...form, business_type: '新築' }
    if (selectedDeal) row.customer_andpad_id = selectedDeal.andpad_id
    // 空文字をnullに変換
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.trim() === '') row[k] = null
    }
    await supabase.from('model_house_visits').insert(row)
    setForm({ ...EMPTY_FORM, model_house_type: headerModelHouse })
    setSelectedDeal(null)
    setVisitType('new')
    setSaving(false)
    setShowAddModal(false)
    fetchVisits()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return
    await supabase.from('model_house_visits').delete().eq('id', id)
    fetchVisits()
  }

  const openEditModal = (v: Visit) => {
    setEditVisit(v)
    setEditForm({
      model_house_type: v.model_house_type || '',
      visit_date: v.visit_date || '',
      customer_name: v.customer_name || '',
      reservation: v.reservation || '',
      customer_type: v.customer_type || '',
      staff1: v.staff1 || '',
      has_appointment: v.has_appointment || '',
      appointment_content: v.appointment_content || '',
      notes: v.notes || '',
    })
  }

  const handleEditSave = async () => {
    if (!editVisit) return
    setEditSaving(true)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      clean[k] = typeof v === 'string' && v.trim() === '' ? null : v
    }
    await supabase.from('model_house_visits').update(clean).eq('id', editVisit.id)
    setEditVisit(null)
    setEditSaving(false)
    fetchVisits()
  }

  const tableRef = useRef<HTMLTableElement>(null)

  const moveFocus = useCallback((currentRow: number, currentCol: number, dRow: number, dCol: number) => {
    if (!tableRef.current) return
    const nextRow = currentRow + dRow
    const nextCol = currentCol + dCol
    const el = tableRef.current.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`)
    if (el) {
      el.focus()
    } else if (dCol !== 0) {
      // 列端に達したら次/前の行の先頭/末尾へ
      const wrapCol = dCol > 0 ? 0 : TABLE_COLUMNS.length - 1
      const wrapEl = tableRef.current.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${wrapCol}"]`)
      if (wrapEl) wrapEl.focus()
    }
  }, [])

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      moveFocus(row, col, 0, e.shiftKey ? -1 : 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveFocus(row, col, 1, 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveFocus(row, col, -1, 0)
    } else if (e.key === 'ArrowRight' && e.currentTarget instanceof HTMLSelectElement) {
      // selectはArrowRight/Leftで値変更するのでスキップ
    } else if (e.key === 'ArrowLeft' && e.currentTarget instanceof HTMLSelectElement) {
      // 同上
    } else if (e.key === 'ArrowRight') {
      const target = e.currentTarget as HTMLInputElement
      if (target.selectionStart === target.value.length) {
        e.preventDefault()
        moveFocus(row, col, 0, 1)
      }
    } else if (e.key === 'ArrowLeft') {
      const target = e.currentTarget as HTMLInputElement
      if (target.selectionStart === 0) {
        e.preventDefault()
        moveFocus(row, col, 0, -1)
      }
    }
  }, [moveFocus])


  return (
    <ErrorBoundary>
    <div>
      <div className="bg-white rounded-xl border border-slate-200">
        {/* 1段目: タイトル */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <LayoutDashboard className="w-5 h-5" />A3
            </span>
            モデルハウス
          </h1>
        </div>
        {/* 2段目: フィルター */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 flex-wrap">
          {/* モデルハウス */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={headerModelHouse}
              onChange={(e) => { setHeaderModelHouse(e.target.value); setForm((prev) => ({ ...prev, model_house_type: e.target.value })) }}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">全モデルハウス</option>
              {MODEL_HOUSE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="border-l border-slate-200 h-6" />
          {/* 日程 */}
          <div className="flex items-center gap-1.5">
            {[
              { label: '今月', getRange: () => { const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0'); return { from: `${y}-${m}-01`, to: `${y}-${m}-${new Date(y, now.getMonth() + 1, 0).getDate()}` } } },
              { label: '3ヶ月', getRange: () => { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const from = new Date(y, m - 2, 1); return { from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}` } } },
              { label: '今期', getRange: () => ({ from: fiscalFrom, to: fiscalTo }) },
            ].map((preset) => {
              const range = preset.getRange()
              const isActive = dateFrom === range.from && dateTo === range.to
              return (
                <button key={preset.label} onClick={() => { setDateFrom(range.from); setDateTo(range.to) }}
                  className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${isActive ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                  {preset.label}
                </button>
              )
            })}
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white" />
            <span className="text-slate-400 text-xs">〜</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <div className="border-l border-slate-200 h-6" />
          {/* 新規/再来 */}
          <div className="flex items-center gap-1.5">
            {(['new', 'return'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setVisitType(t)
                  setForm((prev) => ({ ...prev, customer_type: t === 'new' ? '新規' : '再来', model_house_type: headerModelHouse }))
                  if (t === 'new') { setSelectedDeal(null) }
                }}
                className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                  visitType === t
                    ? t === 'new' ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t === 'new' ? '新規来場' : '再来場'}
              </button>
            ))}
          </div>
        </div>
        {/* 3段目: 件数表示 + インポート */}
        <div className="flex items-center gap-5 px-4 py-2 text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-400">来場記録</span>
            <span className="text-lg font-bold text-slate-900">{visits.length.toLocaleString()}</span>
            <span className="text-slate-400">件</span>
          </div>
          <button onClick={() => { setShowImportModal(true); setImportText('') }}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />来場者インポート
          </button>
        </div>
        {/* バックグラウンドジョブ進捗 */}
        {importJobs.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 space-y-1">
            {importJobs.map((job) => (
              <div key={job.id} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${job.done ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                {!job.done && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
                <span className="font-medium">{job.modelHouse}</span>
                <span>{job.status}</span>
                {job.done && <span>— {job.success}件登録{job.matched > 0 ? `（${job.matched}件ANDPADマッチ）` : ''}</span>}
                {job.done && <button onClick={() => setImportJobs(prev => prev.filter(j => j.id !== job.id))} className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-3 h-3" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* インポートモーダル */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">来場者データインポート</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer px-2">×</button>
            </div>
            <div className="p-5 space-y-4 overflow-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">モデルハウス（必須）</label>
                <select value={importModelHouse} onChange={(e) => setImportModelHouse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">選択してください</option>
                  {MODEL_HOUSE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  TSVデータ（スプレッドシートからコピー＆ペースト）
                </label>
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
                  placeholder={"来場日\\t氏名\\t顧客区分\\t検討内容\\t土地有無\\tご計画\\t...\\n2020/01/11\\tつかだ 様\\t新規\\t白客\\t..."}
                  className="w-full h-48 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono resize-y" />
                <p className="text-[10px] text-slate-400 mt-1">列順: 来場日, 氏名, 顧客区分, 検討内容, 土地有無, ご計画, (エリア), (現住所), (職業), (年収), (媒体), (きっかけ), 備考, アポ(◎), アポ内容, 対応者1, 引継ぎ, 対応者2</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">キャンセル</button>
              <button onClick={handleImport} disabled={!importText.trim() || !importModelHouse}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-medium">
                <Upload className="w-4 h-4 inline mr-1" />バックグラウンドで開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">来場者を追加</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場場所</label>
                <div className="flex flex-wrap gap-1.5">
                  {MODEL_HOUSE_OPTIONS.map(m => (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, model_house_type: m }))} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${form.model_house_type === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">来場日</label>
                  <input type="date" value={form.visit_date} onChange={(e) => setForm(f => ({ ...f, visit_date: e.target.value }))} className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">予約</label>
                  <div className="flex gap-1.5">
                    {['予約あり', '予約なし'].map(o => (
                      <button key={o} type="button" onClick={() => setForm(f => ({ ...f, reservation: f.reservation === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.reservation === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">お客様氏名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="例: 山田 太郎" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <StaffSelector category={form.model_house_type} value={form.staff1} onChange={(name) => setForm(f => ({ ...f, staff1: name }))} allStaffNames={allStaffNames} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ</label>
                <div className="flex gap-1.5">
                  {['有', '無'].map(o => (
                    <button key={o} type="button" onClick={() => setForm(f => ({ ...f, has_appointment: f.has_appointment === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.has_appointment === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場区分</label>
                <div className="flex flex-wrap gap-1.5">
                  {['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし'].map(o => (
                    <button key={o} type="button" onClick={() => setForm(f => ({ ...f, customer_type: f.customer_type === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${form.customer_type === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ内容</label>
                  <input type="text" value={form.appointment_content} onChange={(e) => setForm(f => ({ ...f, appointment_content: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">備考</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">キャンセル</button>
                <button type="submit" disabled={saving || !form.customer_name.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditVisit(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">来場記録を編集</h3>
              <button onClick={() => setEditVisit(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場場所</label>
                <div className="flex flex-wrap gap-1.5">
                  {MODEL_HOUSE_OPTIONS.map(m => (
                    <button key={m} type="button" onClick={() => setEditForm(f => ({ ...f, model_house_type: m }))} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${editForm.model_house_type === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">来場日</label>
                  <input type="date" value={editForm.visit_date || ''} onChange={(e) => setEditForm(f => ({ ...f, visit_date: e.target.value }))} className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">予約</label>
                  <div className="flex gap-1.5">
                    {['予約あり', '予約なし'].map(o => (
                      <button key={o} type="button" onClick={() => setEditForm(f => ({ ...f, reservation: f.reservation === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editForm.reservation === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">お客様氏名</label>
                <input type="text" value={editForm.customer_name || ''} onChange={(e) => setEditForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <StaffSelector category={editForm.model_house_type || ''} value={editForm.staff1 || ''} onChange={(name) => setEditForm(f => ({ ...f, staff1: name }))} allStaffNames={allStaffNames} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ</label>
                <div className="flex gap-1.5">
                  {['有', '無'].map(o => (
                    <button key={o} type="button" onClick={() => setEditForm(f => ({ ...f, has_appointment: f.has_appointment === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editForm.has_appointment === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場区分</label>
                <div className="flex flex-wrap gap-1.5">
                  {['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし'].map(o => (
                    <button key={o} type="button" onClick={() => setEditForm(f => ({ ...f, customer_type: f.customer_type === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editForm.customer_type === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ内容</label>
                  <input type="text" value={editForm.appointment_content || ''} onChange={(e) => setEditForm(f => ({ ...f, appointment_content: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">備考</label>
                  <input type="text" value={editForm.notes || ''} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { if (editVisit && confirm('この記録を削除しますか？')) { handleDelete(editVisit.id); setEditVisit(null) } }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />削除
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditVisit(null)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">キャンセル</button>
                  <button type="button" onClick={handleEditSave} disabled={editSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A3-1: モデルハウス来場数 */}
      <div className="bg-white rounded-xl border border-slate-200 mt-4 p-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A3 - <span className="text-xl">1</span></span>
          モデルハウス来場数
          <span className="text-xs text-slate-500 font-normal ml-2">新規 / それ以外</span>
        </h2>
        {[
          { label: `${snYear}sn（今期）`, labelClass: 'text-blue-700 bg-blue-50 border-blue-200', data: a31Current, isCollapsible: false, open: true, setOpen: undefined as unknown as (v: boolean) => void },
          { label: `${snYear - 1}sn（前期）`, labelClass: 'text-slate-600 bg-slate-50 border-slate-300', data: a31Prev, isCollapsible: true, open: a31PrevOpen, setOpen: setA31PrevOpen },
        ].map(({ label, labelClass, data, isCollapsible, open, setOpen }) => (
          <div key={label} className="mb-4">
            {isCollapsible ? (
              <button onClick={() => setOpen(!open)} className={`text-sm font-bold border rounded px-3 py-1.5 mt-8 mb-2 flex items-center gap-1.5 cursor-pointer select-none w-fit ${labelClass}`}>
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {label}
              </button>
            ) : (
              <h3 className={`text-sm font-bold border rounded px-3 py-1.5 mt-4 mb-2 block w-fit ${labelClass}`}>{label}</h3>
            )}
            {open && data.modelHouses.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-1.5 border border-slate-200 text-left font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-slate-50 z-10">モデルハウス</th>
                      {data.months.map(ym => (
                        <th key={ym} className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {parseInt(ym.slice(0, 4))}年{parseInt(ym.slice(5))}月
                        </th>
                      ))}
                      <th className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700 whitespace-nowrap bg-amber-50">合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.modelHouses.map(mh => {
                      const row = data.map.get(mh) || {}
                      let totalNew = 0, totalOther = 0
                      for (const ym of data.months) { const v = row[ym]; if (v) { totalNew += v.newCount; totalOther += v.otherCount } }
                      return (
                        <tr key={mh} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 border border-slate-200 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-white z-10">{mh}</td>
                          {data.months.map(ym => {
                            const v = row[ym] || { newCount: 0, otherCount: 0 }
                            const total = v.newCount + v.otherCount
                            return (
                              <td key={ym} className={`px-2 py-1.5 border border-slate-200 text-center whitespace-nowrap ${total ? '' : 'text-slate-300'}`}>
                                {total ? <><span className="text-blue-600 font-semibold">{v.newCount}</span><span className="text-slate-400"> / </span><span className="text-orange-600 font-semibold">{v.otherCount}</span></> : '-'}
                              </td>
                            )
                          })}
                          <td className="px-2 py-1.5 border border-slate-300 text-center whitespace-nowrap bg-amber-50 font-bold">
                            <span className="text-blue-600">{totalNew}</span><span className="text-slate-400"> / </span><span className="text-orange-600">{totalOther}</span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-100 font-bold">
                      <td className="px-3 py-1.5 border border-slate-300 text-slate-700 sticky left-0 bg-slate-100 z-10">合計</td>
                      {data.months.map(ym => {
                        let n = 0, o = 0
                        for (const mh of data.modelHouses) { const v = (data.map.get(mh) || {})[ym]; if (v) { n += v.newCount; o += v.otherCount } }
                        return (
                          <td key={ym} className="px-2 py-1.5 border border-slate-300 text-center whitespace-nowrap">
                            <span className="text-blue-600">{n}</span><span className="text-slate-400"> / </span><span className="text-orange-600">{o}</span>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 border border-slate-300 text-center whitespace-nowrap bg-amber-50">
                        {(() => { let n = 0, o = 0; for (const mh of data.modelHouses) { const row = data.map.get(mh) || {}; for (const ym of data.months) { const v = row[ym]; if (v) { n += v.newCount; o += v.otherCount } } } return <><span className="text-blue-600">{n}</span><span className="text-slate-400"> / </span><span className="text-orange-600">{o}</span></> })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* A3-2: テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 mt-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A3 - <span className="text-xl">2</span></span>
            モデルハウス来場者一覧
          </h2>
          <button onClick={() => { setForm({ ...EMPTY_FORM, model_house_type: headerModelHouse || MODEL_HOUSE_OPTIONS[0] }); setSelectedDeal(null); setShowAddModal(true) }} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />新規追加
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setHeaderModelHouse('')} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${!headerModelHouse ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>全て</button>
          {MODEL_HOUSE_OPTIONS.map(mh => (
            <button key={mh} onClick={() => setHeaderModelHouse(mh)} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${headerModelHouse === mh ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              {mh}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div>
            <table ref={tableRef} className="w-full text-xs border-collapse table-fixed" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="bg-slate-50">
                  {TABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap" style={{ width: col.width }}>
                      {col.label}
                      {(col.key === 'visit_trigger' || col.key === 'last_visit_date') && (
                        <span className="ml-1 text-[9px] text-teal-600 bg-teal-50 border border-teal-200 rounded px-0.5 py-0 font-normal">自動</span>
                      )}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600" style={{ width: '3%' }}></th>
                </tr>
              </thead>
              <tbody>
                {/* データ行（インライン編集可能） */}
                {visits.length === 0 ? (
                  <tr><td colSpan={TABLE_COLUMNS.length + 1} className="text-center py-8 text-slate-400 border border-slate-200">データがありません</td></tr>
                ) : visits.map((v) => (
                  <VisitRow key={v.id} visit={v} onEdit={() => openEditModal(v)} stats={visitStatsMap[v.id] || null} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
