# ANDPAD CSV → Supabase カラムマッピング

ANDPADからエクスポートしたCSVデータと、Supabase上のテーブルカラムの対応表。

## deals テーブル（案件）

| Supabase カラム | 型 | ANDPAD CSV項目名 | 画面表示名 | 備考 |
|---|---|---|---|---|
| `andpad_id` | text | 案件ID | ANDPAD ID | UNIQUE制約。ANDPADリンク生成に使用: `https://andpad.jp/manager/my/orders/{andpad_id}` |
| `management_id` | text | 案件管理ID | - | |
| `inquiry_number` | text | 問合番号 | - | |
| `name` | text | 案件名 | 案件名 | NOT NULL |
| `deal_type` | text | 案件区分 | - | |
| `deal_category` | text | 事業部 | 事業部 | 「新築」「リフォーム」等。フィルタに使用 |
| `store_name` | text | 店舗 | 店舗 | 店舗グループ分類に使用（本社/松本, 長野, 上田, 伊那, その他） |
| `staff_name` | text | 担当者 | 担当者 | ANDPAD形式: `792287:上條　謙` → 表示時に番号除去 |
| `customer_name` | text | 顧客名 | お客様名 | |
| `source` | text | 反響元 | 反響元 | |
| `status` | text | ステータス | ステータス | 「未対応」「その他」等。CHECK制約は削除済み |
| `closing_probability` | text | 成約確度 | 成約確度 | 「B(競合あり/50％)」等。受注日ありの場合は画面上「受注済」と表示 |
| `estimate_amount` | bigint | 見積金額(税込) | 契約金額(予) | 受注金額がない場合のフォールバック表示 |
| `order_amount` | bigint | 受注金額(税込) | 契約金額(実) | |
| `inquiry_date` | date | 問い合わせ日 | - | |
| `meeting_date` | date | 商談日 | - | |
| `estimate_date` | date | 見積日 | - | |
| `order_date` | date | 受注日 | 契約日 | NULLなら受注予定、値ありなら受注済。今期判定に使用（9月始まり） |
| `order_date_planned` | text | 受注予定日 | 契約日(予) | order_dateがない場合のフォールバック表示 |
| `start_date` | date | 着工日 | - | |
| `completion_date` | date | 完工日 | - | |
| `lost_date` | date | 失注日 | - | |
| `handover_date_actual` | text | 引渡日実績 | 引渡日(実) | |
| `handover_date_planned` | text | 引渡日予定 | 引渡日(予) | handover_date_actualがない場合のフォールバック表示 |
| `contract_amount_ex_tax` | bigint | 契約金額(税抜) | - | |
| `category` | text | 工事種類 | - | |

### 受注管理画面での表示ロジック

- **受注済**: `order_date IS NOT NULL` かつ今期（9月〜翌8月）範囲内
- **受注予定**: `order_date IS NULL` の全案件
- **契約日**: `order_date`（実績）優先、なければ `order_date_planned`（予定）。末尾に「実」or「予」表示
- **引渡日**: `handover_date_actual`（実績）優先、なければ `handover_date_planned`（予定）。末尾に「実」or「予」表示
- **契約金額**: `order_amount` 優先、なければ `estimate_amount`
- **成約確度**: `order_date` ありなら「受注済」、なければ `closing_probability` の値

### deals テーブル その他カラム（CSVインポート対応済み・画面未使用）

