import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
