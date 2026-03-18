import fs from 'fs'
import Papa from 'papaparse'
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
  return null
}
function inc(s, keyword) {
  return s && s.indexOf(keyword) !== -1
}
function isEmpty(v) {
  return v === null || v === undefined || v === ''
}

/**
 * GASの分類ロジックを移植: 反響区分・反響区分詳細を算出
 */
function classifyResponse({ source, responseType, storeName, dealName }) {
  const src = source || ''
  const rt = responseType || ''
  const rt1 = rt.includes('/') ? rt.split('/')[0] : rt
  const rt2 = rt.includes('/') ? rt.split('/')[1] : '-'
  const store = storeName || ''

  let category = null
  let detail = null

  if (src === '' && rt1 === '') {
    category = '10 きっかけ不明 問合せ'
  } else if (src === 'オーナー様本人') {
    category = '01 オーナー様本人'
  } else if (src === 'オーナー様紹介') {
    category = '02 オーナー様紹介'
  } else if (src === 'パートナー紹介') {
    category = '02 パートナー紹介'
  } else if (src === 'スタッフ本人' || src === 'スタッフ親族') {
    category = '01 スタッフ本人・親族'
  } else if (src === 'スタッフ紹介') {
    category = '02 スタッフ紹介'
  } else if (src === 'サンプロ不動産からの紹介' || src === '新築部からの紹介'
    || src === 'リフォーム部からの紹介' || src === 'ソリューション部からの紹介') {
    category = '02 社内紹介'
  } else if (inc(src, '紹介')) {
    category = '02 オーナー様紹介'
  } else if (inc(rt1, 'イベント来場')) {
    if (inc(rt2, 'お披露目会') || inc(rt2, '見学会')) {
      category = '12 見学会・お披露目会'
    } else {
      category = '11 その他イベント'
    }
    detail = rt2
  } else if (inc(src, 'Instagram')) {
    category = '03 Instagram'
  } else if (inc(src, 'YouTube')) {
    category = '03 YouTube'
  } else if (inc(src, 'テレビCM')) {
    category = '05 テレビCM'
  } else if (inc(src, 'ハピすむ')) {
    category = '06 ハピすむ'
  } else if (inc(src, 'SUUMO')) {
    category = '06 SUUMO'
  } else if (inc(src, "HOME'S")) {
    category = "06 HOME'S"
  } else if (inc(src, '雑誌')) {
    category = '05 雑誌'
  } else if (inc(src, 'チラシ') || inc(src, 'DM')) {
    category = classifyChirashi(rt2, store)
  } else {
    // フォールバック分類
    category = classifyFallback(src, rt, rt1, rt2, store)
  }

  if (!category) {
    category = '10 きっかけ不明 問合せ'
  }

  if (!detail) {
    detail = category
  }

  return { category, detail }
}

function classifyChirashi(rt2, store) {
  if (inc(rt2, '塩尻') || inc(store, '本社')) return '04 チラシ_松本'
  if (inc(rt2, '松本') || inc(store, '松本')) return '04 チラシ_松本'
  if (inc(rt2, '長野') || inc(store, '長野')) return '04 チラシ_長野'
  if (inc(rt2, '上田') || inc(store, '上田')) return '04 チラシ_上田'
  if (inc(rt2, '伊那') || inc(store, '伊那')) return '04 チラシ_伊那'
  return '04 チラシ_その他'
}

function classifySoten(rt2, store) {
  if (inc(rt2, '上田')) return '07 総展_上田'
  if (inc(rt2, '長野')) return '07 総展_長野'
  if (inc(rt2, '松本')) return '07 総展_松本'
  if (inc(rt2, '伊那')) return '07 総展_伊那'
  // 住宅展示場イベント → 店舗で判定
  if (inc(store, '本社')) return '07 総展_松本'
  if (inc(store, '長野')) return '07 総展_長野'
  if (inc(store, '上田')) return '07 総展_上田'
  if (inc(store, '伊那')) return '07 総展_伊那'
  return '07 総展_松本'
}

function classifyWeb(rt2, store) {
  if (inc(rt2, '塩尻') || inc(store, '本社')) return '03 WEB検索などから問合せ_松本'
  if (inc(rt2, '松本') || inc(store, '松本')) return '03 WEB検索などから問合せ_松本'
  if (inc(rt2, '長野') || inc(store, '長野')) return '03 WEB検索などから問合せ_長野'
  if (inc(rt2, '上田') || inc(store, '上田')) return '03 WEB検索などから問合せ_上田'
  if (inc(rt2, '伊那') || inc(store, '伊那')) return '03 WEB検索などから問合せ_伊那'
  return '03 WEB検索などから問合せ_その他'
}

