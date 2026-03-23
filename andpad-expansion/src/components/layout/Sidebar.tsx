import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, PanelLeftClose, PanelLeftOpen, Users, LogOut, User, Footprints, UserSearch, FileSignature, HardHat, HeartHandshake, Target, Building2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import { signOut } from '../../lib/auth'

const InquiryIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className={className}>
    <path d="M328 256C306.9 243.9 285.7 231.8 256 226.7L256 86.4C289.7 77 343.4 64 384 64C480 64 608 112 608 192C608 272 488.4 288 432 288C384 288 356 272 328 256zM160 96L208 96L208 224L160 224C124.7 224 96 195.3 96 160C96 124.7 124.7 96 160 96zM264 384C292 368 320 352 368 352C424.4 352 544 368 544 448C544 528 416 576 320 576C279.5 576 225.7 563 192 553.6L192 413.3C221.7 408.1 242.9 396 264 383.9zM96 544C60.7 544 32 515.3 32 480C32 444.7 60.7 416 96 416L144 416L144 544L96 544z"/>
  </svg>
)

const EventInquiryIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className={className}>
    <path d="M224 64C241.7 64 256 78.3 256 96L256 128L384 128L384 96C384 78.3 398.3 64 416 64C433.7 64 448 78.3 448 96L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 96C192 78.3 206.3 64 224 64zM160 304L160 336C160 344.8 167.2 352 176 352L208 352C216.8 352 224 344.8 224 336L224 304C224 295.2 216.8 288 208 288L176 288C167.2 288 160 295.2 160 304zM288 304L288 336C288 344.8 295.2 352 304 352L336 352C344.8 352 352 344.8 352 336L352 304C352 295.2 344.8 288 336 288L304 288C295.2 288 288 295.2 288 304zM432 288C423.2 288 416 295.2 416 304L416 336C416 344.8 423.2 352 432 352L464 352C472.8 352 480 344.8 480 336L480 304C480 295.2 472.8 288 464 288L432 288zM160 432L160 464C160 472.8 167.2 480 176 480L208 480C216.8 480 224 472.8 224 464L224 432C224 423.2 216.8 416 208 416L176 416C167.2 416 160 423.2 160 432zM304 416C295.2 416 288 423.2 288 432L288 464C288 472.8 295.2 480 304 480L336 480C344.8 480 352 472.8 352 464L352 432C352 423.2 344.8 416 336 416L304 416zM416 432L416 464C416 472.8 423.2 480 432 480L464 480C472.8 480 480 472.8 480 464L480 432C480 423.2 472.8 416 464 416L432 416C423.2 416 416 423.2 416 432z"/>
  </svg>
)

const SalesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className={className}>
    <path d="M512 64L512 96L640 96L640 256L512 256L512 576L448 576L448 64L512 64zM240 112L400 256L400 576L50.5 576L50.5 368L0 368L0 328L240 112zM288 320L192 320L192 416L288 416L288 320z"/>
  </svg>
)

const OrdersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className={className}>
    <path d="M64 64L304 64L448 208L448 331.7L315.7 464L286.9 464L253.5 397.3L246.9 384L204.7 384L197.5 392.8L125.5 480.8L162.7 511.2L221.2 439.7C244.7 486.7 256.7 510.7 257.3 512L287 512L276.3 576L64.1 576L64.1 64zM272 122.5L272 240L389.5 240L272 122.5zM544 303.9L624 383.9L571.2 436.7L491.2 356.7L544 303.9zM336 511.9L468.6 379.3L548.6 459.3L416 591.9L320 607.9L336 511.9z"/>
  </svg>
)

const navCategories = [
  {
    badge: 'A', label: '集客', icon: Footprints,
    items: [
      { to: '/inquiry', badge: 'A1', label: '新規反響' },
      { to: '/event-inquiry', badge: 'A2', label: 'イベント' },
      { to: '/model-house', badge: 'A3', label: 'モデルハウス' },
    ],
  },
  {
    badge: 'B', label: '追客', icon: UserSearch,
    items: [],
  },
  {
    badge: 'C', label: '受注', icon: FileSignature,
    items: [
      { to: '/orders', badge: 'C1', label: '受注集計' },
    ],
  },
  {
    badge: 'D', label: '完工', icon: HardHat,
    items: [
      { to: '/sales', badge: 'D1', label: '完工集計' },
    ],
  },
  {
    badge: 'E', label: 'アフター', icon: HeartHandshake,
    items: [],
  },
]

