// Backup all reservations to JSON, then delete those with reservationNo <= 024
// Usage: node scripts/backup-and-delete-reservations.mjs

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const firebaseConfig = {
  apiKey: "AIzaSyCKLSWXiPgW4Z9HUGCLWZs-Zf6OcB8KDS0",
  authDomain: "rakugo-yoyaku.firebaseapp.com",
  projectId: "rakugo-yoyaku",
  storageBucket: "rakugo-yoyaku.firebasestorage.app",
  messagingSenderId: "754057479855",
  appId: "1:754057479855:web:17b7f0e5f80e7424c0365a",
}

const CUTOFF = 24 // この番号以下を削除

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function main() {
  console.log('全予約を取得中...')
  const snap = await getDocs(collection(db, 'reservations'))
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  console.log(`全 ${all.length} 件取得`)

  // バックアップ保存
  const backupDir = join(__dirname, '..', 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `reservations-${ts}.json`)
  // Firestore Timestampをシリアライズ可能な形式に変換
  const serializable = all.map((r) => {
    const out = {}
    for (const [k, v] of Object.entries(r)) {
      if (v && typeof v === 'object' && typeof v.toDate === 'function') {
        out[k] = { __timestamp__: v.toDate().toISOString() }
      } else if (Array.isArray(v)) {
        out[k] = v.map((item) => {
          if (item && typeof item === 'object' && item.createdAt && typeof item.createdAt.toDate === 'function') {
            return { ...item, createdAt: { __timestamp__: item.createdAt.toDate().toISOString() } }
          }
          if (item && typeof item === 'object' && item.changedAt && typeof item.changedAt.toDate === 'function') {
            return { ...item, changedAt: { __timestamp__: item.changedAt.toDate().toISOString() } }
          }
          return item
        })
      } else {
        out[k] = v
      }
    }
    return out
  })
  writeFileSync(backupPath, JSON.stringify(serializable, null, 2), 'utf-8')
  console.log(`バックアップ保存: ${backupPath}`)

  // 削除対象を抽出
  const targets = all.filter((r) => {
    if (!r.reservationNo) return false
    if (!/^\d+$/.test(r.reservationNo)) return false
    const num = parseInt(r.reservationNo, 10)
    return num <= CUTOFF
  })

  console.log(`\n削除対象: ${targets.length} 件`)
  targets.forEach((r) => {
    console.log(`  #${r.reservationNo} ${r.name || '(名前なし)'}`)
  })

  if (targets.length === 0) {
    console.log('削除対象なし。終了します。')
    process.exit(0)
  }

  console.log('\n5秒後に削除を実行します... (Ctrl+Cで中止)')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  let deleted = 0
  for (const r of targets) {
    try {
      await deleteDoc(doc(db, 'reservations', r.id))
      deleted++
      console.log(`削除完了: #${r.reservationNo} ${r.name}`)
    } catch (e) {
      console.error(`削除失敗: #${r.reservationNo} - ${e.message}`)
    }
  }

  console.log(`\n=== 完了: ${deleted}/${targets.length} 件削除 ===`)
  process.exit(0)
}

main().catch((e) => {
  console.error('エラー:', e)
  process.exit(1)
})
