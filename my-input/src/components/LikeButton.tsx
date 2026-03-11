import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart } from 'lucide-react'

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

export default function LikeButton({ likesCount, isLikedByMe, onToggle, size = 'sm', isOwner = false }: Props) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const btnPadding = size === 'sm' ? 'p-1' : 'p-1.5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  const [hearts, setHearts] = useState<FloatingHeart[]>([])
  const [animKey, setAnimKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLikesRef = useRef(likesCount)
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

  // Trigger when likes count increases
  useEffect(() => {
    if (isOwner && likesCount > prevLikesRef.current) {
      triggerAnimation()
    }
    prevLikesRef.current = likesCount
  }, [isOwner, likesCount, triggerAnimation])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className={`${btnPadding} rounded-full hover:bg-red-50 transition-colors flex items-center gap-0.5`}
        title="いいね"
      >
        <Heart
          className={`${iconSize} ${
            isLikedByMe
              ? 'fill-red-500 text-red-500'
              : 'text-gray-300 hover:text-red-400'
          } transition-colors`}
        />
        {likesCount > 0 && (
          <span className={`${textSize} ${isLikedByMe ? 'text-red-500' : 'text-gray-400'} font-medium min-w-[1ch]`}>
            {likesCount}
          </span>
        )}
      </button>

      {/* Floating hearts animation */}
      {hearts.length > 0 && (
        <div key={animKey} className="absolute bottom-full left-1/2 pointer-events-none" style={{ zIndex: 50 }}>
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
