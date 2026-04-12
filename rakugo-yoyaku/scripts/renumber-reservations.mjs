// Renumber all reservations from #001, sorted by createdAt ascending
// Usage: node scripts/renumber-reservations.mjs

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
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

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function main() {
  console.log('全予約を取得中...')
  const snap = await getDocs(collection(db, 'reservations'))
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  console.log(`全 ${all.length} 件取得`)

  // createdAt昇順でソート
  all.sort((a, b) => {
    const ta = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : 0
    const tb = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : 0
    return ta - tb
  })

  // バックアップ保存
  const backupDir = join(__dirname, '..', 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `reservations-before-renumber-${ts}.json`)
  const serializable = all.map((r) => ({
    id: r.id,
    reservationNo: r.reservationNo,
    name: r.name,
    createdAt: r.createdAt && typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate().toISOString() : null,
  }))
  writeFileSync(backupPath, JSON.stringify(serializable, null, 2), 'utf-8')
  console.log(`バックアップ保存: ${backupPath}`)

  console.log('\nリナンバー計画:')
  const plan = all.map((r, i) => {
    const newNo = String(i + 1).padStart(3, '0')
    return { id: r.id, oldNo: r.reservationNo, newNo, name: r.name }
  })
  plan.forEach((p) => {
    console.log(`  #${p.oldNo} → #${p.newNo}  ${p.name || '(名前なし)'}`)
  })

  console.log('\n5秒後にリナンバーを実行します... (Ctrl+Cで中止)')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  let updated = 0
  for (const p of plan) {
    if (p.oldNo === p.newNo) {
      console.log(`スキップ: #${p.oldNo} (変更なし)`)
      continue
    }
    try {
      await updateDoc(doc(db, 'reservations', p.id), { reservationNo: p.newNo })
      updated++
      console.log(`更新完了: #${p.oldNo} → #${p.newNo} ${p.name}`)
    } catch (e) {
      console.error(`更新失敗: #${p.oldNo} → #${p.newNo} - ${e.message}`)
    }
  }

  console.log(`\n=== 完了: ${updated}/${plan.length} 件更新 ===`)
  process.exit(0)
}

main().catch((e) => {
  console.error('エラー:', e)
  process.exit(1)
})
