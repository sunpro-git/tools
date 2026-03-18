import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vkovflhltggyrgimeabp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE'
)

function clean(val) {
  if (val === '' || val === undefined || val === null) return null
  return String(val).trim()
}
function cleanInt(val) {
  if (val === '' || val === undefined || val === null) return null
  const n = parseInt(String(val).replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}
function cleanDate(val) {
  if (!val || val === '') return null
  const s = String(val).trim()
  const match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(parseInt(s))
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return null
}

const filePath = 'C:\\Users\\imoto\\OneDrive\\デスクトップ\\04_INBOX\\orders_output_orders_exporter_781584 (3).xlsx'

console.log('=== 案件upsert ===')
const wb = XLSX.readFile(filePath)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
console.log(`  ${rows.length} rows read`)

const mapped = rows.map(r => {
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

let success = 0, errors = 0
for (let i = 0; i < mapped.length; i += 50) {
  const chunk = mapped.slice(i, i + 50)
  const { data, error } = await supabase
    .from('deals')
    .upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false })
    .select('id')
  if (error) {
    console.error(`  Error at ${i}: ${error.message}`)
    errors += chunk.length
  } else {
    success += data.length
  }
}
console.log(`  Done: ${success} success, ${errors} errors`)
