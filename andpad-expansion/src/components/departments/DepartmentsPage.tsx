import { supabase } from '../../lib/supabase'
import { useDepartments, BUSINESS_TYPES } from '../../hooks/useDepartments'
import { useBusinessType } from '../../hooks/useBusinessType'
import { Loader2, Plus, Pencil, Trash2, X, Check, Building2, GripVertical } from 'lucide-react'
import { useState } from 'react'

export default function DepartmentsPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const { departments, loading, fetchDepartments } = useDepartments(businessType)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)

  const startAdd = () => {
    setAdding(true)
    setEditing(null)
    const maxOrder = departments.length > 0 ? Math.max(...departments.map((d) => d.sort_order)) : 0
    setForm({ name: '', sort_order: maxOrder + 1 })
  }

  const startEdit = (dept: typeof departments[0]) => {
    setEditing(dept.id)
    setAdding(false)
    setForm({ name: dept.name, sort_order: dept.sort_order })
  }

  const cancel = () => {
    setEditing(null)
    setAdding(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('departments').update({ name: form.name.trim(), sort_order: form.sort_order }).eq('id', editing)
    } else {
      await supabase.from('departments').insert({ name: form.name.trim(), sort_order: form.sort_order, business_type: businessType })
    }
    setSaving(false)
    setEditing(null)
    setAdding(false)
    setForm({ name: '', sort_order: 0 })
    fetchDepartments()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この部門を削除しますか？\n※関連する担当者・目標データには影響しません')) return
    await supabase.from('departments').delete().eq('id', id)
    fetchDepartments()
  }

  const moveUp = async (idx: number) => {
    if (idx === 0) return
    const curr = departments[idx]
    const prev = departments[idx - 1]
    await Promise.all([
      supabase.from('departments').update({ sort_order: prev.sort_order }).eq('id', curr.id),
      supabase.from('departments').update({ sort_order: curr.sort_order }).eq('id', prev.id),
    ])
    fetchDepartments()
  }

  const moveDown = async (idx: number) => {
    if (idx === departments.length - 1) return
    const curr = departments[idx]
    const next = departments[idx + 1]
    await Promise.all([
      supabase.from('departments').update({ sort_order: next.sort_order }).eq('id', curr.id),
      supabase.from('departments').update({ sort_order: curr.sort_order }).eq('id', next.id),
    ])
    fetchDepartments()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            部門管理
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="text-sm font-semibold px-2 py-0.5 rounded-lg border-0 cursor-pointer text-white"
              style={{ backgroundColor: businessType === '新築' ? '#15803d' : businessType === 'リフォーム' ? '#d97706' : '#1e40af' }}
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt} className="bg-white text-slate-700">{bt}</option>)}
            </select>
          </h1>
          <button onClick={startAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" />追加
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">担当者管理・目標管理で使用する部門を管理します。並び順は矢印で変更できます。</p>
      </div>

      {(adding || editing) && (
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{editing ? '部門を編集' : '部門を追加'}</h3>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">部門名</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48" placeholder="例：中信1課" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">並び順</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-20" />
            </div>
            <button onClick={handleSave} disabled={!form.name.trim() || saving}
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

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-xs text-slate-500">読み込み中...</span>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="w-10 py-2 px-3 border-b border-slate-200"></th>
                <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700">部門名</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-20">並び順</th>
                <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-400">部門が登録されていません</td></tr>
              ) : departments.map((dept, idx) => (
                <tr key={dept.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="py-1.5 px-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-20 text-[10px] leading-none">▲</button>
                      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                      <button onClick={() => moveDown(idx)} disabled={idx === departments.length - 1}
                        className="text-slate-400 hover:text-slate-600 disabled:opacity-20 text-[10px] leading-none">▼</button>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 font-medium text-slate-800">{dept.name}</td>
                  <td className="py-1.5 px-3 text-center text-slate-500">{dept.sort_order}</td>
                  <td className="py-1.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(dept)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(dept.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
