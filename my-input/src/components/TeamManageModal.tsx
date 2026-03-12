import { useState } from 'react'
import { X, Plus, Pencil, Trash2, Check, XIcon } from 'lucide-react'
import type { Team, User } from '../types/database'

interface Props {
  teams: Team[]
  users: User[]
  onAdd: (name: string) => Promise<void>
  onUpdate: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function TeamManageModal({ teams, users, onAdd, onUpdate, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function getMemberCount(teamId: string) {
    return users.filter(u => u.team_id === teamId).length
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    setError('')
    try {
      await onAdd(newName.trim())
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    setSaving(true)
    setError('')
    try {
      await onUpdate(id, editingName.trim())
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const count = getMemberCount(id)
    const msg = count > 0
      ? `このチームには${count}人のメンバーがいます。削除すると未所属になります。削除しますか？`
      : 'このチームを削除しますか？'
    if (!confirm(msg)) return

    setSaving(true)
    setError('')
    try {
      await onDelete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 max-w-sm w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-5">チーム管理</h2>

        {/* Team list */}
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {teams.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">チームがありません</p>
          )}
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 group">
              {editingId === team.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(team.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                    disabled={saving}
                  />
                  <button
                    onClick={() => handleUpdate(team.id)}
                    disabled={saving || !editingName.trim()}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-900">{team.name}</span>
                  <span className="text-xs text-gray-400">{getMemberCount(team.id)}人</span>
                  <button
                    onClick={() => { setEditingId(team.id); setEditingName(team.name); setError('') }}
                    className="p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new team */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="新しいチーム名..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={saving}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  )
}
