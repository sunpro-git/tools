import { useState, useEffect, useCallback } from 'react'
import { fetchAll } from '../../lib/supabase'
import {
  type PeriodType,
  getCurrentPeriod,
  computeKpis,
  computeMonthlyTrend,
  computeSourceBreakdown,
  computeStaffBreakdown,
  computeStatusFunnel,
} from '../../lib/aggregation'
import type { Deal, Contract } from '../../types/database'
import PeriodSelector from './PeriodSelector'
import KpiCards from './KpiCards'
import MonthlyTrendChart from './MonthlyTrendChart'
import SourceBreakdown from './SourceBreakdown'
import StaffBreakdown from './StaffBreakdown'
import StatusFunnel from './StatusFunnel'
import ProjectsTable from './ProjectsTable'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)
  const [deals, setDeals] = useState<Deal[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [dealsData, contractsData] = await Promise.all([
      fetchAll<Deal>('deals'),
      fetchAll<Contract>('contracts'),
    ])
    setDeals(dealsData)
    setContracts(contractsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentPeriod = getCurrentPeriod(periodType, offset)
  const previousPeriod = getCurrentPeriod(periodType, offset - 1)

  const currentKpis = computeKpis(deals, contracts, currentPeriod)
  const previousKpis = computeKpis(deals, contracts, previousPeriod)
  const monthlyTrend = computeMonthlyTrend(deals, contracts)
  const sourceBreakdown = computeSourceBreakdown(deals, contracts, currentPeriod)
  const staffBreakdown = computeStaffBreakdown(deals, contracts, currentPeriod)
  const statusFunnel = computeStatusFunnel(deals, currentPeriod)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500">データ読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-slate-900 flex-shrink-0">ダッシュボード</h1>
        <PeriodSelector
          periodType={periodType}
          onPeriodTypeChange={(t) => {
            setPeriodType(t)
            setOffset(0)
          }}
          label={currentPeriod.label}
          onPrev={() => setOffset((o) => o - 1)}
          onNext={() => setOffset((o) => o + 1)}
        />
      </div>

      <KpiCards current={currentKpis} previous={previousKpis} />

      <MonthlyTrendChart data={monthlyTrend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceBreakdown data={sourceBreakdown} />
        <StaffBreakdown data={staffBreakdown} />
      </div>

      <StatusFunnel data={statusFunnel} />

      <ProjectsTable deals={deals} />
    </div>
  )
}
