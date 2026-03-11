# Googleカレンダー同期 (GAS)

## 概要
物件の保存時・一括同期時に、Google Apps Script (GAS) を経由してGoogleカレンダーにイベントを登録する。

## GAS エンドポイント
```
https://script.google.com/macros/s/AKfycbyXRTqL-iRZI8jZnp4MnbZ8nqBjXr-4YuuQfQPGH7EBGRAv-Dewi-XMO5vxYvVnUV2W/exec
```
- 設定場所: `src/config.js` の `CALENDAR_GAS_API_URL`

## 呼び出し方法
- HTTP `POST`
- Body: `JSON.stringify(events)` — イベント配列をJSON文字列で送信
- レスポンス: `{ success: boolean, errors?: string[], message?: string }`

## 呼び出し箇所 (`src/App.jsx`)

### 1. autoSyncCalendar (自動同期)
- **トリガー**: 物件保存時 (`handleSaveProperty` 完了後) / スケジュールクリア時
- **対象**: 保存した1物件のイベントのみ
- **コード位置**: `autoSyncCalendar` 関数

### 2. handleSyncCalendar (一括同期)
- **トリガー**: ツールバーのカレンダーアイコンをクリック
- **対象**: 現在フィルタリングされた全物件のイベント
- **コード位置**: `handleSyncCalendar` 関数

## イベント生成ロジック (`generatePropertyEvents`)

物件データから以下のイベントを生成する:

| イベント種別 | タイトル形式 | 条件 |
|---|---|---|
| 設営 | `【設営】{顧客名} {種別}` | `setupDate` がある場合 |
| 撤収 | `【撤収】{顧客名} {種別}` | `teardownDate` がある場合 |
| 見学会 | `【見学会】{顧客名} {種別}` | `openHouseDates` がある場合（複数日対応） |
| YouTube | `【YouTube】{顧客名} {種別}` | `youtubeDate` がある場合 |
| 撮影 | `【撮影】{顧客名} {種別}` | `photoDate` がある場合 |
| InstaLive | `【InstaLive】{顧客名} {種別}` | `instaLiveDate` がある場合 |

### 各イベントの構造
```javascript
{
  id: "物件UUID",                // Supabase properties.id
  title: "【設営】山田太郎 新築",
  startTime: Date,               // Date オブジェクト
  endTime: Date,                 // Date オブジェクト
  location: "住所 or GoogleMapURL",
  description: "【シューログ 現場撮影管理より登録】\n\n担当: ...\n種別: ...\n住所: ...",
  category: "新築" | "リフォーム",
  guests: "email1,email2,...",   // カンマ区切りのメールアドレス
  eventType: "ohirome" | "satsuei" | "ohirome_nashi" | "satsuei_nashi",
  vehicleEmail: "車両カレンダーEmail (設営/撤収のみ)",
  vehicleName: "車両名 (設営/撤収のみ)"
}
```

### eventType の決定ロジック
- `furnitureSetup === 'あり'` && 見学会あり → `ohirome`
- `furnitureSetup === 'あり'` && 見学会なし → `satsuei`
- `furnitureSetup !== 'あり'` && 見学会あり → `ohirome_nashi`
- `furnitureSetup !== 'あり'` && 見学会なし → `satsuei_nashi`

### ゲスト (guests) の構成
1. **基本ゲスト**: 物件に紐づくスタッフ（YouTube/撮影/InstaLive/通知担当/依頼者）のメールアドレス
2. **車両カレンダー**: 設営/撤収イベントに車両が指定されていればそのメール
3. **設営・撤収カレンダー**: equipments テーブルの `name='設営・撤収カレンダー', type='カレンダー'` のメール
4. **イベントカレンダー**: 見学会に `イベントカレンダー` のメールを追加
5. **事業部カレンダー**: 新築 → `新築イベントカレンダー`、リフォーム → `リフォームイベントカレンダー`

### 時間計算 (`calculateTimeRange`)
- 日時指定あり: その時間を使用
- 開始時間のみ: 開始から2時間
- 時間指定なし: 09:00〜11:00
- 見学会(allDay=true): 10:00〜17:00

## GAS側の処理
- GASソースコード: `docs/gas-calendar-sync.js`
- イベント識別: description 内の `ID: {id}` 文字列 + タイトルの種別タグ（`【設営】`等）で既存イベント検索
- 該当イベントがあれば更新、なければ新規作成
- ゲストをカレンダーイベントに招待
- ロケーション設定

### 削除処理（実装済み）
アプリ側は2種類のアクションを送信する:
- `action: 'delete'` — description 末尾の `ID: {id}` が完全一致するイベントを削除（見学会個別日程の削除用）
- `action: 'deleteAll'` — description 内に `ID: {id}` を含む全イベントを削除（スケジュール全クリア用）

`deleteAll` は前方一致で `ID: abc123` → `ID: abc123_oh_2026-03-01` も削除対象になる。

### 見学会の複数日程対応
- 見学会イベントのIDは `{物件UUID}_oh_{日付}` 形式（例: `abc123_oh_2026-03-01`）
- 旧形式は `{物件UUID}` のみだったため、移行時に旧IDのイベントが残る場合がある
- GAS側は description 内の ID 文字列で検索するため、新旧どちらの形式でも対応可能

## 将来の移行について
カレンダー同期をGASからSupabase Edge Functionに移行する場合:
- Google Calendar API v3 を使用
- サービスアカウントのJWT認証（andpad-syncと同じ方式）
- `GOOGLE_CALENDAR_ID` をSupabase Secretsに追加
- カレンダーをサービスアカウントに編集権限で共有
- Edge Function `calendar-sync` を作成してデプロイ
- `src/App.jsx` の fetch呼び出しを `supabase.functions.invoke` に変更
- `src/config.js` から `CALENDAR_GAS_API_URL` を削除
