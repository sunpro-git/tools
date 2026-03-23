import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, fetchAll } from '../../lib/supabase'
import type { Event, EventVisitor } from '../../types/database'
import {
  Loader2, Plus, Search, Pencil, Trash2, X, ChevronLeft,
  Users, Target, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown,
  Download,
} from 'lucide-react'

const DIVISIONS = ['建築設計', 'ライフィット', 'リフォーム', '買い', '売り', '分譲']
const EVENT_TYPES = ['お披露目会', '住宅博', 'リフォーム博', '個別相談会', 'リフォームフェスタ', 'その他']
const NAGANO_AREAS: Record<string, string[]> = {
  '北信': ['飯綱町', '飯山市', '小川村', '小布施町', '木島平村', '栄村', '坂城町', '信濃町', '須坂市', '高山村', '千曲市', '中野市', '長野市', '野沢温泉村', '山ノ内町'],
  '東信': ['青木村', '上田市', '軽井沢町', '川上村', '北相木村', '小海町', '小諸市', '佐久市', '佐久穂町', '立科町', '東御市', '長和町', '南相木村', '南牧村', '御代田町'],
  '中信': ['上松町', '朝日村', '安曇野市', '生坂村', '池田町', '王滝村', '大桑村', '大町市', '小谷村', '麻績村', '木祖村', '木曽町', '塩尻市', '筑北村', '白馬村', '松川村', '松本市', '南木曽町', '山形村'],
  '南信': ['阿智村', '阿南町', '飯島町', '飯田市', '伊那市', '売木村', '大鹿村', '岡谷市', '駒ケ根市', '下条村', '下諏訪町', '諏訪市', '喬木村', '高森町', '辰野町', '茅野市', '天竜村', '豊丘村', '中川村', '根羽村', '原村', '平谷村', '富士見町', '松川町', '南箕輪村', '箕輪町', '宮田村', '泰阜村'],
}
const MEDIA_SOURCES = ['Meta広告', '折込チラシ', 'ポスティングチラシ', 'DM', '紹介', '看板・通りすがり', 'HP・WEB', '営業受付', 'その他']

const getDivisionColor = (div: string) => {
  const map: Record<string, string> = {
    '建築設計': 'bg-sky-50 text-sky-800 border-sky-200',
    'ライフィット': 'bg-indigo-50 text-indigo-800 border-indigo-200',
    'リフォーム': 'bg-teal-50 text-teal-800 border-teal-200',
    '買い': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    '売り': 'bg-rose-50 text-rose-800 border-rose-200',
    '分譲': 'bg-amber-50 text-amber-800 border-amber-200',
  }
  return map[div] || 'bg-gray-50 text-gray-800 border-gray-200'
}
const getEventTypeColor = (type: string) => {
  const map: Record<string, string> = {
    'お披露目会': 'bg-pink-50 text-pink-700 border-pink-200',
    '住宅博': 'bg-purple-50 text-purple-700 border-purple-200',
    'リフォーム博': 'bg-blue-50 text-blue-700 border-blue-200',
    '個別相談会': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'リフォームフェスタ': 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return map[type] || 'bg-slate-50 text-slate-700 border-slate-200'
}
const getAreaColor = (area: string) => {
  const map: Record<string, string> = {
    '北信': 'bg-cyan-50 text-cyan-800 border-cyan-200',
    '東信': 'bg-lime-50 text-lime-800 border-lime-200',
    '中信': 'bg-yellow-50 text-yellow-800 border-yellow-200',
    '南信': 'bg-rose-50 text-rose-800 border-rose-200',
  }
  return map[area] || 'bg-gray-50 text-gray-800 border-gray-200'
}

// --- 今期の日付範囲（9月始まり） ---
function getSeasonRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const startYear = m < 9 ? y - 1 : y
  return { from: `${startYear}-09`, to: `${startYear + 1}-08` }
}

// --- イベント用の集計ヘルパー ---
interface EventStats {
  totalVisitors: number
  newVisitors: number
  existingVisitors: number
  withReservation: number
  withNextAppo: number
  byMedia: Record<string, number>
}

