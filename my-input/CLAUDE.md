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

## YT Transcript Service（さくらVPS）

- **役割**: YouTube文字起こし取得（Edge Function `fetch-content` から呼び出し）
- **技術**: FastAPI + youtube-transcript-api（Python 3.11）
- **ホスト**: さくらVPS Windows Server `os3-291-35313.vs.sakura.ne.jp`（IP: `49.212.149.67`）
- **ポート**: 8000（ファイアウォール開放済み）
- **ソース（VPS上）**: `C:\yt-transcript-service\main.py`
- **自動起動**: タスクスケジューラ `YtTranscriptService`（onstart、Administrator）
- **Supabaseシークレット**:
  - `YT_TRANSCRIPT_SERVICE_URL` = `http://49.212.149.67:8000`
  - `YT_TRANSCRIPT_SERVICE_KEY` = `yt-transcript-vps-secret-2026`
- **エンドポイント**: `GET /health`, `POST /transcript`（Bearer認証）
- **処理フロー**: Edge Function → VPS `/transcript` → youtube-transcript-api → テキスト返却

## Filter System

- feedback フィルター値: `favorite`, `adopted`, `stocked`, `bimyou`, `rated`, `rating_1`〜`rating_5`
- フィルターパネルは SlidersHorizontal アイコンで開閉
