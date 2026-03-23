// Google Cloud Function: Google DriveのxlsxをSupabaseにインポート
// Cloud Schedulerで20分間隔で呼び出される

const { google } = require('googleapis')
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

// ========== 設定 ==========
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vkovflhltggyrgimeabp.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VkjlxdSKO5mSFUdYWVx6YK-WXczva3Af'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ========== カラムマッピング ==========
const DEALS_MAPPINGS = {
  'システムID': 'andpad_id', '案件管理ID': 'management_id', '問合番号': 'inquiry_number',
  '案件名': 'name', '顧客ID': 'customer_andpad_id', '顧客名': 'customer_name',
  '案件種別': 'deal_category', '案件区分': 'deal_type', '案件フロー': 'deal_flow',
  '案件ワークフロー': 'deal_workflow', '案件作成者': 'deal_creator', '案件作成日時': 'deal_created_at',
  '契約番号': 'contract_number', '本契約番号': 'main_contract_number',
  '引合状況': 'status', '成約確度': 'closing_probability',
  '主担当店舗': 'store_name', '主担当': 'staff_name',
  '役割:営業': 'role_sales', '役割:設計': 'role_design', '役割:工事': 'role_construction',
  '役割:インテリアコーディネーター': 'role_ic', '役割:施工管理補助①': 'role_construction_sub1',
  '役割:施工管理補助②': 'role_construction_sub2', '役割:その他': 'role_other',
  '役割:営業補助': 'role_sales_sub', '役割:EX事業部': 'role_ex',
  '反響種別': 'response_type', '反響元': 'source', '反響日': 'inquiry_date',
  '受付者': 'receptionist', '希望工事予算': 'desired_budget', '施工きっかけ': 'construction_trigger',
  '売上見込 売上(税込)': 'estimate_amount', '売上見込 売上(税抜)': 'estimate_amount_ex_tax',
  '売上見込 原価': 'estimate_cost', '売上見込 粗利額': 'estimate_gross_profit',
  '売上見込 粗利率': 'estimate_gross_profit_rate',
  '工事場所': 'construction_location', '工事種類': 'category', '工事内容': 'construction_content',
  '失注種別': 'lost_type', '失注日': 'lost_date', '失注理由': 'lost_reason',
  '初回面談日(予定)': 'meeting_date_planned', '初回面談日(実績)': 'meeting_date',
  '初回訪問日(予定)': 'visit_date_planned', '初回訪問日(実績)': 'visit_date_actual',
  '現調日(予定)': 'survey_date_planned', '現調日(実績)': 'survey_date_actual',
  '初回プラン提出(予定)': 'plan_submit_date_planned', '初回プラン提出(実績)': 'plan_submit_date_actual',
  '耐震申込日(予定)': 'seismic_date_planned', '耐震申込日(実績)': 'seismic_date_actual',
  '設計申込日(予定)': 'design_date_planned', '設計申込日(実績)': 'design_date_actual',
  '契約日(予定)': 'order_date_planned', '契約日(実績)': 'order_date',
  '着工日(予定)': 'start_date_planned', '着工日(実績)': 'start_date',
  '上棟日(予定)': 'topping_date_planned', '上棟日(実績)': 'topping_date_actual',
  '完成日(予定)': 'completion_date_planned', '完成日(実績)': 'completion_date',
  '引渡日(予定)': 'handover_date_planned', '引渡日(実績)': 'handover_date_actual',
  'ラベル:施工エリア': 'label_area', 'ラベル:営業所': 'label_office', 'ラベル:工事分類': 'label_construction_type',
  '移行用:SAKSAK顧客コード': 'migration_saksak_customer', '移行用:SAKSAK問合番号': 'migration_saksak_inquiry',
  '移行用:SAKSAK契約番号': 'migration_saksak_contract', '移行用:ダンドリワーク現場ID': 'migration_dandori_id',
  '移行用:店舗名': 'migration_store', '移行用:工事分類': 'migration_construction_type',
  '移行用:問合項目ー工事種類': 'migration_inquiry_type', '移行用:プラン契約番号': 'migration_plan_contract',
  '入金:状態': 'payment_status', '入金:契約日': 'payment_contract_date',
  '入金:着工日': 'payment_start_date', '入金:完成日': 'payment_completion_date', '入金:引渡日': 'payment_handover_date',
  '契約時:売上金額（税込）': 'order_amount', '契約時:売上金額（税抜）': 'contract_amount_ex_tax',
  '契約時:原価': 'contract_cost', '契約時:予備原価': 'contract_reserve_cost',
  '契約時:粗利': 'contract_gross_profit', '契約時:粗利率': 'contract_gross_profit_rate',
  '実行予算確定時:売上金額（税込）': 'budget_amount_inc_tax', '実行予算確定時:売上金額（税抜）': 'budget_amount_ex_tax',
  '実行予算確定時:原価': 'budget_cost', '実行予算確定時:予備原価': 'budget_reserve_cost',
  '実行予算確定時:粗利': 'budget_gross_profit', '実行予算確定時:粗利率': 'budget_gross_profit_rate',
  '進行中:売上金額（税込）': 'progress_amount_inc_tax', '進行中:売上金額（税抜）': 'progress_amount_ex_tax',
  '進行中:原価': 'progress_cost', '進行中:予備原価': 'progress_reserve_cost',
  '進行中 粗利額': 'progress_gross_profit', '進行中 粗利率': 'progress_gross_profit_rate',
  '精算完了時:売上金額（税込）': 'settlement_amount_inc_tax', '精算完了時:売上金額（税抜）': 'settlement_amount_ex_tax',
  '精算完了時:原価': 'settlement_cost', '精算完了時:予備原価': 'settlement_reserve_cost',
  '精算完了時:粗利': 'settlement_gross_profit', '精算完了時:粗利率': 'settlement_gross_profit_rate',
  '税率': 'tax_rate',
}

