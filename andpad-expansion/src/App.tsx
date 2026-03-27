import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import AppShell from './components/layout/AppShell'
import DashboardPage from './components/dashboard/DashboardPage'
import InquiryPage from './components/inquiry/InquiryPage'
import CsvImportPage from './components/import/CsvImportPage'
import EventPage from './components/event/EventPage'
import EventInquiryPage from './components/event-inquiry/EventInquiryPage'
import FollowUpPage from './components/follow-up/FollowUpPage'
import FollowUpB2Page from './components/follow-up/FollowUpB2Page'
import OrdersPage from './components/orders/OrdersPage'
import SalesPage from './components/sales/SalesPage'
import ModelHouseVisitPage from './components/model-house/ModelHouseVisitPage'
import StaffDepartmentPage from './components/staff/StaffDepartmentPage'
import TargetPage from './components/targets/TargetPage'
import DepartmentsPage from './components/departments/DepartmentsPage'
import { BusinessTypeProvider } from './hooks/useBusinessType'
import { FiscalYearProvider } from './hooks/useFiscalYear'
import { Loader2 } from 'lucide-react'

const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/inquiry', element: <InquiryPage /> },
      { path: '/event-inquiry', element: <EventInquiryPage /> },
      { path: '/model-house', element: <ModelHouseVisitPage /> },
      { path: '/follow-up', element: <FollowUpPage /> },
      { path: '/follow-up-b2', element: <FollowUpB2Page /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/sales', element: <SalesPage /> },
      { path: '/events', element: <EventPage /> },
      { path: '/targets', element: <TargetPage /> },
      { path: '/staff', element: <StaffDepartmentPage /> },
      { path: '/departments', element: <DepartmentsPage /> },
      { path: '/import', element: <CsvImportPage /> },
    ],
  },
])

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
    <BusinessTypeProvider>
    <FiscalYearProvider>
      <RouterProvider router={router} />
    </FiscalYearProvider>
    </BusinessTypeProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
