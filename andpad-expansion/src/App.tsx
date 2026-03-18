import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './components/dashboard/DashboardPage'
import InquiryPage from './components/inquiry/InquiryPage'
import CsvImportPage from './components/import/CsvImportPage'
import EventPage from './components/event/EventPage'
import EventInquiryPage from './components/event-inquiry/EventInquiryPage'
import OrdersPage from './components/orders/OrdersPage'
import SalesPage from './components/sales/SalesPage'
import StaffDepartmentPage from './components/staff/StaffDepartmentPage'
import { Loader2 } from 'lucide-react'

function AuthGate() {
  const { user, loading, error } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage error={error ?? undefined} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inquiry" element={<InquiryPage />} />
          <Route path="/event-inquiry" element={<EventInquiryPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/events" element={<EventPage />} />
          <Route path="/staff" element={<StaffDepartmentPage />} />
          <Route path="/import" element={<CsvImportPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