const DEALS_CUSTOMER_COLUMN_MAP = {
  '顧客ID': 'andpad_id', '顧客管理ID': 'management_id', '種別': 'customer_type',
  '顧客名': 'name', '顧客名 敬称': 'name_title', '顧客名（カナ）': 'name_kana',
  '顧客名2': 'name2', '顧客名2 敬称': 'name2_title', '顧客名2（カナ）': 'name2_kana',
  '顧客郵便番号': 'postal_code', '顧客都道府県': 'prefecture', '顧客現住所': 'address',
  '顧客緯度': 'latitude', '顧客経度': 'longitude',
  '顧客担当者名': 'contact_name', '顧客担当者名（カナ）': 'contact_name_kana',
  '顧客電話番号1': 'phone1', '顧客電話番号2': 'phone2',
  '顧客メールアドレス': 'email', '顧客FAX': 'fax',
  '顧客ランク': 'rank', '顧客分類': 'classification',
  '担当者所属店舗': 'staff_store', '担当者': 'staff_name', 'DMの可否': 'dm_allowed',
}

// ========== 型変換 ==========
const BIGINT_COLUMNS = new Set([
  'estimate_amount', 'estimate_amount_ex_tax', 'estimate_cost', 'estimate_gross_profit', 'order_amount',
  'contract_amount_ex_tax', 'contract_cost', 'contract_reserve_cost', 'contract_gross_profit',
  'budget_amount_inc_tax', 'budget_amount_ex_tax', 'budget_cost', 'budget_reserve_cost', 'budget_gross_profit',
  'progress_amount_inc_tax', 'progress_amount_ex_tax', 'progress_cost', 'progress_reserve_cost', 'progress_gross_profit',
  'settlement_amount_inc_tax', 'settlement_amount_ex_tax', 'settlement_cost', 'settlement_reserve_cost', 'settlement_gross_profit',
  'sales_amount_tax_included', 'sales_amount_tax_excluded', 'cost_amount', 'reserve_cost', 'gross_profit',
])

function applyMappings(rows, mappings) {
  return rows.map((row) => {
    const mapped = {}
    for (const { csvColumn, dbColumn } of mappings) {
      let value = row[csvColumn] != null ? String(row[csvColumn]).trim() : null
      if (value === '') value = null

      if (BIGINT_COLUMNS.has(dbColumn)) {
        if (value) {
          const s = String(value).replace(/,/g, '')
          if (/[\/\-]/.test(s) || !/^-?\d+(\.\d+)?$/.test(s)) value = null
          else value = parseInt(s, 10) || null
        } else value = null
      }
      if (dbColumn.includes('_rate') || dbColumn === 'tax_rate') {
        if (value) {
          const s = String(value)
          if (/[\/]/.test(s)) value = null
          else value = parseFloat(s) || null
        } else value = null
      }
      if (dbColumn.includes('date') && !BIGINT_COLUMNS.has(dbColumn) && value) {
        const s = String(value)
        const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
        if (m) value = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
      }
      if (dbColumn === 'is_main_contract') value = String(value) === '1'
      mapped[dbColumn] = value
    }
    return mapped
  })
}

// ========== 店舗振り分け ==========
function isCompanyManaged(staffName) {
  return /会社管理/.test(staffName || '')
}

function getAreaFromAddress(address) {
  if (!address) return null
  if (/松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町/.test(address)) return '本社'
  if (/長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村/.test(address)) return '長野'
  if (/上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村/.test(address)) return '上田'
  if (/伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村/.test(address)) return '伊那'
  return null
}

