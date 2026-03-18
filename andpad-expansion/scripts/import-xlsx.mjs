import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const supabase = createClient(
  'https://vkovflhltggyrgimeabp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE'
)

function readXlsx(filePath) {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

function clean(val) {
  if (val === '' || val === undefined || val === null) return null
  return String(val).trim()
}

function cleanInt(val) {
  if (val === '' || val === undefined || val === null) return null
  const n = parseInt(String(val).replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

function cleanFloat(val) {
  if (val === '' || val === undefined || val === null) return null
  const n = parseFloat(String(val))
  return isNaN(n) ? null : n
}

function cleanDate(val) {
  if (!val || val === '') return null
  const s = String(val).trim()
  // Handle YYYY/MM/DD or YYYY-MM-DD
  const match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  }
  // Handle Excel serial dates
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(parseInt(s))
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return null
}

async function upsertBatch(table, rows, conflictCol = 'andpad_id') {
  let success = 0
  let errors = 0
  const chunkSize = 50

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictCol, ignoreDuplicates: false })
      .select('id')

    if (error) {
      console.error(`  Error at rows ${i}-${i + chunk.length}: ${error.message}`)
      errors += chunk.length
    } else {
      success += data.length
    }
  }
  return { success, errors }
}

// ===================== CUSTOMERS =====================
async function importCustomers(filePath) {
  console.log('\n=== 顧客インポート ===')
  const rows = readXlsx(filePath)
  console.log(`  ${rows.length} rows read`)

  const mapped = rows.map(r => ({
    andpad_id: clean(r['顧客ID']),
    name: clean(r['顧客名']) || '名前なし',
    name_kana: clean(r['顧客名（カナ）']),
    customer_type: clean(r['種別']),
    postal_code: clean(r['顧客郵便番号']),
    prefecture: clean(r['顧客都道府県']),
    address: clean(r['顧客現住所']),
    phone1: clean(r['顧客電話番号1']),
    phone2: clean(r['顧客電話番号2']),
    email: clean(r['顧客メールアドレス']),
    fax: clean(r['顧客FAX']),
    rank: clean(r['顧客ランク']),
    classification: clean(r['顧客分類']),
    gender: clean(r['性別']),
    staff_store: clean(r['担当者所属店舗']),
    staff_name: clean(r['担当者']),
    referrer: clean(r['紹介者']),
    dm_allowed: clean(r['DMの可否']),
    notes: clean(r['顧客備考']),
  })).filter(r => r.andpad_id)

  console.log(`  ${mapped.length} valid rows`)
  const result = await upsertBatch('customers', mapped)
  console.log(`  Done: ${result.success} success, ${result.errors} errors`)
}

// ===================== PROPERTIES =====================
async function importProperties(filePath) {
  console.log('\n=== 物件インポート ===')
  const rows = readXlsx(filePath)
  console.log(`  ${rows.length} rows read`)

  const mapped = rows.map(r => ({
    andpad_id: clean(r['物件ID']),
    management_id: clean(r['物件管理ID']),
    property_type: clean(r['物件種別']),
    name: clean(r['物件名']) || '名前なし',
    name_kana: clean(r['物件名（カナ）']),
    room_number: clean(r['号室']),
    address_type: clean(r['物件住所種別']),
    postal_code: clean(r['物件郵便番号']),
    prefecture: clean(r['物件都道府県']),
    address: clean(r['物件住所']),
    latitude: clean(r['物件緯度']),
    longitude: clean(r['物件経度']),
    phone: clean(r['物件電話番号']),
    access: clean(r['交通アクセス']),
    built_date: clean(r['築年月']),
    floor_area: clean(r['専有面積・延床面積']),
    layout: clean(r['間取り']),
    structure: clean(r['材質構造']),
    total_units: clean(r['総戸数']),
    notes: clean(r['物件備考']),
  })).filter(r => r.andpad_id)

  console.log(`  ${mapped.length} valid rows`)
  const result = await upsertBatch('properties', mapped)
  console.log(`  Done: ${result.success} success, ${result.errors} errors`)
}

