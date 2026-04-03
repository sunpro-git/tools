import { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, PanelLeftClose, PanelLeftOpen, Users, LogOut, User, Footprints, UserSearch, FileSignature, HardHat, HeartHandshake, Target, Building2, Play, Pause } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'
import { useFiscalYear } from '../../hooks/useFiscalYear'
import { signOut } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const navCategories = [
  {
    badge: 'A', label: '集客', icon: Footprints,
    items: [
      { to: '/inquiry', badge: 'A1', label: '新規反響' },
      { to: '/event-inquiry', badge: 'A2', label: 'イベント' },
      { to: '/model-house', badge: 'A3', label: 'モデルハウス' },
      { to: '/follow-up', badge: 'A4', label: '個人商談集計' },
    ],
  },
  {
    badge: 'B', label: '追客', icon: UserSearch,
    items: [
      { to: '/follow-up-b2', badge: 'B1', label: '追客管理' },
    ],
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

  const [autoImportEnabled, setAutoImportEnabled] = useState(true)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'auto_import_enabled').single()
      .then(({ data }) => { if (data) setAutoImportEnabled(data.value === 'true') })
  }, [])
  const toggleAutoImport = useCallback(async () => {
    const next = !autoImportEnabled
    setAutoImportEnabled(next)
    await supabase.from('app_settings').update({ value: String(next), updated_at: new Date().toISOString() }).eq('key', 'auto_import_enabled')
  }, [autoImportEnabled])

  return (
    <aside
      className={`text-white h-screen flex-shrink-0 flex flex-col transition-all duration-200 sticky top-0 z-20 ${
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
            <div key={item.to} className="flex items-center">
              <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors flex-1 ${
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
              {item.to === '/import' && !collapsed && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAutoImport() }}
                  title={autoImportEnabled ? '自動更新中（クリックで一時停止）' : '一時停止中（クリックで再開）'}
                  className={`p-1.5 rounded transition-colors cursor-pointer flex-shrink-0 ${
                    autoImportEnabled ? 'text-green-400 hover:text-green-300' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  {autoImportEnabled ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
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
