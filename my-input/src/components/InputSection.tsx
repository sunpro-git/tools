import { ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'
import type { Content } from '../types/database'

interface Props {
  title: string
  items: Content[]
  totalCount: number
  onViewMore: () => void
  onCardClick: (id: string) => void
  onFeedbackChange: (id: string, fields: Partial<Content>) => void
  onLikeToggle?: (id: string) => void
  currentUserId?: string
  showUser?: boolean
}

export default function InputSection({ title, items, totalCount, onViewMore, onCardClick, onFeedbackChange, onLikeToggle, currentUserId, showUser = false }: Props) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button
          onClick={onViewMore}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          VIEW MORE ({totalCount})
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {items.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onClick={() => onCardClick(content.id)}
            onFeedbackChange={onFeedbackChange}
            onLikeToggle={onLikeToggle}
            isOwner={currentUserId ? content.user_id === currentUserId : true}
            showUser={showUser}
          />
        ))}
      </div>
    </section>
  )
}