function classifyFallback(src, rt, rt1, rt2, store) {
  if (rt1 === '総合展示場来場') {
    return classifySoten(rt2, store)
  }
  if (inc(src, '住宅展示場')) {
    return classifySoten(rt2, store)
  }
  if (inc(src, 'イベント')) {
    if (rt1 === '総合展示場来場') return classifySoten(rt2, store)
    if (inc(src, '住宅展示場イベント')) return classifySoten(rt2, store)
    return '11 その他イベント'
  }
  if (inc(rt1, '資料請求')) return '09 資料請求'
  if (inc(rt, 'WEB')) return classifyWeb(rt2, store)
  if (inc(rt, 'ショールーム') || inc(rt, 'モデル') || inc(rt, '来場')) {
    return '10 きっかけ不明 来場'
  }
  if (inc(src, 'TEL')) return '10 きっかけ不明 問合せ'
  if (isEmpty(src) && inc(rt1, '問合')) return '10 きっかけ不明 問合せ'
  if (inc(src, 'WEB') || inc(src, '検索') || inc(src, 'バナー')) return classifyWeb(rt2, store)
  if (inc(src, '不明')) return '10 きっかけ不明 問合せ'
  if (inc(src, '通りすがり') || inc(src, '看板')) return '08 看板・通りすがり'
  if (src === '空欄') return '10 きっかけ不明 問合せ'
  return '10 きっかけ不明 問合せ'
}

// ============================

const filePath = 'C:\\Users\\imoto\\Downloads\\ANDPAD全案件データ① - ANDPAD案件 (1).csv'

console.log('=== CSV案件upsert ===')
const csvText = fs.readFileSync(filePath, 'utf-8')
const parsed = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().replace(/^\ufeff/, ''),
})

