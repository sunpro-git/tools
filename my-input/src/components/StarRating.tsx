import { Star } from 'lucide-react'

interface Props {
  rating: number | null
  onChange: (rating: number | null) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function StarRating({ rating, onChange, size = 'md', disabled = false }: Props) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'

  return (
    <div className={`flex items-center gap-0.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange(rating === value ? null : value)
          }}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`${iconSize} ${
              rating !== null && value <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
