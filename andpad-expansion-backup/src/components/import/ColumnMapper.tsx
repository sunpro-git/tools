import type { ColumnMapping, TargetTable } from '../../types/csv'

interface Props {
  headers: string[]
  mappings: ColumnMapping[]
  targetTable: TargetTable
  onMappingsChange: (mappings: ColumnMapping[]) => void
}

const DB_COLUMNS: Record<TargetTable, { value: string; label: string }[]> = {
  customers: [
    { value: '', label: '-- スキップ --' },
    { value: 'andpad_id', label: 'ANDPAD ID' },
    { value: 'name', label: '顧客名' },
    { value: 'name_kana', label: '顧客名(カナ)' },
    { value: 'customer_type', label: '種別' },
    { value: 'postal_code', label: '郵便番号' },
    { value: 'prefecture', label: '都道府県' },
    { value: 'address', label: '住所' },
    { value: 'phone1', label: '電話番号1' },
    { value: 'phone2', label: '電話番号2' },
    { value: 'email', label: 'メール' },
    { value: 'fax', label: 'FAX' },
    { value: 'rank', label: 'ランク' },
    { value: 'classification', label: '分類' },
    { value: 'gender', label: '性別' },
    { value: 'birth_date', label: '生年月日' },
    { value: 'staff_store', label: '担当店舗' },
    { value: 'staff_name', label: '担当者' },
    { value: 'referrer', label: '紹介者' },
    { value: 'dm_allowed', label: 'DM可否' },
    { value: 'notes', label: '備考' },
    { value: 'source', label: '集客媒体' },
  ],
  properties: [
    { value: '', label: '-- スキップ --' },
    { value: 'andpad_id', label: 'ANDPAD ID' },
    { value: 'management_id', label: '管理ID' },
    { value: 'property_type', label: '物件種別' },
    { value: 'name', label: '物件名' },
    { value: 'name_kana', label: '物件名(カナ)' },
    { value: 'room_number', label: '号室' },
    { value: 'postal_code', label: '郵便番号' },
    { value: 'prefecture', label: '都道府県' },
    { value: 'address', label: '住所' },
    { value: 'phone', label: '電話番号' },
    { value: 'built_date', label: '築年月' },
    { value: 'floor_area', label: '面積' },
    { value: 'layout', label: '間取り' },
    { value: 'structure', label: '構造' },
    { value: 'notes', label: '備考' },
  ],
  deals: [
    { value: '', label: '-- スキップ --' },
    { value: 'andpad_id', label: 'ANDPAD ID' },
    { value: 'management_id', label: '案件管理ID' },
    { value: 'inquiry_number', label: '問合番号' },
    { value: 'name', label: '案件名' },
    { value: 'deal_type', label: '案件区分' },
    { value: 'store_name', label: '店舗' },
    { value: 'staff_name', label: '担当者' },
    { value: 'customer_name', label: '顧客名' },
    { value: 'source', label: '反響元' },
    { value: 'status', label: 'ステータス' },
    { value: 'estimate_amount', label: '見積金額' },
    { value: 'order_amount', label: '受注金額' },
    { value: 'inquiry_date', label: '問い合わせ日' },
    { value: 'meeting_date', label: '商談日' },
    { value: 'estimate_date', label: '見積日' },
    { value: 'order_date', label: '受注日' },
    { value: 'start_date', label: '着工日' },
    { value: 'completion_date', label: '完工日' },
    { value: 'lost_date', label: '失注日' },
    { value: 'category', label: '工事種類' },
    { value: 'notes', label: '備考' },
  ],
  contracts: [
    { value: '', label: '-- スキップ --' },
    { value: 'andpad_id', label: 'ANDPAD ID' },
    { value: 'deal_management_id', label: '案件管理ID' },
    { value: 'contract_number', label: '契約番号' },
    { value: 'inquiry_number', label: '問合番号' },
    { value: 'deal_name', label: '案件名' },
    { value: 'deal_type', label: '案件区分' },
    { value: 'store_name', label: '店舗' },
    { value: 'contract_name', label: '契約名' },
    { value: 'contract_type', label: '契約区分' },
    { value: 'sales_amount_tax_included', label: '売上(税込)' },
    { value: 'sales_amount_tax_excluded', label: '売上(税抜)' },
    { value: 'cost_amount', label: '原価' },
    { value: 'gross_profit', label: '粗利額' },
    { value: 'gross_profit_rate', label: '粗利率' },
    { value: 'is_main_contract', label: '本契約フラグ' },
    { value: 'contract_date', label: '契約日' },
    { value: 'tax_rate', label: '消費税率' },
  ],
}

export default function ColumnMapper({ headers, mappings, targetTable, onMappingsChange }: Props) {
  const dbColumns = DB_COLUMNS[targetTable]

  const handleChange = (csvColumn: string, dbColumn: string) => {
    const newMappings = mappings.filter((m) => m.csvColumn !== csvColumn)
    if (dbColumn) {
      newMappings.push({ csvColumn, dbColumn })
    }
    onMappingsChange(newMappings)
  }

  const getMappedDb = (csvCol: string) => {
    return mappings.find((m) => m.csvColumn === csvCol)?.dbColumn || ''
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 mb-3">
        カラムマッピング（{mappings.length}項目マッピング済み）
      </h3>
      <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">CSVカラム</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">→</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">DBカラム</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {headers.map((h) => (
              <tr key={h} className={getMappedDb(h) ? 'bg-blue-50/50' : ''}>
                <td className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate" title={h}>
                  {h}
                </td>
                <td className="px-3 py-1.5 text-slate-400">→</td>
                <td className="px-3 py-1.5">
                  <select
                    value={getMappedDb(h)}
                    onChange={(e) => handleChange(h, e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {dbColumns.map((col) => (
                      <option key={col.value} value={col.value}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
