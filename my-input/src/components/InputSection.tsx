import { ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'
import type { Content, User } from '../types/database'

interface Props {
  title: string
  bannerLabel?: string
  items: Content[]
  totalCount: number
  onViewMore: () => void
  onCardClick: (id: string) => void
  onFeedbackChange: (id: string, fields: Partial<Content>) => void
  onLikeToggle?: (id: string) => void
  onTagClick?: (tag: string) => void
  currentUserId?: string
  showUser?: boolean
  users?: User[]
}

export default function InputSection({ title, bannerLabel, items, totalCount, onViewMore, onCardClick, onFeedbackChange, onLikeToggle, onTagClick, currentUserId, showUser = false, users }: Props) {
  return (
    <section className="mb-10">
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button
          onClick={onViewMore}
          className="flex items-center gap-1 ml-3 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
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
            onTagClick={onTagClick}
            isOwner={currentUserId ? content.user_id === currentUserId : true}
            showUser={showUser}
            users={users}
          />
        ))}
      </div>

      {/* Mobile: view all banner */}
      {totalCount > items.length && (
        <button
          onClick={onViewMore}
          className="sm:hidden w-full mt-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 active:bg-emerald-100 flex items-center justify-center gap-1"
        >
          {bannerLabel || title} {totalCount}件をすべて見る
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </section>
  )
}
