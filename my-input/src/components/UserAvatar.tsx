import { getUserColor, getUserIcon } from '../lib/userColor'

interface UserAvatarUser {
  name: string
  color?: string | null
  icon?: string | null
}

interface Props {
  user: UserAvatarUser
  users?: { name: string }[]
  size: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: { container: 'w-4 h-4',   icon: 'w-2.5 h-2.5', text: 'text-[8px]' },
  sm: { container: 'w-5 h-5',   icon: 'w-3 h-3',     text: 'text-[10px]' },
  md: { container: 'w-7 h-7',   icon: 'w-4 h-4',     text: 'text-xs' },
  lg: { container: 'w-10 h-10', icon: 'w-5 h-5',     text: 'text-lg' },
}

export default function UserAvatar({ user, users, size, className = '' }: Props) {
  const s = sizeMap[size]
  const bgColor = getUserColor(user.name, users, user.color)
  const IconComponent = getUserIcon(user.icon)

  return (
    <span className={`inline-flex items-center justify-center rounded-full ${bgColor} text-white font-bold leading-none shrink-0 ${s.container} ${className}`}>
      {IconComponent ? (
        <IconComponent className={s.icon} />
      ) : (
        <span className={s.text}>{user.name.charAt(0)}</span>
      )}
    </span>
  )
}