// ===================== DEALS (案件) =====================
async function importDeals(filePath) {
  console.log('\n=== 案件インポート ===')
  const rows = readXlsx(filePath)
  console.log(`  ${rows.length} rows read`)

  const mapped = rows.map(r => {
    // Map 引合状況 to our status enum
    const rawStatus = clean(r['引合状況']) || ''
    let status = 'その他'
    if (rawStatus.includes('問合') || rawStatus.includes('反響')) status = '問い合わせ'
    else if (rawStatus.includes('商談') || rawStatus.includes('面談')) status = '商談'
    else if (rawStatus.includes('見積')) status = '見積'
    else if (rawStatus.includes('受注') || rawStatus.includes('契約')) status = '受注'
    else if (rawStatus.includes('着工')) status = '着工'
    else if (rawStatus.includes('施工')) status = '施工中'
    else if (rawStatus.includes('完工') || rawStatus.includes('完成') || rawStatus.includes('引渡')) status = '完工'
    else if (rawStatus.includes('失注') || rawStatus.includes('中止')) status = '失注'

    return {
      andpad_id: clean(r['システムID']),
      management_id: clean(r['案件管理ID']),
      inquiry_number: clean(r['問合番号']),
      name: clean(r['案件名']) || '名前なし',
      deal_type: clean(r['案件区分']),
      store_name: clean(r['主担当店舗']),
      staff_name: clean(r['主担当']),
      customer_name: clean(r['顧客名']),
      source: clean(r['反響元']),
      status,
      estimate_amount: cleanInt(r['売上見込 売上(税込)']),
      order_amount: cleanInt(r['契約時:売上金額（税込）']),
      inquiry_date: cleanDate(r['反響日']),
      meeting_date: cleanDate(r['初回面談日(実績)']),
      estimate_date: cleanDate(r['現調日(実績)']),
      order_date: cleanDate(r['契約日(実績)']),
      start_date: cleanDate(r['着工日(実績)']),
      completion_date: cleanDate(r['完成日(実績)']) || cleanDate(r['引渡日(実績)']),
      lost_date: cleanDate(r['失注日']),
      category: clean(r['工事種類']),
    }
  }).filter(r => r.andpad_id)

  console.log(`  ${mapped.length} valid rows`)
  const result = await upsertBatch('deals', mapped)
  console.log(`  Done: ${result.success} success, ${result.errors} errors`)
}

// ===================== CONTRACTS (契約) =====================
async function importContracts(filePath) {
  console.log('\n=== 契約インポート ===')
  const rows = readXlsx(filePath)
  console.log(`  ${rows.length} rows read`)

  const mapped = rows.map(r => ({
    andpad_id: clean(r['ID']) || clean(r['システムID']),
    deal_management_id: clean(r['案件管理ID']),
    contract_number: clean(r['契約番号']),
    inquiry_number: clean(r['問合番号']),
    deal_name: clean(r['案件名']),
    deal_type: clean(r['案件_案件区分']),
    store_name: clean(r['主担当店舗']),
    contract_name: clean(r['契約名']),
    contract_type: clean(r['契約_案件区分']),
    estimate_id: clean(r['対象見積ID']),
    sales_amount_tax_included: cleanInt(r['売上金額（税込）']),
    sales_amount_tax_excluded: cleanInt(r['売上金額（税抜）']),
    cost_amount: cleanInt(r['原価']),
    reserve_cost: cleanInt(r['予備原価']),
    gross_profit: cleanInt(r['粗利額']),
    gross_profit_rate: cleanFloat(r['粗利率']),
    is_main_contract: String(r['本契約フラグ']) === '1',
    contract_date: cleanDate(r['契約日']),
    tax_rate: cleanFloat(r['消費税']),
  })).filter(r => r.andpad_id)

  console.log(`  ${mapped.length} valid rows`)
  const result = await upsertBatch('contracts', mapped)
  console.log(`  Done: ${result.success} success, ${result.errors} errors`)
}

// ===================== MAIN =====================
const BASE = 'C:\\Users\\imoto\\OneDrive\\デスクトップ\\04_INBOX'

async function main() {
  console.log('ANDPAD XLSX Import Start')

  await importCustomers(path.join(BASE, 'customers_output_customers_exporter_781584.xlsx'))
  await importProperties(path.join(BASE, 'properties_output_properties_exporter_781584.xlsx'))
  await importDeals(path.join(BASE, 'orders_output_orders_exporter_781584 (2).xlsx'))
  await importContracts(path.join(BASE, 'order_items_output_order_order_items_exporter_781584.xlsx'))

  console.log('\n=== All imports complete ===')
}

main().catch(console.error)