// ========== Google Drive操作 ==========
async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function listXlsxFiles(drive) {
  const res = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false`,
    fields: 'files(id,name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  })
  return res.data.files || []
}

async function downloadFile(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  )
  return res.data
}

async function deleteFile(drive, fileId) {
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

// ========== メインのインポート処理 ==========
async function importFile(drive, file) {
  const errors = []
  console.log(`Processing: ${file.name}`)

  const buffer = await downloadFile(drive, file.id)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const rows = rawRows.map((row) => {
    const cleaned = {}
    for (const [key, val] of Object.entries(row)) {
      cleaned[key.trim().replace(/^\ufeff/, '')] = val == null ? '' : String(val).trim()
    }
    return cleaned
  })

  if (rows.length === 0) return { fileName: file.name, success: 0, customerCount: 0, errors: [] }

  const headers = Object.keys(rows[0])
  const mappings = headers
    .filter((h) => DEALS_MAPPINGS[h.trim()])
    .map((h) => ({ csvColumn: h.trim(), dbColumn: DEALS_MAPPINGS[h.trim()] }))

  const mapped = applyMappings(rows, mappings)

  // 顧客データupsert
  let customerCount = 0
  const customerRows = {}
  for (const row of rows) {
    const custId = (row['顧客ID'] || '').trim()
    const custName = (row['顧客名'] || '').trim()
    if (!custId || !custName) continue
    if (customerRows[custId]) continue
    const custRow = {}
    for (const [csvCol, dbCol] of Object.entries(DEALS_CUSTOMER_COLUMN_MAP)) {
      const val = (row[csvCol] || '').trim() || null
      if (val) custRow[dbCol] = val
    }
    if (custRow.andpad_id && custRow.name) customerRows[custId] = custRow
  }

  const custArray = Object.values(customerRows)
  for (let i = 0; i < custArray.length; i += 100) {
    const chunk = custArray.slice(i, i + 100)
    const { error, data } = await supabase.from('customers').upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
    if (error) {
      for (const cRow of chunk) {
        const { error: cErr } = await supabase.from('customers').upsert([cRow], { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
        if (cErr) errors.push(`顧客 ${cRow.andpad_id} (${cRow.name || ''}): ${cErr.message}`)
        else customerCount += 1
      }
    } else {
      customerCount += data?.length || 0
    }
  }

  // 会社管理スタッフの店舗振り分け
  const custAddrMap = {}
  for (const row of rows) {
    const custId = (row['顧客ID'] || '').trim()
    const addr = (row['顧客現住所'] || '').trim()
    if (custId && addr) custAddrMap[custId] = addr
  }
  for (const row of mapped) {
    if (isCompanyManaged(row.staff_name)) {
      const addr = row.customer_andpad_id ? custAddrMap[row.customer_andpad_id] : null
      const area = getAreaFromAddress(addr)
      if (area) row.store_name = `${area}　会社管理`
    }
  }

  // インポートレコード作成
  const { data: importRecord } = await supabase
    .from('csv_imports')
    .insert({ file_name: `[自動] ${file.name}`, table_name: 'deals', status: 'processing' })
    .select().single()

  // バッチupsert
  const rowsWithImportId = mapped.map((r) => ({ ...r, csv_import_id: importRecord?.id }))
  let successCount = 0
  const dbToLabel = {}
  for (const m of mappings) dbToLabel[m.dbColumn] = m.csvColumn

  for (let i = 0; i < rowsWithImportId.length; i += 100) {
    const chunk = rowsWithImportId.slice(i, i + 100)
    const { error, data } = await supabase.from('deals').upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
    if (error) {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]
        const rowNum = i + j + 2
        const { error: rowError } = await supabase.from('deals').upsert([row], { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
        if (rowError) {
          const valMatch = rowError.message.match(/invalid input.*?:\s*"(.+?)"/)
          const badValue = valMatch ? valMatch[1] : null
          let colInfo = ''
          if (badValue) {
            const found = Object.entries(row).find(([, v]) => String(v) === badValue)
            if (found) colInfo = ` [項目: ${dbToLabel[found[0]] || found[0]}, 値: "${badValue}"]`
          }
          const id = row.andpad_id || row.name || ''
          errors.push(`行${rowNum} (${id})${colInfo}: ${rowError.message}`)
        } else {
          successCount += 1
        }
      }
    } else {
      successCount += data?.length || 0
    }
  }

  // インポートレコード更新
  if (importRecord) {
    await supabase.from('csv_imports').update({
      status: errors.length > 0 ? 'error' : 'completed',
      row_count: successCount, error_count: errors.length,
      error_message: errors.join('; ') || null,
    }).eq('id', importRecord.id)
  }

  // Driveから削除
  await deleteFile(drive, file.id)
  console.log(`Done: ${file.name} - ${successCount} rows, ${customerCount} customers, ${errors.length} errors`)

  return { fileName: file.name, success: successCount, customerCount, errors }
}

// ========== Cloud Function エントリポイント (Gen1 HTTP) ==========
exports.importFromDrive = async (req, res) => {
  try {
    const drive = await getDriveClient()
    const files = await listXlsxFiles(drive)

    if (files.length === 0) {
      console.log('No xlsx files found')
      res.json({ message: 'No xlsx files found', processed: 0 })
      return
    }

    const results = []
    for (const file of files) {
      try {
        const result = await importFile(drive, file)
        results.push(result)
      } catch (e) {
        console.error(`Failed: ${file.name} - ${e.message}`)
        results.push({ fileName: file.name, success: 0, customerCount: 0, errors: [e.message] })
      }
    }

    res.json({
      message: `Processed ${results.length} file(s)`,
      results: results.map((r) => ({
        fileName: r.fileName, success: r.success,
        customerCount: r.customerCount, errorCount: r.errors.length,
      })),
    })
  } catch (e) {
    console.error(`import-from-drive error: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
}
