# CLAUDE.md - Project Instructions

## Build

- Build command: `npm run build`
- After every production build, **必ず dist/ の中身を検証すること**:
  1. ファイル名が変わったか確認 (`ls dist/assets/`)
  2. 変更した機能のキーワードが含まれるか grep で確認
  3. exit code が 0 であることを確認（127 = コマンド未発見で失敗）
- 環境の問題で `vite` がPATHに見つからない場合がある。build スクリプトは `npx vite build` を使用している

## Dev Server

- `npm run dev` or preview_start (name: "dev", port: 5174)

## Tech Stack

- React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Supabase
- Icons: lucide-react

## Database

- Supabase PostgreSQL
- `contents` テーブルに `is_adopted` (boolean, default false) カラムが必要:
  ```sql
  ALTER TABLE contents ADD COLUMN is_adopted boolean NOT NULL DEFAULT false;
  ```

## Key Architecture

- `src/App.tsx` - メインコンポーネント（フィルター、ルーティング、状態管理）
- `src/lib/api.ts` - Supabase API 呼び出し
- `src/types/database.ts` - TypeScript 型定義
- `src/components/FeedbackButtons.tsx` - フィードバックボタン（採用した、お気に入り、もう微妙、ストック）
- `src/components/ContentCard.tsx` - カード表示
- `src/components/ContentDetail.tsx` - 詳細表示

## Filter System

- feedback フィルター値: `favorite`, `adopted`, `stocked`, `bimyou`, `rated`, `rating_1`〜`rating_5`
- フィルターパネルは SlidersHorizontal アイコンで開閉