const bottomNavItems = [
  { to: '/targets', icon: Target, label: '目標管理', badge: '' },
  { to: '/staff', icon: Users, label: '担当者管理', badge: '' },
  { to: '/departments', icon: Building2, label: '部門管理', badge: '' },
  { to: '/import', icon: Upload, label: 'CSVインポート', badge: '' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const { businessType, setBusinessType } = useBusinessType()
  const { snYear, setSnYear } = useFiscalYear()
  const snYearOptions = [snYear - 1, snYear, snYear + 1]
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const email = user?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

  return (
    <aside
      className={`text-white h-screen flex-shrink-0 flex flex-col transition-all duration-200 sticky top-0 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
      style={{ backgroundColor: '#222' }}
    >
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <span className="w-6 h-6 flex items-center justify-center font-black text-xl text-red-500 flex-shrink-0" style={{ fontFamily: 'Arial Black, Arial, sans-serif', lineHeight: 1 }}>A</span>
          {!collapsed && <span className="font-bold text-lg whitespace-nowrap">ANDPAD集計</span>}
        </div>
        {!collapsed && (
          <button onClick={onToggle} className="text-slate-400 hover:text-white p-0.5 flex-shrink-0">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>
      {collapsed && (
        <button onClick={onToggle} className="text-slate-400 hover:text-white p-2 mx-auto mt-1">
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}
      <nav className="p-2 flex-1 overflow-y-auto">
        <NavLink
          to="/"
          title={collapsed ? 'ダッシュボード' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            } ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`
          }
          style={({ isActive }) =>
            isActive ? { backgroundColor: '#333' } : { backgroundColor: 'transparent' }
          }
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!collapsed && 'ダッシュボード'}
        </NavLink>
        {navCategories.map((cat) => (
          <div key={cat.badge} className="mt-2">
            {!collapsed ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 font-bold tracking-wider">
                {cat.badge} {cat.label}
                <cat.icon className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="flex justify-center py-1.5 text-slate-400" title={`${cat.badge} ${cat.label}`}>
                <cat.icon className="w-4 h-4" />
              </div>
            )}
            {cat.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? `${item.badge} ${item.label}` : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-2 rounded-lg text-sm transition-colors ${
                    collapsed ? 'justify-center px-0' : 'pl-5 pr-3'
                  } ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: '#333' } : { backgroundColor: 'transparent' }
                }
              >
                <span className="inline-flex items-center justify-center w-7 h-5 rounded bg-gray-600 text-white font-bold text-[10px] flex-shrink-0">{item.badge}</span>
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="p-2 border-t border-slate-700">
          {/* 部門選択 */}
          {collapsed ? (
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="w-full bg-[#333] text-white text-xs font-bold rounded-lg py-1.5 px-1 text-center border-0 cursor-pointer appearance-none mb-1"
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{bt === '新築' ? '新' : bt === 'リフォーム' ? 'リ' : '不'}</option>)}
            </select>
          ) : (
            <div className="mb-1 relative">
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
                className="w-full rounded-lg py-2 px-3 border-0 cursor-pointer opacity-0 absolute inset-0 z-10 bg-[#333]"
              >
                {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
              <div className="bg-[#333] rounded-lg py-1.5 px-3 pointer-events-none flex items-center justify-between">
                <span className="text-sm font-bold text-white">{businessType}</span>
                <span className="text-slate-400 text-[10px] ml-1">▼</span>
              </div>
            </div>
          )}
          {/* 期セレクター */}
          {collapsed ? (
            <select
              value={snYear}
              onChange={(e) => setSnYear(Number(e.target.value))}
              className="w-full bg-[#333] text-white text-xs font-bold rounded-lg py-1.5 px-1 text-center border-0 cursor-pointer appearance-none mb-1"
            >
              {snYearOptions.map((y) => <option key={y} value={y}>{y}sn</option>)}
            </select>
          ) : (
            <div className="mb-1 relative">
              <select
                value={snYear}
                onChange={(e) => setSnYear(Number(e.target.value))}
                className="w-full bg-[#333] text-white rounded-lg py-2 px-3 border-0 cursor-pointer opacity-0 absolute inset-0 z-10"
              >
                {snYearOptions.map((y) => <option key={y} value={y}>{y}sn（{y-1}年9月 → {y}年8月）</option>)}
              </select>
              <div className="bg-[#333] rounded-lg py-1.5 px-3 pointer-events-none flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-bold text-white">{snYear}</span>
                    <span className="text-[10px] font-bold text-white">sn</span>
                  </div>
                  <div className="flex items-baseline gap-0.5 text-slate-400">
                    <span className="text-xs font-bold text-slate-300">{snYear - 1}</span>
                    <span className="text-[10px]">年9月 →</span>
                    <span className="text-xs font-bold text-slate-300">{snYear}</span>
                    <span className="text-[10px]">年8月</span>
                  </div>
                </div>
                <span className="text-slate-400 text-[10px] ml-1">▼</span>
              </div>
            </div>
          )}
        </div>
        <nav className="p-2 pt-0">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: '#333' } : { backgroundColor: 'transparent' }
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
      <div className="border-t border-slate-700 p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" title={email} referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center" title={email}>
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
            <button onClick={signOut} title="ログアウト" className="text-slate-400 hover:text-white p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white truncate">{displayName}</div>
              <div className="text-xs text-slate-400 truncate">{email}</div>
            </div>
            <button onClick={signOut} title="ログアウト" className="text-slate-400 hover:text-white p-1 flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      </div>
    </aside>
  )
}
