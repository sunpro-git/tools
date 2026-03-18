import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Send } from 'lucide-react'

interface ThreadsData {
  type: 'threads'
  post: {
    username: string
    handle: string
    avatar: string
    text: string
    likes: number
    comments: number
    reposts: number
    shares: number
  }
  replies: {
    username: string
    handle: string
    avatar: string
    text: string
    likes: number
  }[]
}

function Avatar({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initial = name.charAt(0).toUpperCase()

  if (failed || !src) {
    return (
      <div
        className="rounded-full bg-gray-300 flex items-center justify-center text-white font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function ThreadsPost({ data, embedUrl }: { data: ThreadsData; embedUrl?: string | null }) {
  const { post, replies } = data

  return (
    <div className="max-w-lg mx-auto">
      {/* Main post */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <Avatar src={post.avatar} name={post.username} size={40} />
            {replies.length > 0 && (
              <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-gray-900">{post.username}</span>
            </div>
            <p className="text-[15px] text-gray-900 mt-1 whitespace-pre-wrap leading-relaxed">{post.text}</p>

            {/* Embed (video/media) */}
            {embedUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src={embedUrl}
                  title="Threads"
                  className="w-full border-0"
                  style={{ minHeight: '400px' }}
                  allowFullScreen
                />
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center gap-4 mt-3 text-gray-500">
              <span className="flex items-center gap-1.5">
                <Heart className="w-[18px] h-[18px]" />
                {post.likes > 0 && <span className="text-[13px]">{formatNumber(post.likes)}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-[18px] h-[18px]" />
                {post.comments > 0 && <span className="text-[13px]">{formatNumber(post.comments)}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <Repeat2 className="w-[18px] h-[18px]" />
                {post.reposts > 0 && <span className="text-[13px]">{formatNumber(post.reposts)}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <Send className="w-[18px] h-[18px]" />
                {post.shares > 0 && <span className="text-[13px]">{formatNumber(post.shares)}</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="border-t border-gray-100">
          {replies.map((reply, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-50">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Avatar src={reply.avatar} name={reply.username} size={32} />
                  {i < replies.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-100 mt-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[14px] text-gray-900">{reply.username}</span>
                    <span className="text-[13px] text-gray-400">@{reply.handle}</span>
                  </div>
                  <p className="text-[14px] text-gray-800 mt-0.5 whitespace-pre-wrap leading-relaxed">{reply.text}</p>
                  {reply.likes > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-gray-400">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[12px]">{reply.likes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
