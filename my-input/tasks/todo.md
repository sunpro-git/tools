# reform-online.jp記事表示のスタイル改善

## 完了日: 2026-03-09

## 変更内容

### 1. 見出しスタイルをreform-online.jp風に変更（ContentDetail.tsx）
- [x] h2: 緑 (`#1b9332`) + 左ボーダー4px
- [x] h3: 緑 + 左ボーダー3px
- [x] h4: 緑テキスト
- [x] 「全文アーカイブ」ヘッダーも緑スタイル

### 2. 画像表示の修正（ContentDetail.tsx）
- [x] 画像クリーンアップ正規表現の修正（`![Image N: alt](url)`が壊れていた問題）
- [x] 画像+キャプション対応（`_キャプション_` → `<figcaption>`）
- [x] サイトUI画像フィルタ（ロゴ・アイコン・バナー等を非表示）
- [x] 画像をフル幅表示に変更

### 3. 全文のゴミ除去（fetch-content Edge Function）
- [x] `cleanReformOnlineJinaContent()`関数を追加
- [x] ヘッダー（ロゴ、ナビ、ログイン情報）を除去
- [x] フッター（関連記事、サイドバー、セミナー等）を除去
- [x] デプロイ済み、既存記事を再処理済み

### 4. ビルド
- [x] `dist/` をクリーン後にビルド成功（exit code 0）
- [x] 緑色 `#1b9332`、`figcaption` がビルドに含まれることを確認

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `src/components/ContentDetail.tsx` | 編集（見出し色・画像表示改善） |
| `supabase/functions/fetch-content/index.ts` | 編集（コンテンツクリーンアップ追加） |

---

# リフォーム産業新聞（reform-online.jp）有料記事対応

## 完了日: 2026-03-09

- [x] fetch-content Edge FunctionにJina Reader + X-Set-Cookie方式を実装
- [x] Supabase Secret設定済み（REFORM_ONLINE_ENC_USER）
- [x] デプロイ・動作検証済み

---

# OGP共有機能 + 検索エンジンインデックス無効化

## 完了日: 2026-03-06

- [x] noindexメタタグ、robots.txt
- [x] OGP Edge Function
- [x] 共有ボタン
