import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Megaphone, CalendarDays, PanelLeftClose, PanelLeftOpen, Flag, ShoppingCart, DollarSign, Users, LogOut, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../lib/auth'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード', badge: '' },
  { to: '/inquiry', icon: Megaphone, label: '新規反響', badge: 'A' },
  { to: '/event-inquiry', icon: Flag, label: 'イベント反響', badge: 'B' },
  { to: '/orders', icon: ShoppingCart, label: '受注管理', badge: 'C' },
  { to: '/sales', icon: DollarSign, label: '完工管理', badge: 'D' },
  { to: '/events', icon: CalendarDays, label: 'イベント集計', badge: '' },
  { to: '/staff', icon: Users, label: '担当者管理', badge: '' },
  { to: '/import', icon: Upload, label: 'CSVインポート', badge: '' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const email = user?.email || ''

  return (
    <aside
      className={`text-white min-h-screen flex-shrink-0 flex flex-col transition-all duration-200 ${
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
      <nav className="p-2">
        {navItems.map((item) => (
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
            {item.badge ? (
              <span className="inline-flex items-center justify-center gap-0.5 w-auto px-1.5 h-6 rounded bg-gray-500 text-white font-bold text-xs flex-shrink-0">
                <item.icon className="w-3.5 h-3.5" />{item.badge}
              </span>
            ) : (
              <item.icon className="w-5 h-5 flex-shrink-0" />
            )}
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-700 p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center" title={email}>
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <button onClick={signOut} title="ログアウト" className="text-slate-400 hover:text-white p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-300" />
            </div>
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
    </aside>
  )
}
