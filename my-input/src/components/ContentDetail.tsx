import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ExternalLink, Trash2, RefreshCw, Loader2, MessageSquare, Share2, Check } from 'lucide-react'
import type { Content, User } from '../types/database'
import { fetchContentById, deleteContent, processContent, updateContentFeedback, toggleLike, fetchLikesForContents } from '../lib/api'
import { getPlatformLabel, getPlatformColor, extractYoutubeVideoId, getYoutubeEmbedUrl } from '../lib/platform'
import StarRating from './StarRating'
import FeedbackButtons from './FeedbackButtons'
import LikeButton from './LikeButton'
import ImageCarousel from './ImageCarousel'

interface Props {
  contentId: string
  currentUserId: string
  users?: User[]
  onBack: () => void
  onDeleted: () => void
}

function isEmojiUrl(url: string): boolean {
  return /twimg\.com\/emoji\//.test(url) || /emoji/i.test(url)
}

function renderInlineMarkdown(text: string) {
  // Bold + inline images + markdown links
  const parts = text.split(/(\*\*[\s\S]*?\*\*|!\[.*?\]\(.*?\)|\[.*?\]\(https?:\/\/[^\s)]+\))/g)
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*([\s\S]*?)\*\*$/)
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>
    }
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/)
    if (imgMatch) {
      const alt = imgMatch[1]
      const src = imgMatch[2]
      if (isEmojiUrl(src)) {
        return (
          <img
            key={i}
            src={src}
            alt={alt}
            className="inline-block w-5 h-5 align-text-bottom"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )
      }
      return (
        <span key={i} className="block my-4">
          <img
            src={src}
            alt={alt}
            className="w-full rounded"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </span>
      )
    }
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" className="text-blue-600 hover:text-blue-800 underline">
          {linkMatch[1] || linkMatch[2]}
        </a>
      )
    }
    return part
  })
}

/** Check if image URL is a site UI element (logo, icon, banner, nav button) */
function isSiteUiImage(url: string): boolean {
  return /style_images|icon_|logo_|_btn\.|bnr_|side_bnr|thumb-120x120|cate_shousai/i.test(url)
}

function RenderedText({ text }: { text: string }) {
  // Clean leftover markdown remnants (keep valid links and images intact)
  const cleaned = text
    // Fix broken linked images: [Image](img-url)](link-url) or [![Image](img-url)](link-url) → ![Image](img-url)
    .replace(/\[?!?\[Image\]\((https?:\/\/[^\s)]+)\)\]\(https?:\/\/[^\s)]+\)/g, '![Image]($1)')
    .replace(/^\s*\[\s*$/gm, '')
    // Only strip broken image fragments (![Image N: NOT followed by text](url) pattern)
    .replace(/!\[Image \d+:?\s*(?![^\]]*\]\()/g, '')

  // Split into lines, then group into blocks (paragraphs, headings, images)
  const lines = cleaned.split('\n')
  const blocks: { type: 'heading' | 'image' | 'text'; content: string; level?: number; caption?: string }[] = []
  let currentText: string[] = []

  function flushText() {
    if (currentText.length > 0) {
      const joined = currentText.join('\n').trim()
      if (joined) blocks.push({ type: 'text', content: joined })
      currentText = []
    }
  }

  for (const line of lines) {
    // Markdown headings: ## or ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushText()
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length })
      continue
    }
    // Standalone markdown image on its own line (with optional trailing caption like _caption text_)
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)(.*)$/)
    if (imgMatch) {
      const src = imgMatch[2]
      // Skip site UI images
      if (!isEmojiUrl(src) && !isSiteUiImage(src)) {
        flushText()
        const rawCaption = imgMatch[3]?.replace(/^_/, '').replace(/_$/, '').trim() || ''
        // Clean caption: remove bold markers
        const caption = rawCaption.replace(/\*\*/g, '').trim()
        blocks.push({ type: 'image', content: line.trim(), caption: caption || undefined })
      }
      continue
    }
    currentText.push(line)
  }
  flushText()

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return <h2 key={i} className="text-xl font-bold text-[#06821c] mt-8 mb-3 pl-3 pb-2 border-l-[10px] border-b border-[#06821c]">{renderInlineMarkdown(block.content)}</h2>
          }
          if (block.level === 2) {
            return <h3 key={i} className="text-lg font-bold text-[#06821c] mt-6 mb-3 pl-3 pb-2 border-l-[10px] border-b border-[#06821c]">{renderInlineMarkdown(block.content)}</h3>
          }
          return <h4 key={i} className="text-base font-semibold text-[#06821c] mt-5 mb-2 pl-3 pb-2 border-l-[10px] border-b border-[#06821c]">{renderInlineMarkdown(block.content)}</h4>
        }
        if (block.type === 'image') {
          const m = block.content.match(/^!\[(.*?)\]\((.*?)\)/)
          if (m) {
            const alt = m[1]
            const src = m[2]
            if (isEmojiUrl(src) || isSiteUiImage(src)) return null
            return (
              <figure key={i} className="my-6">
                <img
                  src={src}
                  alt={alt}
                  className="w-full rounded"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                {block.caption && (
                  <figcaption className="text-sm text-gray-500 mt-1.5 text-center">{block.caption}</figcaption>
                )}
              </figure>
            )
          }
        }
        // Regular text block — preserve whitespace/newlines
        if (!block.content.trim()) return null
        return <p key={i} className="mb-4 leading-relaxed">{renderInlineMarkdown(block.content)}</p>
      })}
    </>
  )
}

