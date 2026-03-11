import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { User } from '../types/database'
import { USER_COLOR_OPTIONS, USER_ICON_OPTIONS, getUserColor } from '../lib/userColor'
import UserAvatar from './UserAvatar'

interface Props {
  user?: User
  onSave: (data: { name: string; color: string; icon: string }) => Promise<void>
  onCancel: () => void
  saving: boolean
  error?: string
}

export default function UserEditModal({ user, onSave, onCancel, saving, error }: Props) {
  const [name, setName] = useState(user?.name || '')
  const [color, setColor] = useState(user?.color || USER_COLOR_OPTIONS[0].key)
  const [icon, setIcon] = useState(user?.icon || USER_ICON_OPTIONS[0].key)

  const isEdit = !!user

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await onSave({ name: name.trim(), color, icon })
  }

  const previewUser = { name: name || '?', color, icon }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 max-w-sm w-full p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {isEdit ? 'ユーザーを編集' : '新しいユーザー'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex justify-center">
            <UserAvatar user={previewUser} size="lg" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ユーザー名..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">カラー</label>
            <div className="flex gap-2 flex-wrap">
              {USER_COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all ${
                    color === c.key
                      ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                      : 'hover:scale-105'
                  }`}
                >
                  {color === c.key && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">アイコン</label>
            <div className="grid grid-cols-5 gap-2">
              {USER_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon
                const bgClass = getUserColor('', undefined, color)
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIcon(opt.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      icon === opt.key
                        ? 'bg-gray-100 ring-2 ring-gray-900'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-white`}>
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] text-gray-500">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '保存中...' : isEdit ? '保存' : '追加して選択'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
