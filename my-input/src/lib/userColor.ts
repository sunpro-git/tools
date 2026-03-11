import { Smile, Cat, Dog, Rocket, Flame, Leaf, Music, Zap, Crown, Ghost, Mountain, Sun, Fish } from 'lucide-react'
import { PencilIcon } from '../components/icons'
import { PoodleIcon } from '../components/icons'
import type { ComponentType } from 'react'

export const USER_COLOR_OPTIONS = [
  { key: 'blue',    bg: 'bg-blue-500'    },
  { key: 'emerald', bg: 'bg-emerald-500' },
  { key: 'purple',  bg: 'bg-purple-500'  },
  { key: 'orange',  bg: 'bg-orange-500'  },
  { key: 'pink',    bg: 'bg-pink-500'    },
  { key: 'teal',    bg: 'bg-teal-500'    },
  { key: 'amber',   bg: 'bg-amber-500'   },
  { key: 'indigo',  bg: 'bg-indigo-500'  },
] as const

export type UserColorKey = typeof USER_COLOR_OPTIONS[number]['key']

export const USER_ICON_OPTIONS = [
  { key: 'smile',  icon: Smile,  label: 'スマイル' },
  { key: 'cat',    icon: Cat,    label: 'ネコ' },
  { key: 'dog',    icon: Dog,    label: 'イヌ' },
  { key: 'poodle', icon: PoodleIcon, label: 'チワプー' },
  { key: 'rocket', icon: Rocket, label: 'ロケット' },
  { key: 'flame',  icon: Flame,  label: '炎' },
  { key: 'leaf',   icon: Leaf,   label: '葉' },
  { key: 'music',  icon: Music,  label: '音符' },
  { key: 'zap',    icon: Zap,    label: '稲妻' },
  { key: 'crown',  icon: Crown,  label: '王冠' },
  { key: 'ghost',  icon: Ghost,  label: 'ゴースト' },
  { key: 'mountain', icon: Mountain, label: '山' },
  { key: 'fish',    icon: Fish,           label: '魚' },
  { key: 'sun',     icon: Sun,            label: '太陽' },
  { key: 'pencil',  icon: PencilIcon,     label: 'えんぴつ' },
] as const

export type UserIconKey = typeof USER_ICON_OPTIONS[number]['key']

interface HasName {
  name: string
}

const COLOR_BG_CLASSES = USER_COLOR_OPTIONS.map(c => c.bg)

/**
 * Get a background color class for a user.
 * If the user has a chosen color, use it directly.
 * Otherwise fall back to algorithmic assignment.
 */
export function getUserColor(name: string, users?: HasName[], userColor?: string | null): string {
  if (userColor) {
    const found = USER_COLOR_OPTIONS.find(c => c.key === userColor)
    if (found) return found.bg
  }
  if (users && users.length > 0) {
    const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name))
    const idx = sorted.findIndex(u => u.name === name)
    if (idx >= 0) {
      return COLOR_BG_CLASSES[idx % COLOR_BG_CLASSES.length]
    }
  }
  // Fallback: hash-based
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) + hash)
  }
  return COLOR_BG_CLASSES[Math.abs(hash) % COLOR_BG_CLASSES.length]
}

/**
 * Get the lucide icon component for a given icon key.
 * Returns null if no matching icon.
 */
export function getUserIcon(iconKey: string | null | undefined): ComponentType<{ className?: string }> | null {
  if (!iconKey) return null
  const found = USER_ICON_OPTIONS.find(i => i.key === iconKey)
  return found?.icon || null
}