import UserAvatar from './UserAvatar'

export default function ContentDetail({ contentId, currentUserId, users, onBack, onDeleted }: Props) {
  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [isLikedByMe, setIsLikedByMe] = useState(false)
  const [copied, setCopied] = useState(false)

  const isOwner = content?.user_id === currentUserId

  // Sync comment draft when content loads
  useEffect(() => {
    if (content) setCommentDraft(content.comment || '')
  }, [content?.id, content?.comment])

  // Load likes
  const loadLikes = useCallback(async () => {
    if (!contentId || !currentUserId) return
    try {
      const likes = await fetchLikesForContents([contentId], currentUserId)
      const info = likes[contentId]
      setLikesCount(info?.count || 0)
      setIsLikedByMe(info?.likedByMe || false)
    } catch {
      // ignore
    }
  }, [contentId, currentUserId])

  async function handleLikeToggle() {
    // Optimistic update
    const wasLiked = isLikedByMe
    setIsLikedByMe(!wasLiked)
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      await toggleLike(contentId, currentUserId)
    } catch {
      // Revert
      setIsLikedByMe(wasLiked)
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1)
    }
  }

  async function handleFeedback(fields: Partial<Content>) {
    if (!content || !isOwner) return
    const prev = { ...content }
    // Optimistic update
    setContent({ ...content, ...fields } as Content)
    try {
      const updated = await updateContentFeedback(content.id, fields)
      setContent(updated)
    } catch {
      setContent(prev) // Revert on error
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchContentById(contentId)
      setContent(data)
    } finally {
      setLoading(false)
    }
  }, [contentId])

  useEffect(() => {
    load()
    loadLikes()
    const interval = setInterval(async () => {
      const data = await fetchContentById(contentId)
      if (data) setContent(data)
      if (data?.status === 'completed' || data?.status === 'error') {
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [contentId, load, loadLikes])

  async function handleDelete() {
    if (!confirm('このコンテンツを削除しますか？')) return
    await deleteContent(contentId)
    onDeleted()
  }

  async function handleShare() {
    const ogpUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ogp?id=${contentId}`
    try {
      await navigator.clipboard.writeText(ogpUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = ogpUrl
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRetry() {
    setRetrying(true)
    try {
      await processContent(contentId)
      await load()
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="text-center py-20 text-gray-500">
        コンテンツが見つかりません
        <button onClick={onBack} className="block mx-auto mt-4 text-blue-500 hover:underline">
          一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Sticky header bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 一覧に戻る
          </button>
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                再処理
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" /> 削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content body */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Hero: YouTube embed, Instagram carousel, or thumbnail image */}
        {content.platform === 'youtube' && extractYoutubeVideoId(content.url) ? (
          <div className="w-full aspect-video bg-black">
            <iframe
              src={getYoutubeEmbedUrl(extractYoutubeVideoId(content.url)!)}
              title={content.title || 'YouTube'}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : content.image_urls && content.image_urls.length > 1 ? (
          <div className="w-full max-w-lg mx-auto">
            <ImageCarousel
              images={content.image_urls}
              alt={content.title || ''}
              aspectRatio="square"
            />
          </div>
        ) : content.thumbnail_url ? (
          <div className="w-full max-h-80 overflow-hidden bg-gray-100">
            <img
              src={content.thumbnail_url}
              alt={content.title || ''}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.parentElement!.classList.add('hidden') }}
            />
          </div>
        ) : null}

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPlatformColor(content.platform, content.url)}`}>
              {getPlatformLabel(content.platform, content.url)}
            </span>
            {content.category && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {content.category}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {content.title || 'タイトル未取得'}
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {content.user && (
              <span className="flex items-center gap-1.5">
                <UserAvatar user={content.user} users={users} size="sm" />
                <span className="font-medium text-gray-700">{content.user.name}</span>
              </span>
            )}
            {content.author && <span>by {content.author}</span>}
            {content.published_at && (
              <span>{new Date(content.published_at).toLocaleDateString('ja-JP')}</span>
            )}
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer nofollow" referrerPolicy="no-referrer"
              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> 元のページ
            </a>
            <button
              onClick={handleShare}
              className="text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              title="共有URLをコピー"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">コピー済み</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3" />
                  <span>共有</span>
                </>
              )}
            </button>
          </div>

          {content.tags && content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {content.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Feedback controls */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <StarRating
                rating={content.rating}
                onChange={(rating) => handleFeedback({ rating })}
                size="md"
                disabled={!isOwner}
              />
              <LikeButton
                likesCount={likesCount}
                isLikedByMe={isLikedByMe}
                onToggle={handleLikeToggle}
                size="md"
                isOwner={isOwner}
              />
            </div>
            <div className="flex items-center gap-1">
              <FeedbackButtons
                isAdopted={content.is_adopted}
                isMouFurui={content.is_mou_furui}
                isMouBimyou={content.is_mou_bimyou}
                isStocked={content.is_stocked}
                onToggleAdopted={() => handleFeedback({ is_adopted: !content.is_adopted })}
                onToggleMouFurui={() => handleFeedback({ is_mou_furui: !content.is_mou_furui })}
                onToggleMouBimyou={() => handleFeedback({ is_mou_bimyou: !content.is_mou_bimyou })}
                onToggleStocked={() => handleFeedback({ is_stocked: !content.is_stocked })}
                size="md"
                disabled={!isOwner}
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setCommentDraft(content.comment || '')
                    setShowComment(!showComment)
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title="コメント"
                >
                  <MessageSquare
                    className={`w-5 h-5 ${
                      content.comment ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Comment (toggle) */}
          {showComment && isOwner && (
            <div className="mt-3">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onBlur={() => {
                  if (commentDraft !== (content.comment || '')) {
                    handleFeedback({ comment: commentDraft || null })
                  }
                }}
                placeholder="感想やメモを入力..."
                className="w-full text-base border border-gray-200 rounded-lg p-3 resize-none focus:ring-1 focus:ring-blue-500 outline-none min-h-[80px]"
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Processing status */}
        {content.status === 'processing' && (
          <div className="px-6 py-4 bg-blue-50 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">コンテンツを取得・分析中です...</span>
          </div>
        )}

        {content.status === 'error' && (
          <div className="px-6 py-4 bg-red-50">
            <p className="text-sm text-red-700">エラー: {content.error_message || '不明なエラー'}</p>
          </div>
        )}

        {/* Summary */}
        {content.summary && (
          <div className="p-6 border-b border-gray-100 bg-amber-50/50">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">AI 要約</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{content.summary}</p>
          </div>
        )}

        {/* Full text with images */}
        {content.full_text && (
          <div className="p-6">
            <h2 className="text-sm font-bold text-[#06821c] mb-3 pl-2 pb-2 border-l-[10px] border-b border-[#06821c]">全文アーカイブ</h2>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              <RenderedText text={content.full_text} />
            </div>
          </div>
        )}

        {content.status === 'pending' && (
          <div className="p-6 text-center text-gray-400">
            コンテンツの取得を待っています...
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
