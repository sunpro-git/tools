# sales-arsenal2 — 開発ガイド

## ビルドなし公開形式

このプロジェクトは **ビルド不要** で静的ファイルとして公開できます。

### 仕組み
`index.html` に `<script type="importmap">` を設定し、npm パッケージ名を esm.sh CDN の URL に対応させています。
ブラウザが直接ソースファイル (`src/main.js` → `src/App.js`) を読み込みます。

```
index.html (importmap) → src/main.js → src/App.js → src/views/*.js
```

### 公開方法
`index.html`・`assets/`・`src/` をそのままサーバーにアップロードするだけです。
**`npm run build` は不要です。絶対に実行しないでください。**

---

## ファイル構成

```
sales-arsenal2/
├── index.html          ← importmap + エントリポイント (直接編集OK)
├── assets/
│   └── styles.css      ← コンパイル済みTailwindCSS (安定名)
├── src/
│   ├── main.js         ← エントリ (App.jsをReactでマウント)
│   ├── App.js          ← メインアプリ (htm記法、JSX不使用)
│   ├── firebase.js     ← Firebase初期化
│   ├── index.css       ← Tailwindディレクティブ (ビルド用のみ)
│   ├── data.js         ← 初期データ (db.jsのseed処理で使用)
│   ├── services/
│   │   ├── auth.js     ← Firebase Auth
│   │   └── db.js       ← Firebase Firestore CRUD
│   └── views/
│       ├── AdminPanel.js  ← 武器管理 (htm記法)
│       └── StaffView.js   ← スタッフ管理 (htm記法)
└── CLAUDE.md           ← このファイル
```

---

## 重要なルール

### ✅ やって良いこと
- `src/` 以下の `.js` ファイルを直接編集する
- `index.html` の importmap バージョンを更新する
- `assets/styles.css` を再生成する（後述）

### ❌ やってはいけないこと
- **`npm run build` を実行しない** → `index.html` が上書きされて壊れます
- **`.jsx` ファイルを新規作成しない** → JSX はブラウザで動作しません
- **`build-entry.html` を復活させない**

---

## コーディング規則

### htm記法（JSXの代替）
このプロジェクトは JSX を使わず、**htm**（Tagged Template Literal）を使います。

```javascript
// ファイル先頭に必須
import { createElement, useState } from 'react';
import htm from 'htm';
const html = htm.bind(createElement);

// 使い方（JSXとの対比）
// JSX:  <Button onClick={fn} className="text-red-500">テキスト</Button>
// htm:  html`<${Button} onClick=${fn} className="text-red-500">テキスト</${Button}>`

// 条件分岐
// JSX:  {flag && <Comp />}
// htm:  ${flag && html`<${Comp} />`}

// リスト
// JSX:  {items.map(i => <li key={i.id}>{i.name}</li>)}
// htm:  ${items.map(i => html`<li key=${i.id}>${i.name}</li>`)}
```

### 動的クラス名
文字列結合で動的クラスを作ります（clsx/cnは不要）:
```javascript
className=${'base-class ' + (flag ? 'active-class' : 'inactive-class')}
```

---

## CSSを変更したい場合

Tailwindのクラスを新たに追加した場合、`assets/styles.css` の再生成が必要です。

```bash
# 1. 一時的にビルドして新しいCSSを取得
npm run build-css-only   # ← 未設定の場合は下記コマンドを使う

# または手動で:
npx tailwindcss -i ./src/index.css -o ./assets/styles.css --minify

# 2. dist/ が生成されていたら削除
rm -rf dist
```

> ⚠️ `npm run build` (vite build) は実行しないこと。`index.html` が上書きされます。

---

## 開発サーバー

ローカルで開発する場合は Vite の dev サーバーを使えます（importmap は使われず Vite が解決）:

```bash
npm run dev   # http://localhost:5173 で起動
```

---

## importmap のバージョン更新

`index.html` の `<script type="importmap">` 内のバージョンを変更するだけです:

```json
{
  "imports": {
    "react":              "https://esm.sh/react@18.3.1",
    "react-dom/client":   "https://esm.sh/react-dom@18.3.1/client",
    "htm":                "https://esm.sh/htm@3.1.1",
    "lucide-react":       "https://esm.sh/lucide-react@0.441.0",
    "firebase/app":       "https://esm.sh/firebase@11.4.0/app",
    "firebase/firestore": "https://esm.sh/firebase@11.4.0/firestore",
    "firebase/auth":      "https://esm.sh/firebase@11.4.0/auth",
    "firebase/analytics": "https://esm.sh/firebase@11.4.0/analytics",
    "firebase/storage":   "https://esm.sh/firebase@11.4.0/storage"
  }
}
```
