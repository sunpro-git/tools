export interface Customer {
  id: string
  andpad_id: string | null
  name: string
  name_kana: string | null
  customer_type: string | null
  postal_code: string | null
  prefecture: string | null
  address: string | null
  phone1: string | null
  phone2: string | null
  email: string | null
  fax: string | null
  rank: string | null
  classification: string | null
  gender: string | null
  birth_date: string | null
  staff_store: string | null
  staff_name: string | null
  referrer: string | null
  dm_allowed: string | null
  notes: string | null
  source: string | null
  first_contact_date: string | null
  csv_import_id: string | null
  created_at: string
}

export interface Property {
  id: string
  andpad_id: string | null
  management_id: string | null
  customer_id: string | null
  property_type: string | null
  name: string
  name_kana: string | null
  room_number: string | null
  address_type: string | null
  postal_code: string | null
  prefecture: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  phone: string | null
  access: string | null
  built_date: string | null
  floor_area: string | null
  layout: string | null
  structure: string | null
  total_units: string | null
  notes: string | null
  csv_import_id: string | null
  created_at: string
}

export type DealStatus = '問い合わせ' | '商談' | '見積' | '受注' | '着工' | '施工中' | '完工' | '失注' | 'その他'

export interface Deal {
  id: string
  andpad_id: string | null
  management_id: string | null
  inquiry_number: string | null
  name: string
  deal_type: string | null
  store_code: string | null
  store_name: string | null
  customer_id: string | null
  customer_name: string | null
  property_id: string | null
  staff_name: string | null
  source: string | null
  status: DealStatus
  estimate_amount: number | null
  order_amount: number | null
  inquiry_date: string | null
  meeting_date: string | null
  estimate_date: string | null
  order_date: string | null
  start_date: string | null
  completion_date: string | null
  lost_date: string | null
  customer_andpad_id: string | null
  deal_category: string | null
  category: string | null
  notes: string | null
  csv_import_id: string | null
  created_at: string
  updated_at: string

  // 反響区分
  response_type: string | null
  response_category: string | null
  response_category_detail: string | null

  // 契約・案件詳細
  contract_number: string | null
  main_contract_number: string | null
  deal_flow: string | null
  deal_workflow: string | null
  deal_creator: string | null
  deal_created_at: string | null
  closing_probability: string | null

  // 売上見込
  estimate_amount_ex_tax: number | null
  estimate_cost: number | null
  estimate_gross_profit: number | null
  estimate_gross_profit_rate: string | null

  // 工事関連
  construction_location: string | null
  construction_content: string | null
  receptionist: string | null
  desired_budget: string | null
  construction_trigger: string | null
  lost_reason: string | null
  lost_type: string | null

  // 日程（予定・実績）
  meeting_date_planned: string | null
  visit_date_planned: string | null
  visit_date_actual: string | null
  survey_date_planned: string | null
  plan_submit_date_planned: string | null
  plan_submit_date_actual: string | null
  seismic_date_planned: string | null
  seismic_date_actual: string | null
  design_date_planned: string | null
  design_date_actual: string | null
  order_date_planned: string | null
  start_date_planned: string | null
  topping_date_planned: string | null
  topping_date_actual: string | null
  completion_date_planned: string | null
  handover_date_planned: string | null
  handover_date_actual: string | null

  // 役割
  role_sales: string | null
  role_design: string | null
  role_construction: string | null
  role_ic: string | null
  role_construction_sub1: string | null
  role_construction_sub2: string | null
  role_other: string | null
  role_sales_sub: string | null
  role_ex: string | null

  // ラベル
  label_area: string | null
  label_office: string | null
  label_construction_type: string | null

  // 移行用
  migration_saksak_customer: string | null
  migration_saksak_inquiry: string | null
  migration_saksak_contract: string | null
  migration_dandori_id: string | null
  migration_store: string | null
  migration_construction_type: string | null
  migration_inquiry_type: string | null
  migration_plan_contract: string | null

  // 入金
  payment_status: string | null
  payment_contract_date: string | null
  payment_start_date: string | null
  payment_completion_date: string | null
  payment_handover_date: string | null

  // 契約時金額
  contract_amount_ex_tax: number | null
  contract_cost: number | null
  contract_reserve_cost: number | null
  contract_gross_profit: number | null
  contract_gross_profit_rate: string | null

  // 実行予算確定時
  budget_amount_inc_tax: number | null
  budget_amount_ex_tax: number | null
  budget_cost: number | null
  budget_reserve_cost: number | null
  budget_gross_profit: number | null
  budget_gross_profit_rate: string | null

  // 進行中
  progress_amount_inc_tax: number | null
  progress_amount_ex_tax: number | null
  progress_cost: number | null
  progress_reserve_cost: number | null
  progress_gross_profit: number | null
  progress_gross_profit_rate: string | null

  // 精算完了時
  settlement_amount_inc_tax: number | null
  settlement_amount_ex_tax: number | null
  settlement_cost: number | null
  settlement_reserve_cost: number | null
  settlement_gross_profit: number | null
  settlement_gross_profit_rate: string | null

  // 税率
  tax_rate: string | null
}

export interface Contract {
  id: string
  andpad_id: string | null
  deal_id: string | null
  deal_management_id: string | null
  contract_number: string | null
  inquiry_number: string | null
  deal_name: string | null
  deal_type: string | null
  store_code: string | null
  store_name: string | null
  contract_name: string | null
  contract_type: string | null
  estimate_id: string | null
  sales_amount_tax_included: number | null
  sales_amount_tax_excluded: number | null
  cost_amount: number | null
  reserve_cost: number | null
  gross_profit: number | null
  gross_profit_rate: number | null
  is_main_contract: boolean
  contract_date: string | null
  tax_rate: number | null
  csv_import_id: string | null
  created_at: string
}

export interface Event {
  id: string
  name: string
  event_url: string | null
  event_type: string
  division: string[]
  brand: string | null
  area1: string | null
  area2: string | null
  address: string | null
  dates: string[]
  target_visitors: number
  promotion_cost: number
  cost_insert: number
  cost_posting: number
  cost_web: number
  cost_dm: number
  cost_other: number
  thumbnail_url: string | null
  google_map_url: string | null
  store_name: string | null
  note: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface EventVisitor {
  id: string
  event_id: string
  name: string
  name_kana: string | null
  phone: string | null
  email: string | null
  postal_code: string | null
  address: string | null
  customer_type: '新規' | '既存'
  media_source: string | null
  reservation_date: string | null
  visit_date: string | null
  has_next_appointment: boolean
  next_appointment_date: string | null
  next_appointment_note: string | null
  note: string | null
  created_at: string
}

export interface CsvImport {
  id: string
  file_name: string
  table_name: string
  row_count: number
  error_count: number
  status: 'processing' | 'completed' | 'error'
  error_message: string | null
  created_at: string
}
