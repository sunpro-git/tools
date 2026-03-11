import { useState } from 'react'
import { Clock, Loader2, AlertCircle, FileText, Twitter, Instagram, Youtube, Globe, MessageSquare } from 'lucide-react'
import type { Content, User } from '../types/database'
import { getPlatformLabel, getPlatformColor } from '../lib/platform'
import type { Platform } from '../types/database'
import StarRating from './StarRating'
import FeedbackButtons from './FeedbackButtons'
import LikeButton from './LikeButton'

interface Props {
  content: Content
  onClick: () => void
  onFeedbackChange: (id: string, fields: Partial<Content>) => void
  onLikeToggle?: (id: string) => void
  isOwner?: boolean
  showUser?: boolean
  users?: User[]
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const cls = className || 'w-4 h-4'
  switch (platform) {
    case 'note': return <FileText className={cls} />
    case 'x': return <Twitter className={cls} />
    case 'instagram': return <Instagram className={cls} />
    case 'youtube': return <Youtube className={cls} />
    default: return <Globe className={cls} />
  }
}

const platformBgColors: Record<Platform, string> = {
  note: 'bg-green-500',
  x: 'bg-gray-800',
  instagram: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  youtube: 'bg-red-600',
  other: 'bg-blue-500',
}

function StatusDot({ status }: { status: Content['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-yellow-500" />
    case 'processing':
      return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
    case 'completed':
      return null
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-500" />
  }
}

import UserAvatar from './UserAvatar'

export default function ContentCard({ content, onClick, onFeedbackChange, onLikeToggle, isOwner = true, showUser = false, users }: Props) {
  const [showComment, setShowComment] = useState(false)
  const [localComment, setLocalComment] = useState(content.comment || '')

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer relative"
    >
      {/* Thumbnail - 16:9 aspect ratio */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3 border border-gray-200">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const placeholder = target.parentElement!.querySelector('.placeholder') as HTMLElement
              if (placeholder) placeholder.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className={`placeholder absolute inset-0 flex items-center justify-center ${platformBgColors[content.platform]}`}
          style={{ display: content.thumbnail_url ? 'none' : 'flex' }}
        >
          <PlatformIcon platform={content.platform} className="w-12 h-12 text-white/80" />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl" />
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPlatformColor(content.platform, content.url)}`}>
            {getPlatformLabel(content.platform, content.url)}
          </span>
        </div>
        {content.status !== 'completed' && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1">
            <StatusDot status={content.status} />
          </div>
        )}
      </div>

      {/* Content info */}
      <div className="px-1">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-1">
          {content.title || content.url}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {showUser && content.user && (
              <>
                <span className="flex items-center gap-1">
                  <UserAvatar user={content.user} users={users} size="xs" />
                  <span className="text-gray-600 font-medium">{content.user.name}</span>
                </span>
                <span>·</span>
              </>
            )}
            {content.category && (
              <>
                <span className="text-gray-600">{content.category}</span>
                <span>·</span>
              </>
            )}
            <span>{new Date(content.created_at).toLocaleDateString('ja-JP')}</span>
            {content.status !== 'completed' && (
              <>
                <span>·</span>
                <StatusDot status={content.status} />
              </>
            )}
          </div>
          {onLikeToggle && (
            <div onClick={(e) => e.stopPropagation()}>
              <LikeButton
                likesCount={content.likes_count || 0}
                isLikedByMe={content.is_liked_by_me || false}
                onToggle={() => onLikeToggle(content.id)}
                size="sm"
                isOwner={isOwner}
              />
            </div>
          )}
        </div>
        {content.tags && content.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {content.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {content.tags.length > 2 && (
              <span className="text-[10px] text-gray-400">+{content.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Feedback row */}
        <div
          className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <StarRating
            rating={content.rating}
            onChange={(rating) => onFeedbackChange(content.id, { rating })}
            size="sm"
            disabled={!isOwner}
          />
          <div className="flex items-center gap-0.5">
            <FeedbackButtons
              isAdopted={content.is_adopted}
              isMouFurui={content.is_mou_furui}
              isMouBimyou={content.is_mou_bimyou}
              isStocked={content.is_stocked}
              onToggleAdopted={() => onFeedbackChange(content.id, { is_adopted: !content.is_adopted })}
              onToggleMouFurui={() => onFeedbackChange(content.id, { is_mou_furui: !content.is_mou_furui })}
              onToggleMouBimyou={() => onFeedbackChange(content.id, { is_mou_bimyou: !content.is_mou_bimyou })}
              onToggleStocked={() => onFeedbackChange(content.id, { is_stocked: !content.is_stocked })}
              size="sm"
              disabled={!isOwner}
            />
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setLocalComment(content.comment || '')
                  setShowComment(!showComment)
                }}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="コメント"
              >
                <MessageSquare
                  className={`w-3.5 h-3.5 ${
                    content.comment ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Comment popover */}
        {showComment && isOwner && (
          <div
            className="mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={localComment}
              onChange={(e) => setLocalComment(e.target.value)}
              onBlur={() => {
                if (localComment !== (content.comment || '')) {
                  onFeedbackChange(content.id, { comment: localComment || null })
                }
                setShowComment(false)
              }}
              placeholder="コメントを入力..."
              className="w-full text-base border border-gray-200 rounded p-2 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
              rows={3}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  )
}
