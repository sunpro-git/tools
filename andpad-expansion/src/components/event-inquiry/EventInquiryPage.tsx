import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, ClipboardEdit, X, Trash2, ImagePlus, Pencil, ExternalLink } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'
import type { Event, EventVisitor } from '../../types/database'
import StaffSelector from '../common/StaffSelector'

interface EventWithVisitors extends Event {
  visitors: EventVisitor[]
  visitorCount: number
  newVisitorCount: number
  existingVisitorCount: number
  appointmentCount: number
}

const DIVISIONS = ['新築', 'リフォーム', '不動産'] as const
const BRANDS: Record<string, { label: string; short: string }[]> = {
  '新築': [
    { label: 'サンプロ建築設計', short: '建築設計' },
    { label: 'ライフィットクリエイターズハウス', short: 'LCH' },
    { label: '分譲', short: '分譲' },
  ],
}
const DEFAULT_EVENT_TYPES = ['完成お披露目会', '見学会', '個別相談会', '住宅博', 'リフォーム博', 'リフォームフェスタ']
const STORES = ['本社', '松本店', '長野店', '上田店', '伊那店']

interface EventForm {
  name: string
  event_url: string
  thumbnail: File | null
  thumbnailPreview: string | null
  division: string
  brand: string
  event_type: string
  customEventType: string
  dates: string[]
  store_name: string
  area: string
  google_map_url: string
  note: string
}

const initialForm: EventForm = {
  name: '',
  event_url: '',
  thumbnail: null,
  thumbnailPreview: null,
  division: '',
  brand: '',
  event_type: '',
  customEventType: '',
  dates: [
    new Date().toISOString().slice(0, 10),
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  ],
  store_name: '',
  area: '',
  google_map_url: '',
  note: '',
}

