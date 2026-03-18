import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart } from 'lucide-react'
import type { User } from '../types/database'

const HEART_COLORS = [
  '#ef4444', '#f87171', '#dc2626',
  '#ec4899', '#f472b6', '#db2777',
  '#e11d48', '#f43f5e', '#c026d3', '#a855f7',
]

interface FloatingHeart {
  id: number
  x: number
  delay: number
  duration: number
  size: number
  color: string
  opacity: number
}

interface Props {
  likesCount: number
  isLikedByMe: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  isOwner?: boolean
  likedUserIds?: string[]
  users?: User[]
}

function generateHearts(): FloatingHeart[] {
  const count = 12 + Math.floor(Math.random() * 8)
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 30,
    delay: Math.random() * 0.8,
    duration: 1.0 + Math.random() * 0.8,
    size: 5 + Math.random() * 7,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    opacity: 0.5 + Math.random() * 0.4,
  }))
}

export default function LikeButton({ likesCount, isLikedByMe, onToggle, size = 'sm', isOwner = false, likedUserIds = [], users = [] }: Props) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const btnPadding = size === 'sm' ? 'p-1' : 'p-1.5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  const [hearts, setHearts] = useState<FloatingHeart[]>([])
  const [animKey, setAnimKey] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLikesRef = useRef(likesCount)
  const prevIsLikedRef = useRef(isLikedByMe)
  const hasBeenVisibleRef = useRef(false)

  const triggerAnimation = useCallback(() => {
    setHearts(generateHearts())
    setAnimKey(k => k + 1)
  }, [])

  // Trigger on scroll into view (IntersectionObserver)
  useEffect(() => {
    if (!isOwner || likesCount <= 0) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisibleRef.current) {
          hasBeenVisibleRef.current = true
          triggerAnimation()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isOwner, likesCount > 0, triggerAnimation])

  // Trigger when likes count increases (owner receives a like)
  useEffect(() => {
    if (isOwner && likesCount > prevLikesRef.current) {
      triggerAnimation()
    }
    prevLikesRef.current = likesCount
  }, [isOwner, likesCount, triggerAnimation])

  // Trigger when I like someone else's post
  useEffect(() => {
    if (!isOwner && isLikedByMe && !prevIsLikedRef.current) {
      triggerAnimation()
    }
    prevIsLikedRef.current = isLikedByMe
  }, [isOwner, isLikedByMe, triggerAnimation])

  // Build liked user names for tooltip
  const likedUserNames = likedUserIds
    .map(id => users.find(u => u.id === id)?.name)
    .filter(Boolean) as string[]

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        onMouseEnter={() => likedUserNames.length > 0 && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => { if (likedUserNames.length > 0) { setShowTooltip(true); setTimeout(() => setShowTooltip(false), 2000) } }}
        className={`${btnPadding} rounded-full hover:bg-red-50 transition-colors flex items-center gap-0.5`}
        title=""
      >
        <Heart
          className={`${iconSize} ${
            isLikedByMe
              ? 'fill-red-500 text-red-500'
              : 'text-pink-300 hover:text-red-400 animate-heart-nudge'
          } transition-colors`}
        />
        {likesCount > 0 && (
          <span className={`${textSize} ${isLikedByMe ? 'text-red-500' : 'text-gray-400'} font-medium min-w-[1ch]`}>
            {likesCount}
          </span>
        )}
      </button>

      {/* Liked users tooltip */}
      {showTooltip && likedUserNames.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 bg-red-500 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
          {likedUserNames.join('、')}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500" />
        </div>
      )}

      {/* Floating hearts animation */}
      {hearts.length > 0 && (
        <div key={animKey} className="absolute bottom-full pointer-events-none" style={{ zIndex: 50, left: 'calc(50% - 4px)' }}>
          {hearts.map(heart => (
            <svg
              key={heart.id}
              viewBox="0 0 24 24"
              fill={heart.color}
              className="absolute"
              style={{
                width: heart.size,
                height: heart.size,
                left: heart.x,
                bottom: 0,
                opacity: 0,
                '--heart-opacity': String(heart.opacity),
                animation: `float-heart ${heart.duration}s ease-out ${heart.delay}s both`,
              } as React.CSSProperties}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ))}
        </div>
      )}
    </div>
  )
}