const rows = parsed.data
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

  const source = clean(r['反響元'])
  const responseType = clean(r['反響種別'])
  const storeName = clean(r['主担当店舗'])
  const dealName = clean(r['案件名']) || '名前なし'

  const { category, detail } = classifyResponse({
    source, responseType, storeName, dealName,
  })

  return {
    // 基本情報
    andpad_id: clean(r['システムID']),
    customer_andpad_id: clean(r['顧客ID']),
    management_id: clean(r['案件管理ID']),
    inquiry_number: clean(r['問合番号']),
    name: dealName,
    deal_type: clean(r['案件区分']),
    store_name: storeName,
    staff_name: clean(r['主担当']),
    customer_name: clean(r['顧客名']),
    source,
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
    deal_category: clean(r['案件種別']),
    category: clean(r['工事種類']),
    response_type: responseType,
    response_category: category,
    response_category_detail: detail,

    // 契約・案件詳細
    contract_number: clean(r['契約番号']),
    main_contract_number: clean(r['本契約番号']),
    deal_flow: clean(r['案件フロー']),
    deal_workflow: clean(r['案件ワークフロー']),
    deal_creator: clean(r['案件作成者']),
    deal_created_at: clean(r['案件作成日時']),
    closing_probability: clean(r['成約確度']),

    // 売上見込
    estimate_amount_ex_tax: cleanInt(r['売上見込 売上(税抜)']),
    estimate_cost: cleanInt(r['売上見込 原価']),
    estimate_gross_profit: cleanInt(r['売上見込 粗利額']),
    estimate_gross_profit_rate: clean(r['売上見込 粗利率']),

    // 工事関連
    construction_location: clean(r['工事場所']),
    construction_content: clean(r['工事内容']),
    receptionist: clean(r['受付者']),
    desired_budget: clean(r['希望工事予算']),
    construction_trigger: clean(r['施工きっかけ']),
    lost_reason: clean(r['失注理由']),
    lost_type: clean(r['失注種別']),

    // 日程（予定）
    meeting_date_planned: cleanDate(r['初回面談日(予定)']),
    visit_date_planned: cleanDate(r['初回訪問日(予定)']),
    visit_date_actual: cleanDate(r['初回訪問日(実績)']),
    survey_date_planned: cleanDate(r['現調日(予定)']),
    plan_submit_date_planned: cleanDate(r['初回プラン提出(予定)']),
    plan_submit_date_actual: cleanDate(r['初回プラン提出(実績)']),
    seismic_date_planned: cleanDate(r['耐震申込日(予定)']),
    seismic_date_actual: cleanDate(r['耐震申込日(実績)']),
    design_date_planned: cleanDate(r['設計申込日(予定)']),
    design_date_actual: cleanDate(r['設計申込日(実績)']),
    order_date_planned: cleanDate(r['契約日(予定)']),
    start_date_planned: cleanDate(r['着工日(予定)']),
    topping_date_planned: cleanDate(r['上棟日(予定)']),
    topping_date_actual: cleanDate(r['上棟日(実績)']),
    completion_date_planned: cleanDate(r['完成日(予定)']),
    handover_date_planned: cleanDate(r['引渡日(予定)']),
    handover_date_actual: cleanDate(r['引渡日(実績)']),

    // 役割
    role_sales: clean(r['役割:営業']),
    role_design: clean(r['役割:設計']),
    role_construction: clean(r['役割:工事']),
    role_ic: clean(r['役割:インテリアコーディネーター']),
    role_construction_sub1: clean(r['役割:施工管理補助①']),
    role_construction_sub2: clean(r['役割:施工管理補助②']),
    role_other: clean(r['役割:その他']),
    role_sales_sub: clean(r['役割:営業補助']),
    role_ex: clean(r['役割:EX事業部']),

    // ラベル
    label_area: clean(r['ラベル:施工エリア']),
    label_office: clean(r['ラベル:営業所']),
    label_construction_type: clean(r['ラベル:工事分類']),

    // 移行用
    migration_saksak_customer: clean(r['移行用:SAKSAK顧客コード']),
    migration_saksak_inquiry: clean(r['移行用:SAKSAK問合番号']),
    migration_saksak_contract: clean(r['移行用:SAKSAK契約番号']),
    migration_dandori_id: clean(r['移行用:ダンドリワーク現場ID']),
    migration_store: clean(r['移行用:店舗名']),
    migration_construction_type: clean(r['移行用:工事分類']),
    migration_inquiry_type: clean(r['移行用:問合項目ー工事種類']),
    migration_plan_contract: clean(r['移行用:プラン契約番号']),

    // 入金
    payment_status: clean(r['入金:状態']),
    payment_contract_date: cleanDate(r['入金:契約日']),
    payment_start_date: cleanDate(r['入金:着工日']),
    payment_completion_date: cleanDate(r['入金:完成日']),
    payment_handover_date: cleanDate(r['入金:引渡日']),

    // 契約時金額
    contract_amount_ex_tax: cleanInt(r['契約時:売上金額（税抜）']),
    contract_cost: cleanInt(r['契約時:原価']),
    contract_reserve_cost: cleanInt(r['契約時:予備原価']),
    contract_gross_profit: cleanInt(r['契約時:粗利']),
    contract_gross_profit_rate: clean(r['契約時:粗利率']),

    // 実行予算確定時
    budget_amount_inc_tax: cleanInt(r['実行予算確定時:売上金額（税込）']),
    budget_amount_ex_tax: cleanInt(r['実行予算確定時:売上金額（税抜）']),
    budget_cost: cleanInt(r['実行予算確定時:原価']),
    budget_reserve_cost: cleanInt(r['実行予算確定時:予備原価']),
    budget_gross_profit: cleanInt(r['実行予算確定時:粗利']),
    budget_gross_profit_rate: clean(r['実行予算確定時:粗利率']),

    // 進行中
    progress_amount_inc_tax: cleanInt(r['進行中:売上金額（税込）']),
    progress_amount_ex_tax: cleanInt(r['進行中:売上金額（税抜）']),
    progress_cost: cleanInt(r['進行中:原価']),
    progress_reserve_cost: cleanInt(r['進行中:予備原価']),
    progress_gross_profit: cleanInt(r['進行中 粗利額']),
    progress_gross_profit_rate: clean(r['進行中 粗利率']),

    // 精算完了時
    settlement_amount_inc_tax: cleanInt(r['精算完了時:売上金額（税込）']),
    settlement_amount_ex_tax: cleanInt(r['精算完了時:売上金額（税抜）']),
    settlement_cost: cleanInt(r['精算完了時:原価']),
    settlement_reserve_cost: cleanInt(r['精算完了時:予備原価']),
    settlement_gross_profit: cleanInt(r['精算完了時:粗利']),
    settlement_gross_profit_rate: clean(r['精算完了時:粗利率']),

    // 税率
    tax_rate: clean(r['税率']),
  }
}).filter(r => r.andpad_id)

console.log(`  ${mapped.length} valid rows`)

// 反響区分の分布を表示
const catCounts = {}
mapped.forEach(r => {
  const c = r.response_category || 'null'
  catCounts[c] = (catCounts[c] || 0) + 1
})
console.log('  反響区分 分布:')
Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`    ${k}: ${v}`)
})

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
