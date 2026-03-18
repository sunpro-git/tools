import type { Deal } from '../types/database'
import type { Contract } from '../types/database'

export type PeriodType = 'month' | 'quarter' | 'year'

export interface PeriodRange {
  start: Date
  end: Date
  label: string
}

export function getCurrentPeriod(type: PeriodType, offset: number = 0): PeriodRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (type === 'month') {
    const d = new Date(year, month + offset, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return {
      start: d,
      end,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    }
  }

  if (type === 'quarter') {
    const currentQ = Math.floor(month / 3)
    const targetQ = currentQ + offset
    const targetYear = year + Math.floor(targetQ / 4)
    const q = ((targetQ % 4) + 4) % 4
    const start = new Date(targetYear, q * 3, 1)
    const end = new Date(targetYear, q * 3 + 3, 0)
    return {
      start,
      end,
      label: `${targetYear}年 Q${q + 1}`,
    }
  }

  // year
  const targetYear = year + offset
  return {
    start: new Date(targetYear, 0, 1),
    end: new Date(targetYear, 11, 31),
    label: `${targetYear}年`,
  }
}

function isInPeriod(dateStr: string | null, period: PeriodRange): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= period.start && d <= period.end
}

export interface KpiData {
  inquiryCount: number
  orderCount: number
  orderRate: number
  totalSales: number
  completionCount: number
}

export function computeKpis(deals: Deal[], contracts: Contract[], period: PeriodRange): KpiData {
  const inquiries = deals.filter((d) => isInPeriod(d.inquiry_date, period))
  const orders = deals.filter((d) => isInPeriod(d.order_date, period))
  const completions = deals.filter((d) => isInPeriod(d.completion_date, period))

  const periodContracts = contracts.filter((c) => isInPeriod(c.contract_date, period))
  const totalSales = periodContracts.reduce(
    (sum, c) => sum + (c.sales_amount_tax_included || 0),
    0
  )

  const inquiryCount = inquiries.length
  const orderCount = orders.length

  return {
    inquiryCount,
    orderCount,
    orderRate: inquiryCount > 0 ? orderCount / inquiryCount : 0,
    totalSales,
    completionCount: completions.length,
  }
}

export interface MonthlyData {
  month: string
  inquiries: number
  orders: number
  completions: number
  sales: number
}

export function computeMonthlyTrend(
  deals: Deal[],
  contracts: Contract[],
  months: number = 12
): MonthlyData[] {
  const result: MonthlyData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const period = getCurrentPeriod('month', -i)

    const inquiries = deals.filter((deal) => isInPeriod(deal.inquiry_date, period)).length
    const orders = deals.filter((deal) => isInPeriod(deal.order_date, period)).length
    const completions = deals.filter((deal) => isInPeriod(deal.completion_date, period)).length
    const sales = contracts
      .filter((c) => isInPeriod(c.contract_date, period))
      .reduce((sum, c) => sum + (c.sales_amount_tax_included || 0), 0)

    result.push({ month: yearMonth, inquiries, orders, completions, sales })
  }

  return result
}

export interface BreakdownItem {
  name: string
  count: number
  amount: number
}

export function computeSourceBreakdown(deals: Deal[], contracts: Contract[], period: PeriodRange): BreakdownItem[] {
  const map = new Map<string, { count: number; amount: number }>()

  const periodDeals = deals.filter((d) => isInPeriod(d.inquiry_date, period))
  for (const deal of periodDeals) {
    const source = deal.source || '不明'
    const existing = map.get(source) || { count: 0, amount: 0 }
    existing.count++
    map.set(source, existing)
  }

  const periodContracts = contracts.filter((c) => isInPeriod(c.contract_date, period))
  for (const contract of periodContracts) {
    const deal = deals.find((d) => d.management_id === contract.deal_management_id)
    const source = deal?.source || '不明'
    const existing = map.get(source) || { count: 0, amount: 0 }
    existing.amount += contract.sales_amount_tax_included || 0
    map.set(source, existing)
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
}

export function computeStaffBreakdown(deals: Deal[], contracts: Contract[], period: PeriodRange): BreakdownItem[] {
  const map = new Map<string, { count: number; amount: number }>()

  const periodDeals = deals.filter(
    (d) => isInPeriod(d.order_date, period) || isInPeriod(d.completion_date, period)
  )
  for (const deal of periodDeals) {
    const staff = deal.staff_name || '未設定'
    const existing = map.get(staff) || { count: 0, amount: 0 }
    existing.count++
    map.set(staff, existing)
  }

  const periodContracts = contracts.filter((c) => isInPeriod(c.contract_date, period))
  for (const contract of periodContracts) {
    const staff = contract.store_name || '未設定'
    const existing = map.get(staff) || { count: 0, amount: 0 }
    existing.amount += contract.sales_amount_tax_included || 0
    map.set(staff, existing)
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
}

export interface FunnelStep {
  name: string
  count: number
  rate: number
}

export function computeStatusFunnel(deals: Deal[], period: PeriodRange): FunnelStep[] {
  const statusOrder: { key: string; filter: (d: Deal) => boolean }[] = [
    { key: '問い合わせ', filter: (d) => isInPeriod(d.inquiry_date, period) },
    { key: '商談', filter: (d) => isInPeriod(d.meeting_date, period) },
    { key: '見積', filter: (d) => isInPeriod(d.estimate_date, period) },
    { key: '受注', filter: (d) => isInPeriod(d.order_date, period) },
    { key: '完工', filter: (d) => isInPeriod(d.completion_date, period) },
  ]

  const steps: FunnelStep[] = []
  let firstCount = 0

  for (let i = 0; i < statusOrder.length; i++) {
    const count = deals.filter(statusOrder[i].filter).length
    if (i === 0) firstCount = count
    steps.push({
      name: statusOrder[i].key,
      count,
      rate: firstCount > 0 ? count / firstCount : 0,
    })
  }

  return steps
}
