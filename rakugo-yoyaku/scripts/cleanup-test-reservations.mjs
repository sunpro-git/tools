// Backup all, delete test reservations, renumber remaining
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = initializeApp({
  apiKey: "AIzaSyCKLSWXiPgW4Z9HUGCLWZs-Zf6OcB8KDS0",
  projectId: "rakugo-yoyaku",
})
const db = getFirestore(app)

async function main() {
  // 1. 全件取得
  const snap = await getDocs(collection(db, 'reservations'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`全 ${all.length} 件取得`)

  // 2. バックアップ
  const backupDir = join(__dirname, '..', 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `reservations-${ts}.json`)
  const serializable = all.map(r => {
    const out = {}
    for (const [k, v] of Object.entries(r)) {
      if (v && typeof v === 'object' && typeof v.toDate === 'function') {
        out[k] = { __timestamp__: v.toDate().toISOString() }
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => {
          if (item && typeof item === 'object') {
            const clone = { ...item }
            for (const [ik, iv] of Object.entries(clone)) {
              if (iv && typeof iv === 'object' && typeof iv.toDate === 'function') {
                clone[ik] = { __timestamp__: iv.toDate().toISOString() }
              }
            }
            return clone
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

  // 3. テスト予約を特定
  const testPattern = /テスト|test/i
  const toDelete = all.filter(r => testPattern.test(r.name))
  const toKeep = all.filter(r => !testPattern.test(r.name))

  console.log(`\n削除対象 (${toDelete.length}件):`)
  toDelete.forEach(r => console.log(`  #${r.reservationNo} ${r.name}`))
  console.log(`\n残す予約 (${toKeep.length}件):`)
  toKeep.sort((a, b) => {
    const ta = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : 0
    const tb = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : 0
    return ta - tb
  })
  toKeep.forEach((r, i) => console.log(`  #${r.reservationNo} → #${String(i + 1).padStart(3, '0')} ${r.name}`))

  // 4. 削除実行
  console.log('\n5秒後に実行します... (Ctrl+Cで中止)')
  await new Promise(r => setTimeout(r, 5000))

  for (const r of toDelete) {
    await deleteDoc(doc(db, 'reservations', r.id))
    console.log(`削除: #${r.reservationNo} ${r.name}`)
  }

  // 5. リナンバー
  for (let i = 0; i < toKeep.length; i++) {
    const newNo = String(i + 1).padStart(3, '0')
    const r = toKeep[i]
    if (r.reservationNo !== newNo) {
      await updateDoc(doc(db, 'reservations', r.id), { reservationNo: newNo })
      console.log(`リナンバー: #${r.reservationNo} → #${newNo} ${r.name}`)
    }
  }

  console.log(`\n=== 完了: ${toDelete.length}件削除、${toKeep.length}件リナンバー ===`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
