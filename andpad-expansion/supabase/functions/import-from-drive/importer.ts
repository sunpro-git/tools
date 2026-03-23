// 案件インポートロジック（CsvImportPage.tsxのEdge Function向けポート）

import { createClient } from 'npm:@supabase/supabase-js@2'
import { DEALS_CUSTOMER_COLUMN_MAP } from './mappings.ts'
import { parseXlsx, autoDetectMappings, applyMappings } from './parser.ts'

// 会社管理アカウント判定
function isCompanyManaged(staffName: string | null): boolean {
  return /会社管理/.test(staffName || '')
}

// 顧客住所からエリアを判定
function getAreaFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  if (/松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町/.test(address)) return '本社'
  if (/長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村/.test(address)) return '長野'
  if (/上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村/.test(address)) return '上田'
  if (/伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村/.test(address)) return '伊那'
  return null
}

export interface ImportResult {
  fileName: string
  success: number
  customerCount: number
  errors: string[]
}

export async function importDealsFromXlsx(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ImportResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const errors: string[] = []

  // 1. インポートレコード作成
  const { data: importRecord } = await supabase
    .from('csv_imports')
    .insert({ file_name: `[自動] ${fileName}`, table_name: 'deals', status: 'processing' })
    .select()
    .single()

  // 2. xlsxパース
  const { headers, rows } = parseXlsx(buffer)
  if (rows.length === 0) {
    if (importRecord) {
      await supabase.from('csv_imports').update({ status: 'completed', row_count: 0, error_count: 0 }).eq('id', importRecord.id)
    }
    return { fileName, success: 0, customerCount: 0, errors: [] }
  }

  // 3. カラムマッピング＆型変換
  const mappings = autoDetectMappings(headers)
  const mapped = applyMappings(rows, mappings)

  // 4. 顧客データ抽出＆upsert
  let customerCount = 0
  const customerRows: Record<string, Record<string, unknown>> = {}
  for (const row of rows) {
    const custId = row['顧客ID']?.trim()
    const custName = row['顧客名']?.trim()
    if (!custId || !custName) continue
    if (customerRows[custId]) continue
    const custRow: Record<string, unknown> = {}
    for (const [csvCol, dbCol] of Object.entries(DEALS_CUSTOMER_COLUMN_MAP)) {
      const val = row[csvCol]?.trim() || null
      if (val) custRow[dbCol] = val
    }
    if (custRow.andpad_id && custRow.name) {
      customerRows[custId] = custRow
    }
  }

  const custArray = Object.values(customerRows)
  for (let i = 0; i < custArray.length; i += 100) {
    const chunk = custArray.slice(i, i + 100)
    const { error, data } = await supabase
      .from('customers')
      .upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false })
      .select()
    if (error) {
      for (const cRow of chunk) {
        const { error: cErr } = await supabase
          .from('customers')
          .upsert([cRow], { onConflict: 'andpad_id', ignoreDuplicates: false })
          .select()
        if (cErr) {
          errors.push(`顧客 ${cRow.andpad_id} (${cRow.name || ''}): ${cErr.message}`)
        } else {
          customerCount += 1
        }
      }
    } else {
      customerCount += data?.length || 0
    }
  }

  // 5. 会社管理スタッフの店舗振り分け
  const custAddrMap: Record<string, string> = {}
  for (const row of rows) {
    const custId = row['顧客ID']?.trim()
    const addr = row['顧客現住所']?.trim()
    if (custId && addr) custAddrMap[custId] = addr
  }
  for (const row of mapped) {
    const staffName = row.staff_name as string | null
    if (isCompanyManaged(staffName)) {
      const custId = row.customer_andpad_id as string | null
      const addr = custId ? custAddrMap[custId] : null
      const area = getAreaFromAddress(addr)
      if (area) {
        row.store_name = `${area}　会社管理`
      }
    }
  }

  // 6. csv_import_id付与
  const rowsWithImportId = mapped.map((r) => ({
    ...r,
    csv_import_id: importRecord?.id,
  }))

  // 7. バッチupsert（100件ずつ、エラー時は1件ずつリトライ）
  let successCount = 0
  const dbToLabel: Record<string, string> = {}
  for (const m of mappings) dbToLabel[m.dbColumn] = m.csvColumn

  for (let i = 0; i < rowsWithImportId.length; i += 100) {
    const chunk = rowsWithImportId.slice(i, i + 100)
    const { error, data } = await supabase
      .from('deals')
      .upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false })
      .select()

    if (error) {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]
        const rowNum = i + j + 2
        const { error: rowError } = await supabase
          .from('deals')
          .upsert([row], { onConflict: 'andpad_id', ignoreDuplicates: false })
          .select()
        if (rowError) {
          const valMatch = rowError.message.match(/invalid input.*?:\s*"(.+?)"/)
          const badValue = valMatch ? valMatch[1] : null
          let colInfo = ''
          if (badValue) {
            const found = Object.entries(row).find(([, v]) => String(v) === badValue)
            if (found) {
              const label = dbToLabel[found[0]] || found[0]
              colInfo = ` [項目: ${label}, 値: "${badValue}"]`
            }
          }
          const id = (row.andpad_id || row.name || '') as string
          errors.push(`行${rowNum} (${id})${colInfo}: ${rowError.message}`)
        } else {
          successCount += 1
        }
      }
    } else {
      successCount += data?.length || 0
    }
  }

  // 8. インポートレコード更新
  if (importRecord) {
    await supabase
      .from('csv_imports')
      .update({
        status: errors.length > 0 ? 'error' : 'completed',
        row_count: successCount,
        error_count: errors.length,
        error_message: errors.join('; ') || null,
      })
      .eq('id', importRecord.id)
  }

  return { fileName, success: successCount, customerCount, errors }
}