| カラム | ANDPAD項目 |
|---|---|
| `deal_flow` | 案件フロー |
| `deal_workflow` | ワークフロー |
| `deal_creator` | 案件作成者 |
| `deal_created_at` | 案件作成日時 |
| `estimate_amount_ex_tax` | 見積金額(税抜) |
| `estimate_cost` | 見積原価 |
| `estimate_gross_profit` | 見積粗利額 |
| `estimate_gross_profit_rate` | 見積粗利率 |
| `construction_location` | 工事場所 |
| `construction_content` | 工事内容 |
| `receptionist` | 受付担当 |
| `desired_budget` | 希望予算 |
| `construction_trigger` | 工事きっかけ |
| `lost_reason` | 失注理由 |
| `lost_type` | 失注区分 |
| `role_sales` | 営業担当 |
| `role_design` | 設計担当 |
| `role_construction` | 工事担当 |
| `role_ic` | IC担当 |
| `role_construction_sub1` | 工事担当(副1) |
| `role_construction_sub2` | 工事担当(副2) |
| `role_other` | その他担当 |
| `role_sales_sub` | 営業担当(副) |
| `role_ex` | EX担当 |
| `label_area` | ラベル:エリア |
| `label_office` | ラベル:事業所 |
| `label_construction_type` | ラベル:工事種類 |
| `contract_amount_ex_tax` | 契約金額(税抜) |
| `contract_cost` | 契約原価 |
| `contract_reserve_cost` | 契約予備費 |
| `contract_gross_profit` | 契約粗利額 |
| `contract_gross_profit_rate` | 契約粗利率 |
| `budget_amount_inc_tax` | 実行予算(税込) |
| `budget_amount_ex_tax` | 実行予算(税抜) |
| `budget_cost` | 実行原価 |
| `budget_reserve_cost` | 実行予備費 |
| `budget_gross_profit` | 実行粗利額 |
| `budget_gross_profit_rate` | 実行粗利率 |
| `progress_amount_inc_tax` | 出来高(税込) |
| `progress_amount_ex_tax` | 出来高(税抜) |
| `progress_cost` | 出来高原価 |
| `progress_reserve_cost` | 出来高予備費 |
| `progress_gross_profit` | 出来高粗利額 |
| `progress_gross_profit_rate` | 出来高粗利率 |
| `settlement_amount_inc_tax` | 精算(税込) |
| `settlement_amount_ex_tax` | 精算(税抜) |
| `settlement_cost` | 精算原価 |
| `settlement_reserve_cost` | 精算予備費 |
| `settlement_gross_profit` | 精算粗利額 |
| `settlement_gross_profit_rate` | 精算粗利率 |
| `tax_rate` | 消費税率 |
| `payment_status` | 入金ステータス |
| `payment_contract_date` | 入金:契約日 |
| `payment_start_date` | 入金:着工日 |
| `payment_completion_date` | 入金:完工日 |
| `payment_handover_date` | 入金:引渡日 |
| `migration_saksak_customer` | 移行:SAKSAK顧客 |
| `migration_saksak_inquiry` | 移行:SAKSAK問合 |
| `migration_saksak_contract` | 移行:SAKSAK契約 |
| `migration_dandori_id` | 移行:ダンドリID |
| `migration_store` | 移行:店舗 |
| `migration_construction_type` | 移行:工事種類 |
| `migration_inquiry_type` | 移行:問合種類 |
| `migration_plan_contract` | 移行:プラン契約 |

## contracts テーブル（契約）

| Supabase カラム | ANDPAD CSV項目名 | 備考 |
|---|---|---|
| `andpad_id` | 案件ID | deals.andpad_idとの紐付け用 |
| `deal_management_id` | 案件管理ID | |
| `contract_number` | 契約番号 | |
| `inquiry_number` | 問合番号 | |
| `deal_name` | 案件名 | |
| `deal_type` | 案件区分 | |
| `store_name` | 店舗 | |
| `contract_name` | 契約名 | |
| `contract_type` | 契約区分 | |
| `sales_amount_tax_included` | 売上(税込) | |
| `sales_amount_tax_excluded` | 売上(税抜) | |
| `cost_amount` | 原価 | |
| `gross_profit` | 粗利額 | |
| `gross_profit_rate` | 粗利率 | |
| `is_main_contract` | 本契約フラグ | |
| `contract_date` | 契約日 | |
| `tax_rate` | 消費税率 | |

## events テーブル（イベント）※shoot-logと共有

| Supabase カラム | 用途 | 備考 |
|---|---|---|
| `name` | イベント名 | shoot-logと共有 |
| `event_url` | イベントURL | andpad-expansion用 |
| `event_type` | イベント種別 | andpad-expansion用 |
| `division` | 事業部 | text[] |
| `brand` | ブランド | |
| `area1` | エリア | |
| `store_name` | 開催店舗 | andpad-expansion用 |
| `dates` | 開催日 | date[] |
| `thumbnail_url` | サムネイル画像URL | andpad-expansion用 |
| `google_map_url` | GoogleMap URL | andpad-expansion用 |
| `note` | 備考 | andpad-expansion用 |
| `status` | ステータス | 'published' or NULL |

## event_visitors テーブル（来場者）

| Supabase カラム | 用途 |
|---|---|
| `event_id` | events.id への外部キー |
| `name` | 来場者名 |
| `name_kana` | フリガナ |
| `phone` | 電話番号 |
| `email` | メール |
| `postal_code` | 郵便番号 |
| `address` | 住所 |
| `customer_type` | 顧客種別（新規/既存） |
| `media_source` | 媒体 |
| `reservation_date` | 予約日 |
| `visit_date` | 来場日 |
| `has_next_appointment` | 次回アポ有無 |
| `next_appointment_date` | 次回アポ日 |
| `next_appointment_note` | 次回アポ備考 |
| `note` | 備考 |
