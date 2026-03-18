import { AlertTriangle, Pin, ThumbsUp } from 'lucide-react'
import { SakuraIcon } from './icons'

interface Props {
  isAdopted: boolean
  isMouFurui: boolean
  isMouBimyou: boolean
  isStocked: boolean
  onToggleAdopted: () => void
  onToggleMouFurui: () => void
  onToggleMouBimyou: () => void
  onToggleStocked: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function FeedbackButtons({
  isAdopted,
  isMouFurui,
  isMouBimyou,
  isStocked,
  onToggleAdopted,
  onToggleMouFurui,
  onToggleMouBimyou,
  onToggleStocked,
  size = 'md',
  disabled = false,
}: Props) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const btnPadding = size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <div className={`flex items-center gap-0.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* 採用した */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleAdopted() }}
        className={`${btnPadding} rounded-full hover:bg-pink-50 transition-colors`}
        title="採用した"
      >
        <SakuraIcon
          className={`${iconSize} ${
            isAdopted ? 'text-pink-500' : 'text-gray-300 hover:text-pink-400'
          }`}
          filled={isAdopted}
        />
      </button>

      {/* シェアしたい */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleMouFurui() }}
        className={`${btnPadding} rounded-full hover:bg-violet-50 transition-colors`}
        title="シェアしたい"
      >
        <ThumbsUp
          className={`${iconSize} ${
            isMouFurui ? 'fill-violet-400 text-violet-500' : 'text-gray-300 hover:text-violet-400'
          }`}
        />
      </button>

      {/* ストック */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleStocked() }}
        className={`${btnPadding} rounded-full hover:bg-blue-50 transition-colors`}
        title="ストック"
      >
        <Pin
          className={`${iconSize} ${
            isStocked ? 'fill-blue-500 text-blue-500' : 'text-gray-300 hover:text-blue-400'
          }`}
        />
      </button>

      {/* 微妙 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleMouBimyou() }}
        className={`${btnPadding} rounded-full hover:bg-amber-50 transition-colors`}
        title="微妙"
      >
        <AlertTriangle
          className={`${iconSize} ${
            isMouBimyou ? 'fill-amber-400 text-amber-500' : 'text-gray-300 hover:text-amber-400'
          }`}
        />
      </button>
    </div>
  )
}