function calcEventStats(visitors: EventVisitor[]): EventStats {
  const byMedia: Record<string, number> = {}
  let newV = 0, existingV = 0, withRes = 0, withAppo = 0
  for (const v of visitors) {
    if (v.customer_type === '新規') newV++; else existingV++
    if (v.reservation_date) withRes++
    if (v.has_next_appointment) withAppo++
    const src = v.media_source || '不明'
    byMedia[src] = (byMedia[src] || 0) + 1
  }
  return { totalVisitors: visitors.length, newVisitors: newV, existingVisitors: existingV, withReservation: withRes, withNextAppo: withAppo, byMedia }
}

// --- ソートヘッダー ---
function SortTh({ label, sKey, sortConfig, onSort, className = '' }: {
  label: string; sKey: string
  sortConfig: { key: string; dir: 'asc' | 'desc' }
  onSort: (k: string) => void
  className?: string
}) {
  return (
    <th className={`px-3 py-2 cursor-pointer hover:bg-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(sKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortConfig.key === sKey
          ? (sortConfig.dir === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)
          : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
      </span>
    </th>
  )
}

// ============== メインコンポーネント ==============
export default function EventPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [allVisitors, setAllVisitors] = useState<EventVisitor[]>([])
  const [loading, setLoading] = useState(true)

  // 画面モード: list = イベント一覧, detail = イベント詳細（来場者管理）
  const [mode, setMode] = useState<'list' | 'detail'>('list')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // モーダル
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [visitorModalOpen, setVisitorModalOpen] = useState(false)
  const [editingVisitorId, setEditingVisitorId] = useState<string | null>(null)

  // フィルタ
  const [searchTerm, setSearchTerm] = useState('')
  const [filterArea, setFilterArea] = useState<string[]>([])
  const [filterEventType, setFilterEventType] = useState<string[]>([])
  const [filterDivision, setFilterDivision] = useState<string[]>([])
  const season = useMemo(() => getSeasonRange(), [])
  const [dateFrom, setDateFrom] = useState(season.from)
  const [dateTo, setDateTo] = useState(season.to)

  // ソート
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'dates', dir: 'desc' })

  // --- データ取得 ---
  const load = useCallback(async () => {
    setLoading(true)
    const [ev, vis] = await Promise.all([
      fetchAll<Event>('inquiry_events'),
      fetchAll<EventVisitor>('inquiry_event_visitors'),
    ])
    setEvents(ev)
    setAllVisitors(vis)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // --- 来場者マップ ---
  const visitorsByEvent = useMemo(() => {
    const map: Record<string, EventVisitor[]> = {}
    for (const v of allVisitors) {
      if (!map[v.event_id]) map[v.event_id] = []
      map[v.event_id].push(v)
    }
    return map
  }, [allVisitors])

  // --- イベント一覧フィルタ ---
  const filteredEvents = useMemo(() => {
    let list = events.filter(e => e.status === 'published')
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(s) || (e.area2 || '').includes(s))
    }
    if (filterArea.length) list = list.filter(e => e.area1 && filterArea.includes(e.area1))
    if (filterEventType.length) list = list.filter(e => filterEventType.includes(e.event_type))
    if (filterDivision.length) list = list.filter(e => e.division.some(d => filterDivision.includes(d)))
    if (dateFrom || dateTo) {
      const f = dateFrom || '0000-00'
      const t = dateTo || '9999-99'
      list = list.filter(e => (e.dates || []).some(d => {
        const ym = d.substring(0, 7)
        return ym >= f && ym <= t
      }))
    }
    // ソート
    list.sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      if (sortConfig.key === 'dates') {
        av = a.dates?.[0] || ''; bv = b.dates?.[0] || ''
      } else if (sortConfig.key === 'name') {
        av = a.name; bv = b.name
      } else if (sortConfig.key === 'visitors') {
        av = (visitorsByEvent[a.id] || []).length; bv = (visitorsByEvent[b.id] || []).length
      } else if (sortConfig.key === 'newVisitors') {
        av = calcEventStats(visitorsByEvent[a.id] || []).newVisitors
        bv = calcEventStats(visitorsByEvent[b.id] || []).newVisitors
      } else if (sortConfig.key === 'cost') {
        av = a.promotion_cost; bv = b.promotion_cost
      } else if (sortConfig.key === 'target') {
        av = a.target_visitors; bv = b.target_visitors
      }
      if (av < bv) return sortConfig.dir === 'asc' ? -1 : 1
      if (av > bv) return sortConfig.dir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [events, searchTerm, filterArea, filterEventType, filterDivision, dateFrom, dateTo, sortConfig, visitorsByEvent])

  const handleSort = (key: string) => {
    setSortConfig(p => ({ key, dir: p.key === key && p.dir === 'asc' ? 'desc' : 'asc' }))
  }

  // --- 選択中イベント ---
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId])
  const selectedVisitors = useMemo(() => visitorsByEvent[selectedEventId || ''] || [], [visitorsByEvent, selectedEventId])
  const selectedStats = useMemo(() => calcEventStats(selectedVisitors), [selectedVisitors])

  // --- イベント CRUD ---
  const initialEventForm: Omit<Event, 'id' | 'created_at' | 'updated_at'> = {
    name: '', event_type: 'その他', division: [], area1: null, area2: null, address: null,
    dates: [new Date().toISOString().split('T')[0]],
    target_visitors: 0, promotion_cost: 0,
    cost_insert: 0, cost_posting: 0, cost_web: 0, cost_dm: 0, cost_other: 0,
    note: null, status: 'published',
    store_name: null, event_url: null, brand: null, thumbnail_url: null, google_map_url: null,
  }
  const [eventForm, setEventForm] = useState(initialEventForm)

  const openNewEvent = () => { setEditingEventId(null); setEventForm(initialEventForm); setEventModalOpen(true) }
  const openEditEvent = (e: Event) => {
    setEditingEventId(e.id)
    setEventForm({
      name: e.name, event_type: e.event_type, division: e.division || [],
      area1: e.area1, area2: e.area2, address: e.address,
      dates: e.dates || [new Date().toISOString().split('T')[0]],
      target_visitors: e.target_visitors, promotion_cost: e.promotion_cost,
      cost_insert: e.cost_insert, cost_posting: e.cost_posting,
      cost_web: e.cost_web, cost_dm: e.cost_dm, cost_other: e.cost_other,
      note: e.note, status: e.status,
      store_name: e.store_name, event_url: e.event_url, brand: e.brand,
      thumbnail_url: e.thumbnail_url, google_map_url: e.google_map_url,
    })
    setEventModalOpen(true)
  }

  const saveEvent = async () => {
    const totalCost = (eventForm.cost_insert || 0) + (eventForm.cost_posting || 0) +
      (eventForm.cost_web || 0) + (eventForm.cost_dm || 0) + (eventForm.cost_other || 0)
    const payload = { ...eventForm, promotion_cost: totalCost, updated_at: new Date().toISOString() }

    if (editingEventId) {
      await supabase.from('events').update(payload).eq('id', editingEventId)
    } else {
      await supabase.from('events').insert(payload)
    }
    setEventModalOpen(false)
    load()
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('このイベントと関連する来場者データを全て削除しますか？')) return
    await supabase.from('events').delete().eq('id', id)
    if (selectedEventId === id) { setMode('list'); setSelectedEventId(null) }
    load()
  }

  // --- 来場者 CRUD ---
  const initialVisitorForm: Omit<EventVisitor, 'id' | 'created_at'> = {
    event_id: '', name: '', name_kana: null, phone: null, email: null,
    postal_code: null, address: null, customer_type: '新規',
    media_source: null, reservation_date: null, visit_date: null,
    has_next_appointment: false, next_appointment_date: null,
    next_appointment_note: null, note: null,
  }
  const [visitorForm, setVisitorForm] = useState(initialVisitorForm)

  const openNewVisitor = () => {
    setEditingVisitorId(null)
    setVisitorForm({ ...initialVisitorForm, event_id: selectedEventId || '' })
    setVisitorModalOpen(true)
  }
  const openEditVisitor = (v: EventVisitor) => {
    setEditingVisitorId(v.id)
    setVisitorForm({
      event_id: v.event_id, name: v.name, name_kana: v.name_kana,
      phone: v.phone, email: v.email, postal_code: v.postal_code,
      address: v.address, customer_type: v.customer_type,
      media_source: v.media_source, reservation_date: v.reservation_date,
      visit_date: v.visit_date, has_next_appointment: v.has_next_appointment,
      next_appointment_date: v.next_appointment_date,
      next_appointment_note: v.next_appointment_note, note: v.note,
    })
    setVisitorModalOpen(true)
  }

  const saveVisitor = async () => {
    if (editingVisitorId) {
      await supabase.from('event_visitors').update(visitorForm).eq('id', editingVisitorId)
    } else {
      await supabase.from('event_visitors').insert(visitorForm)
    }
    setVisitorModalOpen(false)
    load()
  }

  const deleteVisitor = async (id: string) => {
    if (!confirm('この来場者を削除しますか？')) return
    await supabase.from('event_visitors').delete().eq('id', id)
    load()
  }

  // --- CSV出力 ---
  const exportVisitorsCsv = () => {
    if (!selectedEvent) return
    const headers = ['氏名', 'フリガナ', '電話番号', 'メール', '区分', '流入媒体', '予約日', '来場日', '次アポ', '備考']
    const rows = selectedVisitors.map(v => [
      v.name, v.name_kana || '', v.phone || '', v.email || '',
      v.customer_type, v.media_source || '', v.reservation_date || '', v.visit_date || '',
      v.has_next_appointment ? '○' : '', v.note || '',
    ])
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedEvent.name}_来場者_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- ローディング ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> 読込中...
      </div>
    )
  }

  // ==================== イベント詳細（来場者管理）====================
  if (mode === 'detail' && selectedEvent) {
    return (
      <div className="space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode('list'); setSelectedEventId(null) }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" /> 一覧に戻る
            </button>
            <h2 className="text-lg font-bold text-slate-800">{selectedEvent.name}</h2>
            <div className="flex gap-1">
              {selectedEvent.division.map(d => (
                <span key={d} className={`px-1.5 py-0.5 text-[9px] font-bold border rounded ${getDivisionColor(d)}`}>{d}</span>
              ))}
              <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded ${getEventTypeColor(selectedEvent.event_type)}`}>{selectedEvent.event_type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportVisitorsCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> CSV出力
            </button>
            <button onClick={openNewVisitor}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" /> 来場者を追加
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="目標" value={selectedEvent.target_visitors} unit="組" icon={<Target className="w-4 h-4 text-slate-400" />} />
          <StatCard label="来場者合計" value={selectedStats.totalVisitors} unit="組"
            sub={`目標比 ${selectedEvent.target_visitors > 0 ? Math.round(selectedStats.totalVisitors / selectedEvent.target_visitors * 100) : 0}%`}
            icon={<Users className="w-4 h-4 text-blue-500" />} highlight />
          <StatCard label="新規" value={selectedStats.newVisitors} unit="組" icon={<Users className="w-4 h-4 text-green-500" />} />
          <StatCard label="既存" value={selectedStats.existingVisitors} unit="組" icon={<Users className="w-4 h-4 text-slate-400" />} />
          <StatCard label="次アポ獲得" value={selectedStats.withNextAppo} unit="組"
            sub={`${selectedStats.totalVisitors > 0 ? Math.round(selectedStats.withNextAppo / selectedStats.totalVisitors * 100) : 0}%`}
            icon={<CalendarDays className="w-4 h-4 text-orange-500" />} />
        </div>

        {/* 費用・CPA */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-400 font-bold mb-1">販促費合計</div>
            <div className="text-lg font-black text-slate-800">¥{selectedEvent.promotion_cost.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-400 font-bold mb-1">CPA（全体）</div>
            <div className="text-lg font-black text-indigo-700">
              ¥{selectedStats.totalVisitors > 0 ? Math.round(selectedEvent.promotion_cost / selectedStats.totalVisitors).toLocaleString() : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-400 font-bold mb-1">CPA（新規）</div>
            <div className="text-lg font-black text-rose-600">
              ¥{selectedStats.newVisitors > 0 ? Math.round(selectedEvent.promotion_cost / selectedStats.newVisitors).toLocaleString() : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-400 font-bold mb-1">流入媒体内訳</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(selectedStats.byMedia).sort((a, b) => b[1] - a[1]).map(([src, cnt]) => (
                <span key={src} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {src}: {cnt}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 来場者テーブル */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="px-3 py-2 text-left">氏名</th>
                  <th className="px-3 py-2 text-left">フリガナ</th>
                  <th className="px-3 py-2 text-center">区分</th>
                  <th className="px-3 py-2 text-left">流入媒体</th>
                  <th className="px-3 py-2 text-left">電話番号</th>
                  <th className="px-3 py-2 text-center">予約日</th>
                  <th className="px-3 py-2 text-center">来場日</th>
                  <th className="px-3 py-2 text-center">次アポ</th>
                  <th className="px-3 py-2 text-left">備考</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedVisitors.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    来場者がまだ登録されていません。「来場者を追加」ボタンから登録してください。
                  </td></tr>
                ) : selectedVisitors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-2 font-bold text-slate-800">{v.name}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{v.name_kana || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${v.customer_type === '新規' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {v.customer_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{v.media_source || '-'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{v.phone || '-'}</td>
                    <td className="px-3 py-2 text-center text-xs text-slate-600">{v.reservation_date || '-'}</td>
                    <td className="px-3 py-2 text-center text-xs text-slate-600">{v.visit_date || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {v.has_next_appointment
                        ? <span className="text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded">○</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate">{v.note || ''}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditVisitor(v)} className="p-1 text-slate-400 hover:text-slate-800"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteVisitor(v.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 来場者モーダル */}
        {visitorModalOpen && (
          <VisitorModal
            form={visitorForm}
            setForm={setVisitorForm}
            onSave={saveVisitor}
            onClose={() => setVisitorModalOpen(false)}
            isEdit={!!editingVisitorId}
          />
        )}
      </div>
    )
  }

  // ==================== イベント一覧 ====================
  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">イベント集計</h1>
        <button onClick={openNewEvent}
          className="flex items-center gap-2 px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> 新規イベント
        </button>
      </div>

      {/* フィルタ */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1">
            <input type="month" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-[110px] px-2 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <span className="text-slate-300 text-xs">〜</span>
            <input type="month" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-[110px] px-2 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input type="text" placeholder="キーワード検索" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <button onClick={() => { setSearchTerm(''); setFilterArea([]); setFilterEventType([]); setFilterDivision([]); setDateFrom(season.from); setDateTo(season.to) }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2">リセット</button>
        </div>

        {/* タグフィルタ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">区分</label>
            <div className="flex flex-wrap gap-1">
              {DIVISIONS.map(d => (
                <button key={d} onClick={() => setFilterDivision(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${filterDivision.includes(d) ? getDivisionColor(d) : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">種別</label>
            <div className="flex flex-wrap gap-1">
              {EVENT_TYPES.map(t => (
                <button key={t} onClick={() => setFilterEventType(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${filterEventType.includes(t) ? getEventTypeColor(t) : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-widest">エリア</label>
            <div className="flex flex-wrap gap-1">
              {Object.keys(NAGANO_AREAS).map(a => (
                <button key={a} onClick={() => setFilterArea(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${filterArea.includes(a) ? getAreaColor(a) : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* イベントテーブル */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortTh label="イベント名" sKey="name" sortConfig={sortConfig} onSort={handleSort} className="text-left min-w-[200px]" />
                <SortTh label="日付" sKey="dates" sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase text-center">エリア</th>
                <SortTh label="目標" sKey="target" sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortTh label="来場合計" sKey="visitors" sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <SortTh label="新規" sKey="newVisitors" sortConfig={sortConfig} onSort={handleSort} className="text-center" />
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase text-center">既存</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase text-center">次アポ</th>
                <SortTh label="費用" sKey="cost" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase text-right">CPA(新規)</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                  イベントがありません
                </td></tr>
              ) : filteredEvents.map(ev => {
                const stats = calcEventStats(visitorsByEvent[ev.id] || [])
                const cpaNew = stats.newVisitors > 0 ? Math.round(ev.promotion_cost / stats.newVisitors) : 0
                const dates = (ev.dates || []).sort()
                return (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedEventId(ev.id); setMode('detail') }}>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {ev.division.map(d => (
                            <span key={d} className={`px-1 py-0 text-[8px] font-bold border rounded ${getDivisionColor(d)}`}>{d}</span>
                          ))}
                          <span className={`px-1 py-0 text-[8px] font-bold border rounded ${getEventTypeColor(ev.event_type)}`}>{ev.event_type}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-xs">{ev.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-slate-600">
                      {dates.map((d, i) => <div key={i} className="whitespace-nowrap">{d}</div>)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {ev.area1 && <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded ${getAreaColor(ev.area1)}`}>{ev.area1}</span>}
                      {ev.area2 && <div className="text-[10px] text-slate-500 mt-0.5">{ev.area2}</div>}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-500">{ev.target_visitors || '-'}</td>
                    <td className="px-3 py-2 text-center font-bold text-blue-700">{stats.totalVisitors}</td>
                    <td className="px-3 py-2 text-center font-bold text-green-700">{stats.newVisitors}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{stats.existingVisitors}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-slate-700">{stats.withNextAppo}</span>
                      <span className="text-[9px] text-slate-400 ml-0.5">
                        ({stats.totalVisitors > 0 ? Math.round(stats.withNextAppo / stats.totalVisitors * 100) : 0}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">¥{ev.promotion_cost.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-bold text-indigo-700">
                      {cpaNew > 0 ? `¥${cpaNew.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditEvent(ev)} className="p-1 text-slate-400 hover:text-slate-800"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteEvent(ev.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* イベントモーダル */}
      {eventModalOpen && (
        <EventModal
          form={eventForm}
          setForm={setEventForm}
          onSave={saveEvent}
          onClose={() => setEventModalOpen(false)}
          isEdit={!!editingEventId}
        />
      )}
    </div>
  )
}

// ==================== サブコンポーネント ====================

function StatCard({ label, value, unit, sub, icon, highlight }: {
  label: string; value: number; unit: string; sub?: string; icon: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</span>
        <span className="text-xs text-slate-400 font-bold">{unit}</span>
      </div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function EventModal({ form, setForm, onSave, onClose, isEdit }: {
  form: Omit<Event, 'id' | 'created_at' | 'updated_at'>
  setForm: React.Dispatch<React.SetStateAction<Omit<Event, 'id' | 'created_at' | 'updated_at'>>>
  onSave: () => void; onClose: () => void; isEdit: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const numFields = ['target_visitors', 'cost_insert', 'cost_posting', 'cost_web', 'cost_dm', 'cost_other']
    setForm(p => ({ ...p, [name]: numFields.includes(name) ? (value === '' ? 0 : Number(value)) : value }))
  }
  const toggleDiv = (d: string) => {
    setForm(p => ({ ...p, division: p.division.includes(d) ? p.division.filter(x => x !== d) : [...p.division, d] }))
  }
  const addDate = () => setForm(p => ({ ...p, dates: [...p.dates, ''] }))
  const changeDate = (i: number, v: string) => setForm(p => ({ ...p, dates: p.dates.map((d, j) => j === i ? v : d) }))
  const removeDate = (i: number) => setForm(p => ({ ...p, dates: p.dates.filter((_, j) => j !== i) }))

  const totalCost = (form.cost_insert || 0) + (form.cost_posting || 0) + (form.cost_web || 0) + (form.cost_dm || 0) + (form.cost_other || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b flex-none">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'イベント編集' : '新規イベント'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* イベント名 */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">イベント名 <span className="text-rose-500">*</span></label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="イベント名" />
          </div>
          {/* 区分・種別 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">事業区分</label>
              <div className="flex flex-wrap gap-1">
                {DIVISIONS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDiv(d)}
                    className={`px-2 py-1 text-[10px] font-bold border rounded transition-all ${form.division.includes(d) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">イベント種別</label>
              <div className="flex flex-wrap gap-1">
                {EVENT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, event_type: t }))}
                    className={`px-2 py-1 text-[10px] font-bold border rounded transition-all ${form.event_type === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* 日付 */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">開催日</label>
            <div className="flex flex-wrap gap-1.5">
              {form.dates.map((d, i) => (
                <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                  <input type="date" value={d} onChange={e => changeDate(i, e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-600 p-0 w-28 focus:ring-0" />
                  {form.dates.length > 1 && <button type="button" onClick={() => removeDate(i)} className="text-slate-300 hover:text-rose-500"><X className="w-3 h-3" /></button>}
                </div>
              ))}
              <button type="button" onClick={addDate}
                className="text-indigo-600 text-[10px] font-bold border border-indigo-200 bg-indigo-50/30 px-3 py-1 rounded hover:bg-indigo-50">＋追加</button>
            </div>
          </div>
          {/* エリア・目標 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">エリア1</label>
              <select name="area1" value={form.area1 || ''} onChange={e => setForm(p => ({ ...p, area1: e.target.value || null, area2: null }))}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold focus:outline-none focus:border-indigo-500">
                <option value="">選択</option>
                {Object.keys(NAGANO_AREAS).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">エリア2</label>
              <select name="area2" value={form.area2 || ''} onChange={e => setForm(p => ({ ...p, area2: e.target.value || null }))}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold focus:outline-none focus:border-indigo-500">
                <option value="">選択</option>
                {form.area1 && NAGANO_AREAS[form.area1]?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">目標来場数</label>
              <input type="number" name="target_visitors" value={form.target_visitors} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-right font-bold focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">住所</label>
            <input type="text" name="address" value={form.address || ''} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="住所" />
          </div>
          {/* 費用 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600">販促費内訳</label>
              <span className="text-sm font-black text-slate-800">合計: ¥{totalCost.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { key: 'cost_insert', label: '折込チラシ' },
                { key: 'cost_posting', label: 'ポスティング' },
                { key: 'cost_web', label: 'Web広告' },
                { key: 'cost_dm', label: 'DM' },
                { key: 'cost_other', label: 'その他' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1">{label}</label>
                  <input type="number" name={key} value={(form as Record<string, unknown>)[key] as number} onChange={handleChange}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right font-mono focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>
          </div>
          {/* 備考 */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">備考</label>
            <textarea name="note" value={form.note || ''} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500" placeholder="メモ" />
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 flex-none">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">キャンセル</button>
          <button onClick={onSave} className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm">保存</button>
        </div>
      </div>
    </div>
  )
}

function VisitorModal({ form, setForm, onSave, onClose, isEdit }: {
  form: Omit<EventVisitor, 'id' | 'created_at'>
  setForm: React.Dispatch<React.SetStateAction<Omit<EventVisitor, 'id' | 'created_at'>>>
  onSave: () => void; onClose: () => void; isEdit: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm(p => ({ ...p, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm(p => ({ ...p, [name]: value || null }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b flex-none">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? '来場者編集' : '来場者追加'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 氏名 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">氏名 <span className="text-rose-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-bold focus:outline-none focus:border-indigo-500" placeholder="山田 太郎" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">フリガナ</label>
              <input type="text" name="name_kana" value={form.name_kana || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="ヤマダ タロウ" />
            </div>
          </div>
          {/* 区分・媒体 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">顧客区分</label>
              <div className="flex gap-2">
                {(['新規', '既存'] as const).map(ct => (
                  <button key={ct} type="button" onClick={() => setForm(p => ({ ...p, customer_type: ct }))}
                    className={`flex-1 py-2 text-xs font-bold border rounded transition-all ${form.customer_type === ct
                      ? (ct === '新規' ? 'bg-green-600 text-white border-green-600' : 'bg-slate-700 text-white border-slate-700')
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">流入媒体</label>
              <select name="media_source" value={form.media_source || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold focus:outline-none focus:border-indigo-500">
                <option value="">選択</option>
                {MEDIA_SOURCES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {/* 連絡先 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">電話番号</label>
              <input type="tel" name="phone" value={form.phone || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="090-1234-5678" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">メール</label>
              <input type="email" name="email" value={form.email || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="example@mail.com" />
            </div>
          </div>
          {/* 住所 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">郵便番号</label>
              <input type="text" name="postal_code" value={form.postal_code || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="380-0000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">住所</label>
              <input type="text" name="address" value={form.address || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" placeholder="長野県長野市..." />
            </div>
          </div>
          {/* 日付 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">予約日</label>
              <input type="date" name="reservation_date" value={form.reservation_date || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">来場日</label>
              <input type="date" name="visit_date" value={form.visit_date || ''} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          {/* 次アポ */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="has_next_appointment" checked={form.has_next_appointment}
                onChange={handleChange} className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500" />
              <span className="text-xs font-bold text-orange-800">次アポ獲得</span>
            </label>
            {form.has_next_appointment && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-orange-600 mb-1">次アポ日</label>
                  <input type="date" name="next_appointment_date" value={form.next_appointment_date || ''} onChange={handleChange}
                    className="w-full px-3 py-1.5 border border-orange-200 rounded text-xs focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-orange-600 mb-1">次アポメモ</label>
                  <input type="text" name="next_appointment_note" value={form.next_appointment_note || ''} onChange={handleChange}
                    className="w-full px-3 py-1.5 border border-orange-200 rounded text-xs focus:outline-none focus:border-orange-400" placeholder="打ち合わせ内容等" />
                </div>
              </div>
            )}
          </div>
          {/* 備考 */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">備考</label>
            <textarea name="note" value={form.note || ''} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500" placeholder="メモ" />
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 flex-none">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">キャンセル</button>
          <button onClick={onSave} className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm">保存</button>
        </div>
      </div>
    </div>
  )
}
