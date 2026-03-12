import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import AppIcon from './AppIcon'

/** iOS Safari/Chrome share button icon (box with up arrow) */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

/** iOS "Add to Home Screen" icon (square with plus) */
function AddToHomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

const STORAGE_KEY = 'my-input-install-dismissed'

type Browser = 'safari' | 'chrome' | 'other'

function detectIOSBrowser(): Browser | null {
  const ua = navigator.userAgent
  // Not iOS
  if (!/iPhone|iPad|iPod/.test(ua)) return null
  // Chrome on iOS
  if (/CriOS/.test(ua)) return 'chrome'
  // Firefox on iOS
  if (/FxiOS/.test(ua)) return 'other'
  // Edge on iOS
  if (/EdgiOS/.test(ua)) return 'other'
  // Default Safari
  return 'safari'
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [browser, setBrowser] = useState<Browser>('safari')

  useEffect(() => {
    // Only show on iOS, not in standalone mode, and not previously dismissed
    const iosBrowser = detectIOSBrowser()
    if (!iosBrowser) return
    if (isStandalone()) return
    if (localStorage.getItem(STORAGE_KEY)) return

    setBrowser(iosBrowser)
    // Small delay so it doesn't flash immediately on load
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible) return null

  const isSafari = browser === 'safari'
  const isChrome = browser === 'chrome'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50 transition-opacity"
        onClick={handleDismiss}
      />

      {/* Balloon */}
      <div
        className={`fixed z-50 left-4 right-4 ${
          isSafari
            ? 'bottom-20'
            : isChrome
              ? 'top-16'
              : 'bottom-20'
        }`}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 px-5 py-4">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header: icon + title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 min-w-10 rounded-lg shadow-sm flex-shrink-0 bg-emerald-50 flex items-center justify-center overflow-hidden">
              <AppIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">ホーム画面に追加</p>
              <p className="text-xs text-gray-500">アプリのように使えます</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
            {isSafari ? (
              <>
                <span className="flex items-center gap-1">
                  ① 下の<ShareIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />をタップ
                </span>
                <span className="flex items-center gap-1">
                  ②<AddToHomeIcon className="w-4 h-4 text-gray-500 flex-shrink-0" /><span className="font-semibold">"ホーム画面に追加"</span>をタップ
                </span>
              </>
            ) : isChrome ? (
              <>
                <span className="flex items-center gap-1">
                  ① 右上の<ShareIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />をタップ
                </span>
                <span className="flex items-center gap-1">
                  ②<AddToHomeIcon className="w-4 h-4 text-gray-500 flex-shrink-0" /><span className="font-semibold">"ホーム画面に追加"</span>をタップ
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 flex-wrap">
                共有メニューから<AddToHomeIcon className="w-4 h-4 text-gray-500 flex-shrink-0" /><span className="font-semibold">"ホーム画面に追加"</span>
              </span>
            )}
          </div>

          {/* Arrow / triangle */}
          {isSafari && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 rotate-45" />
          )}
          {isChrome && (
            <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-t border-l border-gray-200 rotate-45" />
          )}
        </div>
      </div>
    </>
  )
}
