export type TargetTable = 'customers' | 'properties' | 'deals' | 'contracts'

export interface ColumnMapping {
  csvColumn: string
  dbColumn: string
}

export interface CsvImportState {
  step: 'upload' | 'mapping' | 'preview' | 'importing' | 'done'
  file: File | null
  targetTable: TargetTable | null
  parsedHeaders: string[]
  parsedRows: Record<string, string>[]
  columnMappings: ColumnMapping[]
  importResult: {
    rowCount: number
    errorCount: number
    errors: string[]
  } | null
}

// ANDPAD CSVカラム → DBカラムのデフォルトマッピング
export const DEFAULT_MAPPINGS: Record<TargetTable, Record<string, string>> = {
  customers: {
    '顧客ID': 'andpad_id',
    '顧客名': 'name',
    '顧客名（カナ）': 'name_kana',
    '種別': 'customer_type',
    '顧客郵便番号': 'postal_code',
    '顧客都道府県': 'prefecture',
    '顧客現住所': 'address',
    '顧客電話番号1': 'phone1',
    '顧客電話番号2': 'phone2',
    '顧客メールアドレス': 'email',
    '顧客FAX': 'fax',
    '顧客ランク': 'rank',
    '顧客分類': 'classification',
    '性別': 'gender',
    '生年月日': 'birth_date',
    '担当者所属店舗': 'staff_store',
    '担当者': 'staff_name',
    '紹介者': 'referrer',
    'DMの可否': 'dm_allowed',
    '顧客備考': 'notes',
  },
  properties: {
    '物件ID': 'andpad_id',
    '物件管理ID': 'management_id',
    '物件種別': 'property_type',
    '物件名': 'name',
    '物件名（カナ）': 'name_kana',
    '号室': 'room_number',
    '物件住所種別': 'address_type',
    '物件郵便番号': 'postal_code',
    '物件都道府県': 'prefecture',
    '物件住所': 'address',
    '物件緯度': 'latitude',
    '物件経度': 'longitude',
    '物件電話番号': 'phone',
    '交通アクセス': 'access',
    '築年月': 'built_date',
    '専有面積・延床面積': 'floor_area',
    '間取り': 'layout',
    '材質構造': 'structure',
    '総戸数': 'total_units',
    '物件備考': 'notes',
  },
  deals: {
    'システムID': 'andpad_id',
    '案件管理ID': 'management_id',
    '問合番号': 'inquiry_number',
    '案件名': 'name',
    '顧客ID': 'customer_andpad_id',
    '案件種別': 'deal_category',
    '案件区分': 'deal_type',
    '主担当店舗': 'store_name',
    '主担当': 'staff_name',
    '反響元': 'source',
    '引合状況': 'status',
    '反響日': 'inquiry_date',
    '売上見込 売上(税込)': 'estimate_amount',
    '契約時:売上金額（税込）': 'order_amount',
    '初回面談日(実績)': 'meeting_date',
    '契約日(実績)': 'order_date',
    '着工日(実績)': 'start_date',
    '完成日(実績)': 'completion_date',
    '引渡日(実績)': 'completion_date',
    '失注日': 'lost_date',
    '工事種類': 'category',
    '顧客名': 'customer_name',
  },
  contracts: {
    'システムID': 'andpad_id',
    '案件管理ID': 'deal_management_id',
    '契約番号': 'contract_number',
    '問合番号': 'inquiry_number',
    '案件名': 'deal_name',
    '案件_案件区分': 'deal_type',
    '主担当店舗コード': 'store_code',
    '主担当店舗': 'store_name',
    'ID': 'andpad_id',
    '契約名': 'contract_name',
    '契約_案件区分': 'contract_type',
    '対象見積ID': 'estimate_id',
    '売上金額（税込）': 'sales_amount_tax_included',
    '売上金額（税抜）': 'sales_amount_tax_excluded',
    '原価': 'cost_amount',
    '予備原価': 'reserve_cost',
    '粗利額': 'gross_profit',
    '粗利率': 'gross_profit_rate',
    '本契約フラグ': 'is_main_contract',
    '契約日': 'contract_date',
    '消費税': 'tax_rate',
  },
}

export const TABLE_LABELS: Record<TargetTable, string> = {
  customers: '顧客',
  properties: '物件',
  deals: '案件',
  contracts: '契約',
}
