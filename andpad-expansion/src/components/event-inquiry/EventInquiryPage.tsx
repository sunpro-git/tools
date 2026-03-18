import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Flag, Loader2, Plus, ClipboardEdit, X, Trash2, ImagePlus, Pencil, ExternalLink } from 'lucide-react'
import type { Event, EventVisitor } from '../../types/database'

interface EventWithVisitors extends Event {
  visitors: EventVisitor[]
  visitorCount: number
  newVisitorCount: number
  existingVisitorCount: number
  appointmentCount: number
}

const DIVISIONS = ['新築', 'リフォーム'] as const
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

  const totalVisitors = useMemo(() => events.reduce((s, e) => s + e.visitorCount, 0), [events])
  const totalAppointments = useMemo(() => events.reduce((s, e) => s + e.appointmentCount, 0), [events])

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
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg">
                <Flag className="w-5 h-5" />B
              </span>
              イベント反響
            </h1>
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="text-slate-500">来場数</span>
              <span className="text-lg font-bold text-slate-900">{totalVisitors.toLocaleString()}</span>
              <span className="text-slate-500 ml-3">アポイント数</span>
              <span className="text-lg font-bold text-red-600">{totalAppointments.toLocaleString()}</span>
            </div>
          </div>
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
      </div>

      {/* イベント一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-slate-500">読み込み中...</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">イベントデータがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
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
                {events.map((ev, idx) => {
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
