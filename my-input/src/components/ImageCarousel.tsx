import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt?: string
  className?: string
  aspectRatio?: 'video' | 'square'
}

export default function ImageCarousel({ images, alt = '', className = '', aspectRatio = 'video' }: Props) {
  const [current, setCurrent] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const touchRef = useRef<{ startX: number; startY: number; locked: boolean | null }>({ startX: 0, startY: 0, locked: null })

  const goPrev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length])
  const goNext = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])

  if (images.length === 0) return null

  const aspect = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    goPrev()
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    goNext()
  }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    if (images.length <= 1) return
    const touch = e.touches[0]
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, locked: null }
    setSwiping(true)
    setOffsetX(0)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swiping || images.length <= 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchRef.current.startX
    const dy = touch.clientY - touchRef.current.startY

    // Determine direction lock on first significant move
    if (touchRef.current.locked === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        touchRef.current.locked = Math.abs(dx) > Math.abs(dy) // true = horizontal
      }
      return
    }

    if (!touchRef.current.locked) {
      // Vertical scroll — abort swipe
      setSwiping(false)
      setOffsetX(0)
      return
    }

    // Horizontal swipe — prevent page scroll and show drag feedback
    e.preventDefault()
    setOffsetX(dx)
  }

  function onTouchEnd() {
    if (!swiping) return
    const threshold = 50
    if (offsetX < -threshold) {
      goNext()
    } else if (offsetX > threshold) {
      goPrev()
    }
    setSwiping(false)
    setOffsetX(0)
    touchRef.current.locked = null
  }

  return (
    <div
      className={`relative ${aspect} ${className} overflow-hidden`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex h-full"
        style={{
          width: `${images.length * 100}%`,
          transform: `translateX(calc(-${current * (100 / images.length)}% + ${offsetX}px))`,
          transition: swiping ? 'none' : 'transform 300ms ease-out',
        }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            className="h-full object-cover shrink-0"
            style={{ width: `${100 / images.length}%` }}
            draggable={false}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
