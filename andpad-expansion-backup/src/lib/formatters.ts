export function formatYen(amount: number | null | undefined): string {
  if (amount == null) return '¥0'
  if (Math.abs(amount) >= 100_000_000) {
    return `¥${(amount / 100_000_000).toFixed(1)}億`
  }
  if (Math.abs(amount) >= 10_000) {
    return `¥${Math.round(amount / 10_000).toLocaleString()}万`
  }
  return `¥${amount.toLocaleString()}`
}

export function formatYenFull(amount: number | null | undefined): string {
  if (amount == null) return '¥0'
  return `¥${amount.toLocaleString()}`
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

export function formatPercentValue(value: number | null | undefined): string {
  if (value == null) return '0%'
  return `${value.toFixed(1)}%`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}年${parseInt(month)}月`
}

export function formatDelta(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0) return { text: '-', positive: true }
  const delta = ((current - previous) / previous) * 100
  return {
    text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
    positive: delta >= 0,
  }
}
