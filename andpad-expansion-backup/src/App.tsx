import { HashRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import DashboardPage from './components/dashboard/DashboardPage'
import InquiryPage from './components/inquiry/InquiryPage'
import CsvImportPage from './components/import/CsvImportPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inquiry" element={<InquiryPage />} />
          <Route path="/import" element={<CsvImportPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
