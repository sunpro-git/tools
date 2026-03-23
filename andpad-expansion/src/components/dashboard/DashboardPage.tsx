import { LayoutDashboard } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'

export default function DashboardPage() {
  const { businessType, setBusinessType } = useBusinessType()
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          ダッシュボード
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
            className="text-sm font-semibold px-2 py-0.5 rounded-lg border-0 cursor-pointer text-white"
            style={{ backgroundColor: businessType === '新築' ? '#15803d' : businessType === 'リフォーム' ? '#d97706' : '#1e40af' }}
          >
            {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt} className="bg-white text-slate-700">{bt}</option>)}
          </select>
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-400">準備中</p>
      </div>
    </div>
  )
}