export default function EventInquiryPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventWithVisitors[]>([])
  const [showRegister, setShowRegister] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [eventTypes, setEventTypes] = useState<string[]>([...DEFAULT_EVENT_TYPES])

  useEffect(() => {
    fetchEvents()
  }, [])

  // モーダル背景スクロール防止
  useEffect(() => {
    document.body.style.overflow = showRegister ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showRegister])

  const fetchEvents = async () => {
    setLoading(true)
    const [eventsRes, visitorsRes] = await Promise.all([
      supabase.from('events').select('*').or('status.eq.published,status.is.null').order('created_at', { ascending: false }),
      supabase.from('event_visitors').select('*'),
    ])
    if (eventsRes.data && visitorsRes.data) {
      const visitors = visitorsRes.data as EventVisitor[]
      const eventsWithVisitors: EventWithVisitors[] = (eventsRes.data as Event[]).map((ev) => {
        const evVisitors = visitors.filter((v) => v.event_id === ev.id)
        return {
          ...ev,
          visitors: evVisitors,
          visitorCount: evVisitors.length,
          newVisitorCount: evVisitors.filter((v) => v.customer_type === '新規').length,
          existingVisitorCount: evVisitors.filter((v) => v.customer_type === '既存').length,
          appointmentCount: evVisitors.filter((v) => v.has_next_appointment).length,
        }
      })
      setEvents(eventsWithVisitors)
      // 既存イベントのevent_typeも選択肢に追加
      const existingTypes = new Set(eventsWithVisitors.map((e) => e.event_type).filter(Boolean))
      setEventTypes((prev) => Array.from(new Set([...prev, ...existingTypes])))
    }
    setLoading(false)
  }

  const filteredEvents = useMemo(() => events.filter((e) => e.division?.includes(businessType)), [events, businessType])
  const totalVisitors = useMemo(() => filteredEvents.reduce((s, e) => s + e.visitorCount, 0), [filteredEvents])
  const totalAppointments = useMemo(() => filteredEvents.reduce((s, e) => s + e.appointmentCount, 0), [filteredEvents])

  // A2-2: イベント来場者一覧
  interface VisitRecord { id: string; visit_date: string; model_house_type: string | null; customer_name: string; customer_type: string | null; reservation: string | null; staff1: string | null; has_appointment: string | null; appointment_content: string | null; notes: string | null; customer_andpad_id: string | null; business_type: string }
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([])
  const [visitLoading, setVisitLoading] = useState(false)
  const [showVisitAddModal, setShowVisitAddModal] = useState(false)
  const [editVisitRecord, setEditVisitRecord] = useState<VisitRecord | null>(null)
  const [visitForm, setVisitForm] = useState({ model_house_type: '', visit_date: new Date().toISOString().slice(0, 10), customer_name: '', reservation: '', customer_type: '', staff1: '', has_appointment: '', appointment_content: '', notes: '' })
  const [editVisitForm, setEditVisitForm] = useState<Record<string, string | null>>({})
  const [visitSaving, setVisitSaving] = useState(false)
  const [visitFilter, setVisitFilter] = useState('')

  const eventNameOptions = useMemo(() => filteredEvents.map(e => e.name), [filteredEvents])

  const fetchVisitRecords = useCallback(async () => {
    setVisitLoading(true)
    if (eventNameOptions.length === 0) { setVisitRecords([]); setVisitLoading(false); return }
    const { data } = await supabase.from('model_house_visits').select('id,visit_date,model_house_type,customer_name,customer_type,reservation,staff1,has_appointment,appointment_content,notes,customer_andpad_id,business_type')
      .in('model_house_type', eventNameOptions).order('visit_date', { ascending: false }).limit(500)
    if (data) setVisitRecords(data)
    setVisitLoading(false)
  }, [eventNameOptions])

  useEffect(() => { fetchVisitRecords() }, [fetchVisitRecords])

  const filteredVisitRecords = useMemo(() => visitFilter ? visitRecords.filter(v => v.model_house_type === visitFilter) : visitRecords, [visitRecords, visitFilter])

  const allVisitStaff = useMemo(() => {
    const set = new Set<string>()
    for (const v of visitRecords) { if (v.staff1?.trim()) set.add(v.staff1.trim()) }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [visitRecords])

  const handleVisitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitForm.customer_name.trim()) return
    setVisitSaving(true)
    const row: Record<string, unknown> = { ...visitForm, business_type: businessType }
    for (const [k, v] of Object.entries(row)) { if (typeof v === 'string' && v.trim() === '') row[k] = null }
    await supabase.from('model_house_visits').insert(row)
    setShowVisitAddModal(false)
    setVisitSaving(false)
    fetchVisitRecords()
  }

  const handleVisitEditSave = async () => {
    if (!editVisitRecord) return
    setVisitSaving(true)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editVisitForm)) { clean[k] = typeof v === 'string' && v.trim() === '' ? null : v }
    await supabase.from('model_house_visits').update(clean).eq('id', editVisitRecord.id)
    setEditVisitRecord(null)
    setVisitSaving(false)
    fetchVisitRecords()
  }

  const handleVisitDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return
    await supabase.from('model_house_visits').delete().eq('id', id)
    fetchVisitRecords()
  }

  const openVisitEditModal = (v: VisitRecord) => {
    setEditVisitRecord(v)
    setEditVisitForm({ model_house_type: v.model_house_type || '', visit_date: v.visit_date || '', customer_name: v.customer_name || '', reservation: v.reservation || '', customer_type: v.customer_type || '', staff1: v.staff1 || '', has_appointment: v.has_appointment || '', appointment_content: v.appointment_content || '', notes: v.notes || '' })
  }

  const VISIT_COLUMNS = [
    { key: 'model_house_type', label: 'イベント名', width: '12%' },
    { key: 'visit_date', label: '来場日', width: '7%' },
    { key: 'customer_name', label: 'お客様氏名', width: '8%' },
    { key: 'reservation', label: '予約', width: '5%' },
    { key: 'customer_type', label: '来場区分', width: '6%' },
    { key: 'staff1', label: '対応者', width: '6%' },
    { key: 'has_appointment', label: '次アポ', width: '4%' },
    { key: 'appointment_content', label: '次アポ内容', width: '10%' },
    { key: 'notes', label: '備考', width: '15%' },
  ]

  const formatDates = (dates: string[]) => {
    if (!dates || dates.length === 0) return '-'
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return dates.map((d) => {
      const dt = new Date(d)
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}(${weekdays[dt.getDay()]})`
    })
  }

  const handleThumbnailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((prev) => ({
      ...prev,
      thumbnail: file,
      thumbnailPreview: URL.createObjectURL(file),
    }))
  }, [])

  const handleDateChange = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const dates = [...prev.dates]
      dates[index] = value
      return { ...prev, dates }
    })
  }, [])

  const addDate = useCallback(() => {
    setForm((prev) => {
      const lastDate = prev.dates[prev.dates.length - 1]
      const next = lastDate
        ? new Date(new Date(lastDate).getTime() + 86400000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      return { ...prev, dates: [...prev.dates, next] }
    })
  }, [])

  const removeDate = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, dates: prev.dates.filter((_, i) => i !== index) }))
  }, [])

  const openEdit = useCallback((ev: EventWithVisitors) => {
    const evType = eventTypes.includes(ev.event_type) ? ev.event_type : '__custom__'
    setForm({
      name: ev.name,
      event_url: ev.event_url || '',
      thumbnail: null,
      thumbnailPreview: ev.thumbnail_url || null,
      division: ev.division?.[0] || '',
      brand: ev.brand || '',
      event_type: evType,
      customEventType: evType === '__custom__' ? ev.event_type : '',
      dates: ev.dates?.length ? ev.dates : [new Date().toISOString().slice(0, 10)],
      store_name: ev.store_name || '',
      area: ev.area1 || '',
      google_map_url: ev.google_map_url || '',
      note: ev.note || '',
    })
    setEditingEventId(ev.id)
    setShowRegister(true)
  }, [eventTypes])

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('イベント名を入力してください')
    if (!form.division) return alert('事業部を選択してください')
    if (form.dates.length === 0) return alert('イベント日程を設定してください')

    setSaving(true)
    try {
      let thumbnailUrl: string | null = form.thumbnailPreview
      if (form.thumbnail) {
        const ext = form.thumbnail.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('event-thumbnails')
          .upload(path, form.thumbnail)
        if (uploadError) {
          console.error('thumbnail upload error:', uploadError.message)
        } else {
          const { data: urlData } = supabase.storage.from('event-thumbnails').getPublicUrl(path)
          thumbnailUrl = urlData.publicUrl
        }
      }

      const eventType = form.event_type === '__custom__' ? form.customEventType : form.event_type

      const payload = {
        name: form.name.trim(),
        event_url: form.event_url.trim() || null,
        event_type: eventType || 'その他',
        division: [form.division],
        brand: form.division === '新築' ? form.brand || null : null,
        dates: form.dates.filter(Boolean).sort(),
        store_name: form.store_name || null,
        area1: form.area || null,
        google_map_url: form.google_map_url.trim() || null,
        thumbnail_url: thumbnailUrl,
        note: form.note.trim() || null,
        status: 'published' as const,
      }

      const { error } = editingEventId
        ? await supabase.from('events').update(payload).eq('id', editingEventId)
        : await supabase.from('events').insert(payload)

      if (error) {
        alert(`${editingEventId ? '更新' : '登録'}に失敗しました: ` + error.message)
      } else {
        if (eventType && !eventTypes.includes(eventType)) {
          setEventTypes((prev) => [...prev, eventType])
        }
        setForm({ ...initialForm })
        setEditingEventId(null)
        setShowRegister(false)
        fetchEvents()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー: 3段構成（フィルター段なし） */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* 1段目: タイトル + アクション */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="w-5 h-5"><path d="M224 64C241.7 64 256 78.3 256 96L256 128L384 128L384 96C384 78.3 398.3 64 416 64C433.7 64 448 78.3 448 96L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 96C192 78.3 206.3 64 224 64zM160 304L160 336C160 344.8 167.2 352 176 352L208 352C216.8 352 224 344.8 224 336L224 304C224 295.2 216.8 288 208 288L176 288C167.2 288 160 295.2 160 304zM288 304L288 336C288 344.8 295.2 352 304 352L336 352C344.8 352 352 344.8 352 336L352 304C352 295.2 344.8 288 336 288L304 288C295.2 288 288 295.2 288 304zM432 288C423.2 288 416 295.2 416 304L416 336C416 344.8 423.2 352 432 352L464 352C472.8 352 480 344.8 480 336L480 304C480 295.2 472.8 288 464 288L432 288zM160 432L160 464C160 472.8 167.2 480 176 480L208 480C216.8 480 224 472.8 224 464L224 432C224 423.2 216.8 416 208 416L176 416C167.2 416 160 423.2 160 432zM304 416C295.2 416 288 423.2 288 432L288 464C288 472.8 295.2 480 304 480L336 480C344.8 480 352 472.8 352 464L352 432C352 423.2 344.8 416 336 416L304 416zM416 432L416 464C416 472.8 423.2 480 432 480L464 480C472.8 480 480 472.8 480 464L480 432C480 423.2 472.8 416 464 416L432 416C423.2 416 416 423.2 416 432z"/></svg>A2
            </span>
            イベント
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
            <button
              onClick={() => { setForm({ ...initialForm }); setEditingEventId(null); setShowRegister(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              イベント登録
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
              <ClipboardEdit className="w-4 h-4" />
              イベント結果登録
            </button>
          </div>
        </div>
        {/* 3段目: サマリー（フィルター段なし） */}
        <div className="flex items-center gap-6 px-4 py-2">
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className="text-slate-500">来場数</span>
            <span className="text-lg font-bold text-slate-900">{totalVisitors.toLocaleString()}</span>
          </div>
          <div className="border-l border-slate-200 h-6" />
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className="text-slate-500">アポイント数</span>
            <span className="text-lg font-bold text-red-600">{totalAppointments.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* イベント一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-xs text-slate-500">読み込み中...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">イベントデータがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap w-16"></th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">イベント名</th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">種別</th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">イベント日程</th>
                  <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">エリア</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-blue-600 whitespace-nowrap">来場数</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">新規</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">既存</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 whitespace-nowrap">アポイント数</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 whitespace-nowrap">アポ率</th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev, idx) => {
                  const apoRate = ev.visitorCount > 0 ? ((ev.appointmentCount / ev.visitorCount) * 100).toFixed(1) : '-'
                  return (
                    <tr key={ev.id} className={`hover:bg-slate-100 cursor-pointer ${idx % 2 === 1 ? 'bg-slate-100/70' : ''}`} onClick={() => openEdit(ev)}>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-center">
                        {ev.thumbnail_url ? (
                          <img src={ev.thumbnail_url} alt="" className="w-12 h-9 object-cover rounded border border-slate-200 inline-block" />
                        ) : (
                          <span className="inline-block w-12 h-9 rounded border border-slate-200 bg-slate-50" />
                        )}
                      </td>
                      <td className="py-1.5 px-3 border-b border-slate-100 font-medium text-slate-900">{ev.name}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-slate-600">{ev.event_type}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-slate-500 text-xs">
                        {(() => {
                          const d = formatDates(ev.dates)
                          if (typeof d === 'string') return d
                          return d.map((date, i) => <div key={i}>{date}</div>)
                        })()}
                      </td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-slate-600">{ev.area1 || '-'}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-blue-600">{ev.visitorCount}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right text-slate-600">{ev.newVisitorCount}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right text-slate-600">{ev.existingVisitorCount}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-red-600">{ev.appointmentCount}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-right text-red-600">{apoRate === '-' ? '-' : `${apoRate}%`}</td>
                      <td className="py-1.5 px-3 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1">
                          <button onClick={() => openEdit(ev)} className="text-slate-400 hover:text-blue-600 p-1" title="編集">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {ev.event_url && (
                            <a href={ev.event_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 p-1" title="イベントページ">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A2-2: イベント来場者一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 mt-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A2 - <span className="text-xl">2</span></span>
            イベント来場者一覧
          </h2>
          <button onClick={() => { setVisitForm({ model_house_type: eventNameOptions[0] || '', visit_date: new Date().toISOString().slice(0, 10), customer_name: '', reservation: '', customer_type: '', staff1: '', has_appointment: '', appointment_content: '', notes: '' }); setShowVisitAddModal(true) }} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />新規追加
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setVisitFilter('')} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${!visitFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>全て</button>
          {eventNameOptions.map(name => (
            <button key={name} onClick={() => setVisitFilter(name)} className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${visitFilter === name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{name}</button>
          ))}
        </div>
        {visitLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse table-fixed" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="bg-slate-50">
                  {VISIT_COLUMNS.map(col => (
                    <th key={col.key} className="px-2 py-1.5 border border-slate-200 text-left font-semibold text-slate-600 whitespace-nowrap" style={{ width: col.width }}>{col.label}</th>
                  ))}
                  <th className="px-2 py-1.5 border border-slate-200 text-center font-semibold text-slate-600" style={{ width: '3%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitRecords.length === 0 ? (
                  <tr><td colSpan={VISIT_COLUMNS.length + 1} className="text-center py-8 text-slate-400 border border-slate-200">データがありません</td></tr>
                ) : filteredVisitRecords.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 cursor-pointer" onDoubleClick={() => openVisitEditModal(v)}>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700 truncate">{v.model_house_type || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700">{v.visit_date?.replace(/-/g, '/') || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700 truncate">{v.customer_name || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700">{v.reservation || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700">{v.customer_type || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700">{v.staff1 || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700">{v.has_appointment || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700 truncate">{v.appointment_content || '-'}</td>
                    <td className="px-2 py-1 border border-slate-200 text-xs text-slate-700 truncate">{v.notes || '-'}</td>
                    <td className="px-1 py-1 border border-slate-200 text-center">
                      <button type="button" onClick={() => openVisitEditModal(v)} className="text-slate-400 hover:text-blue-600 cursor-pointer" title="編集"><Pencil className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A2-2 新規追加モーダル */}
      {showVisitAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowVisitAddModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">来場者を追加</h3>
              <button onClick={() => setShowVisitAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleVisitAdd} className="p-6 space-y-5 overflow-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">イベント</label>
                <div className="flex flex-wrap gap-1.5">
                  {eventNameOptions.map(name => (
                    <button key={name} type="button" onClick={() => setVisitForm(f => ({ ...f, model_house_type: name }))} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${visitForm.model_house_type === name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{name}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">来場日</label>
                  <input type="date" value={visitForm.visit_date} onChange={(e) => setVisitForm(f => ({ ...f, visit_date: e.target.value }))} className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">予約</label>
                  <div className="flex gap-1.5">
                    {['予約あり', '予約なし'].map(o => (
                      <button key={o} type="button" onClick={() => setVisitForm(f => ({ ...f, reservation: f.reservation === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${visitForm.reservation === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">お客様氏名 <span className="text-red-500">*</span></label>
                <input type="text" value={visitForm.customer_name} onChange={(e) => setVisitForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="例: 山田 太郎" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <StaffSelector category={visitForm.model_house_type} value={visitForm.staff1} onChange={(name) => setVisitForm(f => ({ ...f, staff1: name }))} allStaffNames={allVisitStaff} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場区分</label>
                <div className="flex flex-wrap gap-1.5">
                  {['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし'].map(o => (
                    <button key={o} type="button" onClick={() => setVisitForm(f => ({ ...f, customer_type: f.customer_type === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${visitForm.customer_type === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ</label>
                <div className="flex gap-1.5">
                  {['有', '無'].map(o => (
                    <button key={o} type="button" onClick={() => setVisitForm(f => ({ ...f, has_appointment: f.has_appointment === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${visitForm.has_appointment === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ内容</label>
                  <input type="text" value={visitForm.appointment_content} onChange={(e) => setVisitForm(f => ({ ...f, appointment_content: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">備考</label>
                  <input type="text" value={visitForm.notes} onChange={(e) => setVisitForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowVisitAddModal(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">キャンセル</button>
                <button type="submit" disabled={visitSaving || !visitForm.customer_name.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                  {visitSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A2-2 編集モーダル */}
      {editVisitRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditVisitRecord(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">来場記録を編集</h3>
              <button onClick={() => setEditVisitRecord(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">イベント</label>
                <div className="flex flex-wrap gap-1.5">
                  {eventNameOptions.map(name => (
                    <button key={name} type="button" onClick={() => setEditVisitForm(f => ({ ...f, model_house_type: name }))} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${editVisitForm.model_house_type === name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{name}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">来場日</label>
                  <input type="date" value={editVisitForm.visit_date || ''} onChange={(e) => setEditVisitForm(f => ({ ...f, visit_date: e.target.value }))} className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">予約</label>
                  <div className="flex gap-1.5">
                    {['予約あり', '予約なし'].map(o => (
                      <button key={o} type="button" onClick={() => setEditVisitForm(f => ({ ...f, reservation: f.reservation === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editVisitForm.reservation === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">お客様氏名</label>
                <input type="text" value={editVisitForm.customer_name || ''} onChange={(e) => setEditVisitForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <StaffSelector category={editVisitForm.model_house_type || ''} value={editVisitForm.staff1 || ''} onChange={(name) => setEditVisitForm(f => ({ ...f, staff1: name }))} allStaffNames={allVisitStaff} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">来場区分</label>
                <div className="flex flex-wrap gap-1.5">
                  {['新築新規', '新築再来', 'リフォーム新規', 'リフォーム再来', '計画なし'].map(o => (
                    <button key={o} type="button" onClick={() => setEditVisitForm(f => ({ ...f, customer_type: f.customer_type === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editVisitForm.customer_type === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ</label>
                <div className="flex gap-1.5">
                  {['有', '無'].map(o => (
                    <button key={o} type="button" onClick={() => setEditVisitForm(f => ({ ...f, has_appointment: f.has_appointment === o ? '' : o }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${editVisitForm.has_appointment === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">次アポ内容</label>
                  <input type="text" value={editVisitForm.appointment_content || ''} onChange={(e) => setEditVisitForm(f => ({ ...f, appointment_content: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">備考</label>
                  <input type="text" value={editVisitForm.notes || ''} onChange={(e) => setEditVisitForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { if (editVisitRecord && confirm('この記録を削除しますか？')) { handleVisitDelete(editVisitRecord.id); setEditVisitRecord(null) } }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />削除
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditVisitRecord(null)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">キャンセル</button>
                  <button type="button" onClick={handleVisitEditSave} disabled={visitSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    {visitSaving && <Loader2 className="w-4 h-4 animate-spin" />}保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* イベント登録モーダル */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRegister(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[1100px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">{editingEventId ? 'イベント編集' : 'イベント登録'}</h3>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* セクションナビ（左サイド） */}
              <div className="w-36 flex-shrink-0 border-r border-slate-200 bg-slate-50 py-3 px-2 space-y-1">
                {[
                  { id: 'section-basic', label: '基本情報' },
                  { id: 'section-promotion', label: 'プロモーション' },
                  { id: 'section-reservation', label: '予約' },
                  { id: 'section-result', label: '来場結果' },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
              {/* コンテンツ（右側） */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* ===== 基本情報 ===== */}
              <div id="section-basic">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-300 pb-1 mb-4">基本情報</h4>
                <div className="space-y-4">
                  {/* イベント名・URL + サムネイル */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">イベント名 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="例: 松本市完成お披露目会"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">イベントURL</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={form.event_url}
                            onChange={(e) => setForm((p) => ({ ...p, event_url: e.target.value }))}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="https://..."
                          />
                          {form.event_url.trim() && (
                            <a
                              href={form.event_url.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                            >
                              <ExternalLink className="w-4 h-4" />
                              開く
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">サムネイル</label>
                      {form.thumbnailPreview ? (
                        <div className="relative">
                          <img src={form.thumbnailPreview} alt="preview" className="w-36 h-[88px] object-cover rounded-lg border border-slate-200" />
                          <button
                            onClick={() => setForm((p) => ({ ...p, thumbnail: null, thumbnailPreview: null }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-36 h-[88px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                          <ImagePlus className="w-6 h-6 text-slate-400" />
                          <span className="text-xs text-slate-400 mt-1">画像を選択</span>
                          <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 事業部・ブランド・開催店舗 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">事業部 <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        {DIVISIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => setForm((p) => ({ ...p, division: d, brand: '' }))}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              form.division === d
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">ブランド</label>
                      {form.division === '新築' ? (
                        <select
                          value={form.brand}
                          onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="">選択してください</option>
                          {BRANDS['新築'].map((b) => (
                            <option key={b.short} value={b.short}>{b.label}（{b.short}）</option>
                          ))}
                        </select>
                      ) : (
                        <select disabled className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400">
                          <option>-</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">開催店舗</label>
                      <select
                        value={form.store_name}
                        onChange={(e) => setForm((p) => ({ ...p, store_name: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">選択してください</option>
                        {STORES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* イベント種別 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">イベント種別</label>
                    <select
                      value={form.event_type}
                      onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">選択してください</option>
                      {eventTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__custom__">その他（手入力）</option>
                    </select>
                    {form.event_type === '__custom__' && (
                      <input
                        type="text"
                        value={form.customEventType}
                        onChange={(e) => setForm((p) => ({ ...p, customEventType: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="種別名を入力"
                      />
                    )}
                  </div>

                  {/* イベント日程 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">イベント日程 <span className="text-red-500">*</span></label>
                    <div className="space-y-2">
                      {form.dates.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 whitespace-nowrap">{i + 1}日目</span>
                          <input
                            type="date"
                            value={d}
                            onChange={(e) => handleDateChange(i, e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          {form.dates.length > 1 && (
                            <button onClick={() => removeDate(i)} className="text-slate-400 hover:text-red-500 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addDate} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        + 日程を追加
                      </button>
                    </div>
                  </div>

                  {/* 開催エリア・GoogleMap */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">開催エリア</label>
                      <input
                        type="text"
                        value={form.area}
                        onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="例: 松本市"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">GoogleMap URL</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={form.google_map_url}
                          onChange={(e) => setForm((p) => ({ ...p, google_map_url: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="https://maps.google.com/..."
                        />
                        {form.google_map_url.trim() && (
                          <a
                            href={form.google_map_url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            <ExternalLink className="w-4 h-4" />
                            開く
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 備考 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">備考</label>
                    <textarea
                      value={form.note}
                      onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      placeholder="備考を入力"
                    />
                  </div>
                </div>
              </div>

              {/* ===== プロモーション ===== */}
              <div id="section-promotion">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-300 pb-1 mb-4">プロモーション</h4>
                <p className="text-sm text-slate-400">準備中</p>
              </div>

              {/* ===== 予約 ===== */}
              <div id="section-reservation">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-300 pb-1 mb-4">予約</h4>
                <p className="text-sm text-slate-400">準備中</p>
              </div>

              {/* ===== 来場結果 ===== */}
              <div id="section-result">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-300 pb-1 mb-4">来場結果</h4>
                <p className="text-sm text-slate-400">準備中</p>
              </div>
            </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-200">
              <button
                onClick={() => setShowRegister(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingEventId ? '更新' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
