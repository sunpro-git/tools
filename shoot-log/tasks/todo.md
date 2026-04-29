# イベント・撮影情報を顧客に紐づける改修

## 目的
イベント／撮影情報を「案件 (deals.id / propertyId)」ではなく **「顧客 (customer_andpad_id)」** に紐づけるよう変更する。

## 現状把握
- `events` テーブル1つに全て格納。`customerName` は文字列、`propertyId` は ANDPAD `deals.id` を保持。
- ANDPAD `deals` には `customer_andpad_id` と `customer_name` がある。
- `customers` テーブルは既に存在し、`customer_andpad_id` でクエリ可能（住所取得に使用中）。
- 編集モーダルでは「案件 (deal) を選ぶ」→ `customerName` `name` `salesRep` などを一括コピーする方式。
- カレンダー連携では `customerName` をタイトル表示のみに使用（重複判定キーには未使用）。

## 設計方針

### スキーマ変更
- [ ] `events` テーブルに `customerAndpadId` カラム追加（text、nullable）
- [ ] `propertyId` は **保持**（過渡期の互換性／案件参照用、ただし任意）
- [ ] マイグレーションSQL: 既存行の `propertyId` から `deals.customer_andpad_id` を引いて `customerAndpadId` を埋め戻す

### 編集モーダル UI
- [ ] 「案件を選ぶ」を「**顧客を選ぶ**」に変更
- [ ] 顧客一覧は `customers` テーブル + ANDPAD `deals` の `customer_name` 一覧から構築
- [ ] 顧客選択後、その顧客の **案件リスト** を任意で表示（必要な人だけ案件も紐づけ）
- [ ] 顧客選択時に prefill：`customerName` `customerLat/Lon` `address` `mainStore` `googleMapUrl`
- [ ] 案件選択時（任意）に prefill：`name` `salesRep` `icRep` `constructionRep` `systemId` `handoverDate` 等
- [ ] 「顧客なし」のフリーテキストイベントは引き続き許容

### 一覧表示
- [ ] グルーピング軸を **顧客名** に変更（同一顧客の複数案件のイベント／撮影が1グループにまとまる）
- [ ] 既存の「設営日未定」など日付ベースのグループは維持しつつ、その中で顧客単位にまとめる
- [ ] 行表示は現状通り（顧客名・案件名・住所・担当者）

### カレンダー連携
- [ ] タイトル生成 `makeTitle` は `customerName` 優先のまま動作（変更なし）
- [ ] 重複判定ロジックがあるか再確認（前ターンの「物件編集でカレンダーが増える」修正に関連）

### Chatwork 通知
- [ ] `{案件名}` プレースホルダの仕様確認：顧客名のままか、追加で `{顧客名}` プレースホルダを用意するか

## マイグレーション戦略
- [ ] DDL: `ALTER TABLE events ADD COLUMN customer_andpad_id text`
- [ ] バックフィル: `UPDATE events SET customer_andpad_id = (SELECT customer_andpad_id FROM deals WHERE deals.id = events.property_id)` （propertyId が空のものは customerName のみ残る）
- [ ] 過去データ検証スクリプト（dry-run）

## 確認事項（実装前にユーザー回答必須）

1. **顧客マスタのソース**：ANDPAD `customers` テーブルを「正」とするか、shoot-log 独自に顧客マスタを別途持つか？
   - 推奨: ANDPAD `customers` を正とする（重複管理しない）。ただし「ANDPAD未登録の顧客」が存在する場合は別フィールドで対応。
2. **案件選択の必須性**：顧客選択後、案件選択は **任意**でよいか（=顧客のみで保存可能）、それとも必須か？
   - 推奨: 任意。
3. **既存データの扱い**：`propertyId` が入っている既存行を自動マイグレーションしてよいか？
   - 推奨: 自動マイグレーション（`UPDATE` SQL を migration として追加）。
4. **「案件名」表示**：一覧の2行目（案件名）は引き続き表示するか、それとも「複数案件あり」のようにまとめるか？
   - 推奨: 1イベント＝1案件 or 案件未紐付けが基本なので、引き続き案件名を表示（紐付けなし時は空）。
5. **Chatwork 通知**：`{案件名}` プレースホルダの仕様：
   - A) 現状維持：customerName が優先表示なので実質「顧客名」となるが名称はそのまま
   - B) `{顧客名}` `{案件名}` を分離して両方使えるようにする
   - 推奨: B（テンプレートの自由度が上がる）
6. **案件複数紐付け**：1イベントに複数案件を紐づけるケースはあり得るか？（例：合同イベントで A様邸 と B様邸 が同時撮影）
   - 推奨: 「顧客主体」に変えるなら「顧客1人＝1イベント」が基本。複数顧客は別イベント扱い。

## 実装手順（承認後）
1. マイグレーション SQL 作成・実行（Supabase）
2. 編集モーダル：顧客選択 UI 実装
3. prefill ロジック書き換え（`selectPropertyForEvent` → `selectCustomerForEvent` ＋ 任意の `selectDealForEvent`）
4. 一覧表示：顧客単位グルーピング
5. Chatwork テンプレート：プレースホルダ追加（決定後）
6. 動作確認・ビルド・コミット・プッシュ

## レビューセクション（実装後記入）
（未着手）
