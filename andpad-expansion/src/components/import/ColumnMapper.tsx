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
    { value: 'andpad_id', label: '顧客ID' },
    { value: 'management_id', label: '顧客管理ID' },
    { value: 'customer_type', label: '種別' },
    { value: 'name', label: '顧客名' },
    { value: 'name_title', label: '顧客名 敬称' },
    { value: 'name_kana', label: '顧客名（カナ）' },
    { value: 'name2', label: '顧客名2' },
    { value: 'name2_title', label: '顧客名2 敬称' },
    { value: 'name2_kana', label: '顧客名2（カナ）' },
    { value: 'postal_code', label: '顧客郵便番号' },
    { value: 'prefecture', label: '顧客都道府県' },
    { value: 'address', label: '顧客現住所' },
    { value: 'latitude', label: '顧客緯度' },
    { value: 'longitude', label: '顧客経度' },
    { value: 'contact_name', label: '顧客担当者名' },
    { value: 'contact_name_kana', label: '顧客担当者名（カナ）' },
    { value: 'phone1', label: '顧客電話番号1' },
    { value: 'phone2', label: '顧客電話番号2' },
    { value: 'email', label: '顧客メールアドレス' },
    { value: 'fax', label: '顧客FAX' },
    { value: 'rank', label: '顧客ランク' },
    { value: 'classification', label: '顧客分類' },
    { value: 'gender', label: '性別' },
    { value: 'birth_date', label: '生年月日' },
    { value: 'staff_store', label: '担当者所属店舗' },
    { value: 'staff_name', label: '担当者' },
    { value: 'referrer', label: '紹介者' },
    { value: 'dm_allowed', label: 'DMの可否' },
    { value: 'notes', label: '顧客備考' },
    { value: 'custom_inquiry_notes', label: '顧客情報任意項目:引合備考' },
    { value: 'custom_email1', label: '顧客情報任意項目:メールアドレス1' },
    { value: 'custom_email2', label: '顧客情報任意項目:メールアドレス2' },
    { value: 'custom_age', label: '顧客情報任意項目:ご年齢' },
    { value: 'custom_occupation', label: '顧客情報任意項目:ご職業' },
    { value: 'custom_employer', label: '顧客情報任意項目:お勤め先' },
    { value: 'custom_years_employed', label: '顧客情報任意項目:勤続年数' },
    { value: 'custom_income', label: '顧客情報任意項目:年収（連名の場合は合算額）' },
    { value: 'custom_children_count', label: '顧客情報任意項目:子供の人数' },
    { value: 'custom_mig_registered_date', label: '顧客情報任意項目:[移行用]登録日' },
    { value: 'custom_mig_contact', label: '顧客情報任意項目:[移行用]連絡先' },
    { value: 'custom_mig_contact_tel', label: '顧客情報任意項目:[移行用]連絡先TEL' },
    { value: 'custom_mig_mobile_mail', label: '顧客情報任意項目:[移行用]携帯Mail' },
    { value: 'custom_mig_homepage', label: '顧客情報任意項目:[移行用]ホームページ' },
    { value: 'custom_mig_external_code', label: '顧客情報任意項目:[移行用]外部コード' },
    { value: 'custom_mig_age_group', label: '顧客情報任意項目:[移行用]年代' },
    { value: 'custom_mig_occupation', label: '顧客情報任意項目:[移行用]職業' },
    { value: 'custom_mig_classification', label: '顧客情報任意項目:[移行用]顧客分類' },
    { value: 'custom_mig_referrer_code', label: '顧客情報任意項目:[移行用]紹介者コード' },
    { value: 'custom_mig_building', label: '顧客情報任意項目:[移行用]建物' },
    { value: 'custom_mig_structure', label: '顧客情報任意項目:[移行用]構造' },
    { value: 'custom_mig_built_year', label: '顧客情報任意項目:[移行用]築年' },
    { value: 'custom_mig_dm_type', label: '顧客情報任意項目:[移行用]DM種類' },
    { value: 'custom_mig_how_known', label: '顧客情報任意項目:[移行用]サンプロを知ったきっかけ（テスト中）' },
    { value: 'custom_mig_inquiry_method', label: '顧客情報任意項目:[移行用]問合せ方法' },
    { value: 'custom_mig_visit_reason', label: '顧客情報任意項目:[移行用]来場のきっかけ' },
    { value: 'custom_mig_tel2', label: '顧客情報任意項目:[移行用]顧客TEL2' },
    { value: 'custom_deprecated_marker', label: '顧客情報任意項目:--これ以降は削除予定--' },
    { value: 'custom_handover_date', label: '顧客情報任意項目:[削除予定]新築引渡日(実績)' },
    { value: 'custom_mig_deprecated', label: '顧客情報任意項目:[移行用]削除予定' },
    { value: 'custom_corporate_referral', label: '顧客情報任意項目:法人紹介対象' },
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
    // 基本情報
    { value: 'andpad_id', label: 'システムID' },
    { value: 'management_id', label: '案件管理ID' },
    { value: 'inquiry_number', label: '問合番号' },
    { value: 'name', label: '案件名' },
    { value: 'customer_andpad_id', label: '顧客ID' },
    { value: 'customer_name', label: '顧客名' },
    { value: 'deal_category', label: '案件種別' },
    { value: 'deal_type', label: '案件区分' },
    { value: 'deal_flow', label: '案件フロー' },
    { value: 'deal_workflow', label: '案件ワークフロー' },
    { value: 'deal_creator', label: '案件作成者' },
    { value: 'deal_created_at', label: '案件作成日時' },
    { value: 'contract_number', label: '契約番号' },
    { value: 'main_contract_number', label: '本契約番号' },
    { value: 'status', label: '引合状況' },
    { value: 'closing_probability', label: '成約確度' },
    // 店舗・担当
    { value: 'store_name', label: '主担当店舗' },
    { value: 'staff_name', label: '主担当' },
    { value: 'role_sales', label: '役割:営業' },
    { value: 'role_design', label: '役割:設計' },
    { value: 'role_construction', label: '役割:工事' },
    { value: 'role_ic', label: '役割:インテリアコーディネーター' },
    { value: 'role_construction_sub1', label: '役割:施工管理補助①' },
    { value: 'role_construction_sub2', label: '役割:施工管理補助②' },
    { value: 'role_other', label: '役割:その他' },
    { value: 'role_sales_sub', label: '役割:営業補助' },
    { value: 'role_ex', label: '役割:EX事業部' },
    // 反響・営業
    { value: 'response_type', label: '反響種別' },
    { value: 'source', label: '反響元' },
    { value: 'inquiry_date', label: '反響日' },
    { value: 'receptionist', label: '受付者' },
    { value: 'desired_budget', label: '希望工事予算' },
    { value: 'construction_trigger', label: '施工きっかけ' },
    // 売上見込
    { value: 'estimate_amount', label: '売上見込 売上(税込)' },
    { value: 'estimate_amount_ex_tax', label: '売上見込 売上(税抜)' },
    { value: 'estimate_cost', label: '売上見込 原価' },
    { value: 'estimate_gross_profit', label: '売上見込 粗利額' },
    { value: 'estimate_gross_profit_rate', label: '売上見込 粗利率' },
    // 工事
    { value: 'construction_location', label: '工事場所' },
    { value: 'category', label: '工事種類' },
    { value: 'construction_content', label: '工事内容' },
    // 失注
    { value: 'lost_type', label: '失注種別' },
    { value: 'lost_date', label: '失注日' },
    { value: 'lost_reason', label: '失注理由' },
    // 日程
    { value: 'meeting_date_planned', label: '初回面談日(予定)' },
    { value: 'meeting_date', label: '初回面談日(実績)' },
    { value: 'visit_date_planned', label: '初回訪問日(予定)' },
    { value: 'visit_date_actual', label: '初回訪問日(実績)' },
    { value: 'survey_date_planned', label: '現調日(予定)' },
    { value: 'survey_date_actual', label: '現調日(実績)' },
    { value: 'plan_submit_date_planned', label: '初回プラン提出(予定)' },
    { value: 'plan_submit_date_actual', label: '初回プラン提出(実績)' },
    { value: 'seismic_date_planned', label: '耐震申込日(予定)' },
    { value: 'seismic_date_actual', label: '耐震申込日(実績)' },
    { value: 'design_date_planned', label: '設計申込日(予定)' },
    { value: 'design_date_actual', label: '設計申込日(実績)' },
    { value: 'order_date_planned', label: '契約日(予定)' },
    { value: 'order_date', label: '契約日(実績)' },
    { value: 'start_date_planned', label: '着工日(予定)' },
    { value: 'start_date', label: '着工日(実績)' },
    { value: 'topping_date_planned', label: '上棟日(予定)' },
    { value: 'topping_date_actual', label: '上棟日(実績)' },
    { value: 'completion_date_planned', label: '完成日(予定)' },
    { value: 'completion_date', label: '完成日(実績)' },
    { value: 'handover_date_planned', label: '引渡日(予定)' },
    { value: 'handover_date_actual', label: '引渡日(実績)' },
    // ラベル
    { value: 'label_area', label: 'ラベル:施工エリア' },
    { value: 'label_office', label: 'ラベル:営業所' },
    { value: 'label_construction_type', label: 'ラベル:工事分類' },
    // 移行用
    { value: 'migration_saksak_customer', label: '移行用:SAKSAK顧客コード' },
    { value: 'migration_saksak_inquiry', label: '移行用:SAKSAK問合番号' },
    { value: 'migration_saksak_contract', label: '移行用:SAKSAK契約番号' },
    { value: 'migration_dandori_id', label: '移行用:ダンドリワーク現場ID' },
    { value: 'migration_store', label: '移行用:店舗名' },
    { value: 'migration_construction_type', label: '移行用:工事分類' },
    { value: 'migration_inquiry_type', label: '移行用:問合項目ー工事種類' },
    { value: 'migration_plan_contract', label: '移行用:プラン契約番号' },
    // 入金
    { value: 'payment_status', label: '入金:状態' },
    { value: 'payment_contract_date', label: '入金:契約日' },
    { value: 'payment_start_date', label: '入金:着工日' },
    { value: 'payment_completion_date', label: '入金:完成日' },
    { value: 'payment_handover_date', label: '入金:引渡日' },
    // 契約時
    { value: 'order_amount', label: '契約時:売上金額（税込）' },
    { value: 'contract_amount_ex_tax', label: '契約時:売上金額（税抜）' },
    { value: 'contract_cost', label: '契約時:原価' },
    { value: 'contract_reserve_cost', label: '契約時:予備原価' },
    { value: 'contract_gross_profit', label: '契約時:粗利' },
    { value: 'contract_gross_profit_rate', label: '契約時:粗利率' },
    // 実行予算確定時
    { value: 'budget_amount_inc_tax', label: '実行予算確定時:売上金額（税込）' },
    { value: 'budget_amount_ex_tax', label: '実行予算確定時:売上金額（税抜）' },
    { value: 'budget_cost', label: '実行予算確定時:原価' },
    { value: 'budget_reserve_cost', label: '実行予算確定時:予備原価' },
    { value: 'budget_gross_profit', label: '実行予算確定時:粗利' },
    { value: 'budget_gross_profit_rate', label: '実行予算確定時:粗利率' },
    // 進行中
    { value: 'progress_amount_inc_tax', label: '進行中:売上金額（税込）' },
    { value: 'progress_amount_ex_tax', label: '進行中:売上金額（税抜）' },
    { value: 'progress_cost', label: '進行中:原価' },
    { value: 'progress_reserve_cost', label: '進行中:予備原価' },
    { value: 'progress_gross_profit', label: '進行中 粗利額' },
    { value: 'progress_gross_profit_rate', label: '進行中 粗利率' },
    // 精算完了時
    { value: 'settlement_amount_inc_tax', label: '精算完了時:売上金額（税込）' },
    { value: 'settlement_amount_ex_tax', label: '精算完了時:売上金額（税抜）' },
    { value: 'settlement_cost', label: '精算完了時:原価' },
    { value: 'settlement_reserve_cost', label: '精算完了時:予備原価' },
    { value: 'settlement_gross_profit', label: '精算完了時:粗利' },
    { value: 'settlement_gross_profit_rate', label: '精算完了時:粗利率' },
    // 税率
    { value: 'tax_rate', label: '税率' },
    // その他
    { value: 'notes', label: '備考' },
  ],
  contracts: [
    { value: '', label: '-- スキップ --' },
    { value: 'andpad_id', label: 'システムID' },
    { value: 'deal_management_id', label: '案件管理ID' },
    { value: 'contract_number', label: '契約番号' },
    { value: 'inquiry_number', label: '問合番号' },
    { value: 'deal_name', label: '案件名' },
    { value: 'deal_type', label: '案件_案件区分' },
    { value: 'store_code', label: '主担当店舗コード' },
    { value: 'store_name', label: '主担当店舗' },
    { value: 'contract_name', label: '契約名' },
    { value: 'contract_type', label: '契約_案件区分' },
    { value: 'estimate_id', label: '対象見積ID' },
    { value: 'sales_amount_tax_included', label: '売上金額（税込）' },
    { value: 'sales_amount_tax_excluded', label: '売上金額（税抜）' },
    { value: 'cost_amount', label: '原価' },
    { value: 'reserve_cost', label: '予備原価' },
    { value: 'gross_profit', label: '粗利額' },
    { value: 'gross_profit_rate', label: '粗利率' },
    { value: 'is_main_contract', label: '本契約フラグ' },
    { value: 'contract_date', label: '契約日' },
    { value: 'tax_rate', label: '消費税' },
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
        <table className="w-full text-xs">
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
