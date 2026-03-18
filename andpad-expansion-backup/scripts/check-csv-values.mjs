import fs from 'fs'
import Papa from 'papaparse'

const csv = fs.readFileSync('C:\\Users\\imoto\\Downloads\\ANDPAD全案件データ① - ANDPAD案件 (1).csv', 'utf-8')
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\ufeff/, '') })

const vals = {}
parsed.data.forEach(r => { const v = r['案件種別'] || 'null'; vals[v] = (vals[v] || 0) + 1 })
console.log('案件種別:', JSON.stringify(vals, null, 2))

const vals2 = {}
parsed.data.forEach(r => { const v = r['反響種別'] || 'null'; vals2[v] = (vals2[v] || 0) + 1 })
console.log('反響種別:', JSON.stringify(vals2, null, 2))

const vals3 = {}
parsed.data.forEach(r => { const v = r['工事種類'] || 'null'; vals3[v] = (vals3[v] || 0) + 1 })
console.log('工事種類:', JSON.stringify(vals3, null, 2))

const vals4 = {}
parsed.data.forEach(r => { const v = r['失注種別'] || 'null'; vals4[v] = (vals4[v] || 0) + 1 })
console.log('失注種別:', JSON.stringify(vals4, null, 2))
