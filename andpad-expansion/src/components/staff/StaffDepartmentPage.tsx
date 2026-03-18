import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Plus, Pencil, Trash2, X, Check, Users, Upload, Download, Copy } from 'lucide-react'

const DEPARTMENTS = ['中信1課', '中信2課', '北信3課', '東信4課', '南信5課'] as const

interface StaffDept {
  id: string
  staff_name: string
  department: string
  start_date: string
  end_date: string | null
  note: string | null
}

export default function StaffDepartmentPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<StaffDept[]>([])
  const [filterDept, setFilterDept] = useState<string>('all')
  const [filterName, setFilterName] = useState('')
  const [editing, setEditing] = useState<StaffDept | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ staff_name: '', department: DEPARTMENTS[0] as string, start_date: '', end_date: '', note: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('staff_departments')
      .select('*')
      .order('department')
      .order('staff_name')
      .order('start_date', { ascending: false })
      .limit(5000)
    setRows((data as StaffDept[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = rows.filter((r) => {
    if (filterDept !== 'all' && r.department !== filterDept) return false
    if (filterName && !r.staff_name.includes(filterName)) return false
    return true
  })

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      staff_name: form.staff_name.trim(),
      department: form.department,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      note: form.note || null,
    }
    if (editing) {
      await supabase.from('staff_departments').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('staff_departments').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    setAdding(false)
    setForm({ staff_name: '', department: DEPARTMENTS[0], start_date: '', end_date: '', note: '' })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('staff_departments').delete().eq('id', id)
    fetchData()
  }

  const startEdit = (r: StaffDept) => {
    setEditing(r)
    setAdding(false)
    setForm({
      staff_name: r.staff_name,
      department: r.department,
      start_date: r.start_date,
      end_date: r.end_date || '',
      note: r.note || '',
    })
  }

  const startAdd = () => {
    setAdding(true)
    setEditing(null)
    setForm({ staff_name: '', department: DEPARTMENTS[0], start_date: '', end_date: '', note: '' })
  }

  const cancel = () => {
    setEditing(null)
    setAdding(false)
  }

  const isFormValid = form.staff_name.trim() && form.department

  // 一括登録
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: number; errors: string[] } | null>(null)

  const handleBulkImport = async () => {
    setBulkSaving(true)
    setBulkResult(null)
    const lines = bulkText.split('\n').filter((l) => l.trim())
    const errors: string[] = []
    let success = 0
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split('\t')
      if (cols.length < 2) { errors.push(`行${i + 1}: 列数不足（担当者名・所属課が必要）`); continue }
      const staffName = cols[0].trim()
      const department = cols[1].trim()
      const startDate = cols[2]?.trim() || null
      const endDate = cols[3]?.trim() || null
      const note = cols[4]?.trim() || null
      if (!staffName || !department) { errors.push(`行${i + 1}: 担当者名または所属課が空`); continue }
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { errors.push(`行${i + 1}: 開始日の形式が不正（YYYY-MM-DD）`); continue }
      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) { errors.push(`行${i + 1}: 終了日の形式が不正`); continue }
      const { error } = await supabase.from('staff_departments').insert({ staff_name: staffName, department, start_date: startDate, end_date: endDate, note })
      if (error) { errors.push(`行${i + 1}: ${error.message}`) } else { success++ }
    }
    setBulkSaving(false)
    setBulkResult({ success, errors })
    if (success > 0) fetchData()
  }

  // 一括書き出し
  const [showExport, setShowExport] = useState(false)
  const exportText = rows.map((r) => [r.staff_name, r.department, r.start_date, r.end_date || '', r.note || ''].join('\t')).join('\n')
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 現在所属の担当者数を課ごとにカウント
  const today = new Date().toISOString().slice(0, 10)
  const deptCounts = DEPARTMENTS.map((d) => ({
    dept: d,
    count: rows.filter((r) => r.department === d && r.start_date <= today && (!r.end_date || r.end_date >= today)).length,
  }))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            担当者 所属課管理
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowExport(!showExport); setShowBulkImport(false) }} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              <Download className="w-4 h-4" />一括書き出し
            </button>
            <button onClick={() => { setShowBulkImport(!showBulkImport); setShowExport(false) }} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              <Upload className="w-4 h-4" />一括登録
            </button>
            <button onClick={startAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" />追加
            </button>
          </div>
        </div>

        {/* 課ごとの現在人数 */}
        <div className="flex items-center gap-4 mt-3">
          {deptCounts.map(({ dept, count }) => (
            <div key={dept} className="text-sm">
              <span className="text-slate-500">{dept}</span>
              <span className="ml-1 font-bold text-slate-900">{count}名</span>
            </div>
          ))}
        </div>

        {/* フィルタ */}
        <div className="flex items-center gap-3 mt-3">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white">
            <option value="all">全課</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input
            type="text"
            placeholder="担当者名で検索"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white w-48"
          />
        </div>
      </div>

      {/* 一括登録 */}
      {showBulkImport && (
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">一括登録（タブ区切り）</h3>
          <p className="text-xs text-slate-400 mb-2">形式: 担当者名&#9;所属課&#9;開始日(YYYY-MM-DD)&#9;終了日(任意)&#9;備考(任意)　※1行1件</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono resize-y"
            placeholder={`山田太郎\t中信1課\t2025-09-01\n鈴木花子\t北信3課\t2025-09-01\t2026-03-31\t異動予定`}
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleBulkImport} disabled={!bulkText.trim() || bulkSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              登録
            </button>
            <button onClick={() => { setShowBulkImport(false); setBulkResult(null) }} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">閉じる</button>
            {bulkResult && (
              <span className="text-sm">
                <span className="text-emerald-600 font-semibold">{bulkResult.success}件登録</span>
                {bulkResult.errors.length > 0 && <span className="text-red-600 ml-2">{bulkResult.errors.length}件エラー</span>}
              </span>
            )}
          </div>
          {bulkResult && bulkResult.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-auto border border-red-200 rounded-lg p-2 bg-red-50 text-xs text-red-600">
              {bulkResult.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* 一括書き出し */}
      {showExport && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">一括書き出し（タブ区切り）</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Copy className="w-4 h-4" />{copied ? 'コピーしました' : 'クリップボードにコピー'}
              </button>
              <button onClick={() => setShowExport(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">閉じる</button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-2">形式: 担当者名&#9;所属課&#9;開始日&#9;終了日&#9;備考　（{rows.length}件）</p>
          <textarea
            readOnly
            value={exportText}
            rows={10}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50 resize-y"
          />
        </div>
      )}

      {/* 追加/編集フォーム */}
      {(adding || editing) && (
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{editing ? '編集' : '新規追加'}</h3>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-slate-500 mb-1">担当者名</label>
              <input type="text" value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-40" placeholder="山田太郎" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">所属課</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">開始日</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">終了日（空欄=現在）</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">備考</label>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-40" />
            </div>
            <button onClick={handleSave} disabled={!isFormValid || saving}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing ? '更新' : '追加'}
            </button>
            <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              <X className="w-4 h-4" />キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-slate-500">読み込み中...</span>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">担当者名</th>
                <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">所属課</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">開始日</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">終了日</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">状態</th>
                <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">備考</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">データなし</td></tr>
              ) : filtered.map((r) => {
                const isCurrent = r.start_date <= today && (!r.end_date || r.end_date >= today)
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 border-b border-slate-100 ${isCurrent ? '' : 'opacity-50'}`}>
                    <td className="py-1.5 px-3 font-medium text-slate-800">{r.staff_name}</td>
                    <td className="py-1.5 px-3 text-slate-700">{r.department}</td>
                    <td className="py-1.5 px-3 text-center text-slate-600">{r.start_date}</td>
                    <td className="py-1.5 px-3 text-center text-slate-600">{r.end_date || '-'}</td>
                    <td className="py-1.5 px-3 text-center">
                      {isCurrent
                        ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">現在</span>
                        : <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">過去</span>}
                    </td>
                    <td className="py-1.5 px-3 text-slate-500 text-xs">{r.note || '-'}</td>
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(r)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
