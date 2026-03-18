import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Building2, Megaphone } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/inquiry', icon: Megaphone, label: '反響数集計' },
  { to: '/import', icon: Upload, label: 'CSVインポート' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 text-white min-h-screen flex-shrink-0 flex flex-col" style={{ backgroundColor: '#222' }}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg">ANDPAD集計</span>
        </div>
      </div>
      <nav className="p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white'
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: '#333' } : { backgroundColor: 'transparent' }
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
