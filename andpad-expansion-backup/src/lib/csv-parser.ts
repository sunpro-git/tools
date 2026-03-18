import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { type ColumnMapping, DEFAULT_MAPPINGS, type TargetTable } from '../types/csv'

function isXlsx(file: File): boolean {
  return (
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  )
}

export async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  if (isXlsx(file)) {
    return parseXlsx(file)
  }
  const text = await readFileAsText(file)
  return parseCSV(text)
}

async function parseXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  // Convert all values to strings and clean headers
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

async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  // Try Shift_JIS first (common for ANDPAD exports), fallback to UTF-8
  try {
    const decoder = new TextDecoder('shift_jis')
    const text = decoder.decode(buffer)
    if (!text.includes('\ufffd')) return text
  } catch {
    // Shift_JIS not supported, try UTF-8
  }
  return new TextDecoder('utf-8').decode(buffer)
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\ufeff/, ''),
  })

  return {
    headers: result.meta.fields || [],
    rows: result.data,
  }
}

export function autoDetectMappings(
  headers: string[],
  targetTable: TargetTable
): ColumnMapping[] {
  const defaults = DEFAULT_MAPPINGS[targetTable]
  const mappings: ColumnMapping[] = []

  for (const header of headers) {
    const trimmed = header.trim()
    if (defaults[trimmed]) {
      mappings.push({ csvColumn: trimmed, dbColumn: defaults[trimmed] })
    }
  }

  return mappings
}

export function applyMappings(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {}
    for (const { csvColumn, dbColumn } of mappings) {
      let value: unknown = row[csvColumn]?.trim() || null
      // Convert numeric fields
      if (
        dbColumn.includes('amount') ||
        dbColumn === 'cost_amount' ||
        dbColumn === 'reserve_cost' ||
        dbColumn === 'gross_profit'
      ) {
        value = value ? parseInt(String(value).replace(/,/g, ''), 10) || null : null
      }
      // Convert rate fields
      if (dbColumn === 'gross_profit_rate' || dbColumn === 'tax_rate') {
        value = value ? parseFloat(String(value)) || null : null
      }
      // Convert boolean
      if (dbColumn === 'is_main_contract') {
        value = String(value) === '1'
      }
      mapped[dbColumn] = value
    }
    return mapped
  })
}
