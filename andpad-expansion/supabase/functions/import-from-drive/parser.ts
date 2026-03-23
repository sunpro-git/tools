// xlsxパース＋カラムマッピング・型変換（csv-parser.tsのEdge Function向けポート）

import * as XLSX from 'npm:xlsx'
import { type ColumnMapping, DEALS_MAPPINGS } from './mappings.ts'

export function parseXlsx(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const rows = jsonRows.map((row) => {
    const cleaned: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().replace(/^\ufeff/, '')
      cleaned[cleanKey] = val == null ? '' : String(val).trim()
    }
    return cleaned
  })

  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return { headers, rows }
}

export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  for (const header of headers) {
    const trimmed = header.trim()
    if (DEALS_MAPPINGS[trimmed]) {
      mappings.push({ csvColumn: trimmed, dbColumn: DEALS_MAPPINGS[trimmed] })
    }
  }
  return mappings
}

// bigint型のDBカラム（金額・原価・粗利など）
const BIGINT_COLUMNS = new Set([
  'estimate_amount', 'estimate_amount_ex_tax', 'estimate_cost',
  'estimate_gross_profit', 'order_amount',
  'contract_amount_ex_tax', 'contract_cost', 'contract_reserve_cost',
  'contract_gross_profit',
  'budget_amount_inc_tax', 'budget_amount_ex_tax', 'budget_cost',
  'budget_reserve_cost', 'budget_gross_profit',
  'progress_amount_inc_tax', 'progress_amount_ex_tax', 'progress_cost',
  'progress_reserve_cost', 'progress_gross_profit',
  'settlement_amount_inc_tax', 'settlement_amount_ex_tax', 'settlement_cost',
  'settlement_reserve_cost', 'settlement_gross_profit',
  'sales_amount_tax_included', 'sales_amount_tax_excluded',
  'cost_amount', 'reserve_cost', 'gross_profit',
])

export function applyMappings(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {}
    for (const { csvColumn, dbColumn } of mappings) {
      let value: unknown = row[csvColumn]?.trim() || null
      // bigintフィールド
      if (BIGINT_COLUMNS.has(dbColumn)) {
        if (value) {
          const s = String(value).replace(/,/g, '')
          if (/[\/\-]/.test(s) || !/^-?\d+(\.\d+)?$/.test(s)) {
            value = null
          } else {
            value = parseInt(s, 10) || null
          }
        } else {
          value = null
        }
      }
      // rateフィールド
      if (dbColumn.includes('_rate') || dbColumn === 'tax_rate') {
        if (value) {
          const s = String(value)
          if (/[\/]/.test(s)) {
            value = null
          } else {
            value = parseFloat(s) || null
          }
        } else {
          value = null
        }
      }
      // 日付フィールド → YYYY-MM-DD
      if (dbColumn.includes('date') && !BIGINT_COLUMNS.has(dbColumn) && value) {
        const s = String(value)
        const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
        if (m) {
          value = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
        }
      }
      // boolean
      if (dbColumn === 'is_main_contract') {
        value = String(value) === '1'
      }
      mapped[dbColumn] = value
    }
    return mapped
  })
}
