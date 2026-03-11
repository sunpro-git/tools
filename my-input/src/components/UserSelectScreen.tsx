import { useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'
import type { User } from '../types/database'
import UserAvatar from './UserAvatar'
import UserEditModal from './UserEditModal'
import AppIcon from './AppIcon'

interface Props {
  users: User[]
  onSelect: (user: User) => void
  onAddUser: (name: string, color: string, icon: string) => Promise<User>
  onEditUser: (id: string, data: { name: string; color: string; icon: string }) => Promise<void>
  loading: boolean
}

export default function UserSelectScreen({ users, onSelect, onAddUser, onEditUser, loading }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleAdd(data: { name: string; color: string; icon: string }) {
    setSaving(true)
    setSaveError('')
    try {
      const user = await onAddUser(data.name, data.color, data.icon)
      setShowAddModal(false)
      onSelect(user)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: { name: string; color: string; icon: string }) {
    if (!editingUser) return
    setSaving(true)
    setSaveError('')
    try {
      await onEditUser(editingUser.id, data)
      setEditingUser(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-sm w-full">
        <div className="text-center mb-8">
          <AppIcon className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">MY INPUT</h1>
          <p className="text-sm text-gray-500">
            この端末で使うユーザーを選択してください
          </p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 group">
              <button
                onClick={() => onSelect(user)}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <UserAvatar user={user} users={users} size="lg" />
                <span className="text-base font-medium text-gray-900">
                  {user.name}
                </span>
              </button>
              <button
                onClick={() => { setEditingUser(user); setSaveError('') }}
                className="p-2 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-100"
                title="編集"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add user button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => { setShowAddModal(true); setSaveError('') }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            新しいユーザーを追加
          </button>
        </div>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <UserEditModal
          onSave={handleAdd}
          onCancel={() => { setShowAddModal(false); setSaveError('') }}
          saving={saving}
          error={saveError}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onSave={handleEdit}
          onCancel={() => { setEditingUser(null); setSaveError('') }}
          saving={saving}
          error={saveError}
        />
      )}
    </div>
  )
}
