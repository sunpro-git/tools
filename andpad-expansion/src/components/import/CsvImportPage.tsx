import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { parseFile, autoDetectMappings, applyMappings } from '../../lib/csv-parser'
import type { TargetTable, ColumnMapping } from '../../types/csv'
import { TABLE_LABELS } from '../../types/csv'
import { isCompanyManaged, getAreaFromAddress } from '../../lib/store-group'
import CsvUploader from './CsvUploader'
import ColumnMapper from './ColumnMapper'
import ImportHistory from './ImportHistory'
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, CloudDownload } from 'lucide-react'

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

export default function CsvImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [targetTable, setTargetTable] = useState<TargetTable>('deals')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [result, setResult] = useState<{ success: number; errors: string[]; customerCount?: number } | null>(null)
  const [cloudImporting, setCloudImporting] = useState(false)
  const [cloudStatus, setCloudStatus] = useState('')
  const [cloudResult, setCloudResult] = useState<{ message: string; results?: { fileName: string; success: number; customerCount: number; errorCount: number; errors: string[] }[] } | null>(null)

  const edgeFetch = useCallback(async (action: string, extra?: Record<string, string>) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-from-drive`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...extra }),
      },
    )
    return res
  }, [])

  const handleCloudImport = useCallback(async () => {
    setCloudImporting(true)
    setCloudResult(null)
    setCloudStatus('ファイル一覧を取得中...')
    try {
      // 1. ファイル一覧取得
      const listRes = await edgeFetch('list')
      const listData = await listRes.json()
      const files: { id: string; name: string }[] = listData.files || []
      if (files.length === 0) {
        setCloudResult({ message: 'Google Driveにxlsxファイルがありません' })
        return
      }

      const allResults: { fileName: string; success: number; customerCount: number; errorCount: number; errors: string[] }[] = []

      for (const file of files) {
        // 2. ファイルダウンロード
        setCloudStatus(`ダウンロード中: ${file.name}`)
        const dlRes = await edgeFetch('download', { fileId: file.id })
        const buffer = await dlRes.arrayBuffer()

        // 3. ブラウザ側でパース（既存ロジック）
        setCloudStatus(`パース中: ${file.name}`)
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const fileObj = new File([blob], file.name, { type: blob.type })
        const { headers: h, rows: r } = await parseFile(fileObj)
        const autoMappings = autoDetectMappings(h, 'deals')
        const mapped = applyMappings(r, autoMappings)

        // 4. 顧客データupsert
        setCloudStatus(`インポート中: ${file.name}`)
        const errors: string[] = []
        let customerCount = 0

        const customerRows: Record<string, Record<string, unknown>> = {}
        for (const row of r) {
          const custId = row['顧客ID']?.trim()
          const custName = row['顧客名']?.trim()
          if (!custId || !custName) continue
          if (customerRows[custId]) continue
          const custRow: Record<string, unknown> = {}
          for (const [csvCol, dbCol] of Object.entries(DEALS_CUSTOMER_COLUMN_MAP)) {
            const val = row[csvCol]?.trim() || null
            if (val) custRow[dbCol] = val
          }
          if (custRow.andpad_id && custRow.name) customerRows[custId] = custRow
        }
        const custArray = Object.values(customerRows)
        for (let i = 0; i < custArray.length; i += 100) {
          const chunk = custArray.slice(i, i + 100)
          const { error, data } = await supabase.from('customers').upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
          if (error) {
            for (const cRow of chunk) {
              const { error: cErr } = await supabase.from('customers').upsert([cRow], { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
              if (cErr) errors.push(`顧客 ${cRow.andpad_id} (${cRow.name || ''}): ${cErr.message}`)
              else customerCount += 1
            }
          } else {
            customerCount += data?.length || 0
          }
        }

        // 5. 会社管理スタッフの店舗振り分け
        const custAddrMap: Record<string, string> = {}
        for (const row of r) {
          const custId = row['顧客ID']?.trim()
          const addr = row['顧客現住所']?.trim()
          if (custId && addr) custAddrMap[custId] = addr
        }
        for (const row of mapped) {
          const staffName = row.staff_name as string | null
          if (isCompanyManaged('', staffName)) {
            const custId = row.customer_andpad_id as string | null
            const addr = custId ? custAddrMap[custId] : null
            const area = getAreaFromAddress(addr)
            if (area) row.store_name = `${area}　会社管理`
          }
        }

        // 6. インポートレコード作成
        const { data: importRecord } = await supabase
          .from('csv_imports')
          .insert({ file_name: `[自動] ${file.name}`, table_name: 'deals', status: 'processing' })
          .select().single()

        // 7. バッチupsert
        const rowsWithImportId = mapped.map((row) => ({ ...row, csv_import_id: importRecord?.id }))
        let successCount = 0
        const dbToLabel: Record<string, string> = {}
        for (const m of autoMappings) dbToLabel[m.dbColumn] = m.csvColumn

        for (let i = 0; i < rowsWithImportId.length; i += 100) {
          setCloudStatus(`インポート中: ${file.name} (${Math.min(i + 100, rowsWithImportId.length)}/${rowsWithImportId.length})`)
          const chunk = rowsWithImportId.slice(i, i + 100)
          const { error, data } = await supabase.from('deals').upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
          if (error) {
            for (let j = 0; j < chunk.length; j++) {
              const row = chunk[j]
              const rowNum = i + j + 2
              const { error: rowError } = await supabase.from('deals').upsert([row], { onConflict: 'andpad_id', ignoreDuplicates: false }).select()
              if (rowError) {
                const valMatch = rowError.message.match(/invalid input.*?:\s*"(.+?)"/)
                const badValue = valMatch ? valMatch[1] : null
                let colInfo = ''
                if (badValue) {
                  const found = Object.entries(row).find(([, v]) => String(v) === badValue)
                  if (found) colInfo = ` [項目: ${dbToLabel[found[0]] || found[0]}, 値: "${badValue}"]`
                }
                const id = (row.andpad_id || row.name || '') as string
                errors.push(`行${rowNum} (${id})${colInfo}: ${rowError.message}`)
              } else {
                successCount += 1
              }
            }
          } else {
            successCount += data?.length || 0
          }
        }

        // 8. インポートレコード更新
        if (importRecord) {
          await supabase.from('csv_imports').update({
            status: errors.length > 0 ? 'error' : 'completed',
            row_count: successCount, error_count: errors.length,
            error_message: errors.join('; ') || null,
          }).eq('id', importRecord.id)
        }

        // 9. Driveから削除
        setCloudStatus(`削除中: ${file.name}`)
        await edgeFetch('delete', { fileId: file.id })

        allResults.push({ fileName: file.name, success: successCount, customerCount, errorCount: errors.length, errors: errors.slice(0, 10) })
      }

      setCloudResult({ message: `${allResults.length}ファイルを処理しました`, results: allResults })
    } catch (e) {
      setCloudResult({ message: e instanceof Error ? e.message : '通信エラー' })
    } finally {
      setCloudImporting(false)
      setCloudStatus('')
    }
  }, [edgeFetch])

  const handleFileSelect = useCallback(async (file: File, table: TargetTable) => {
    setTargetTable(table)
    setFileName(file.name)

    const { headers: h, rows: r } = await parseFile(file)
    setHeaders(h)
    setRows(r)

    const autoMappings = autoDetectMappings(h, table)
    setMappings(autoMappings)
    setStep('mapping')
  }, [])

  // 案件XLSXの顧客カラム → customersテーブルカラムのマッピング
  const DEALS_CUSTOMER_COLUMN_MAP: Record<string, string> = {
    '顧客ID': 'andpad_id',
    '顧客管理ID': 'management_id',
    '種別': 'customer_type',
    '顧客名': 'name',
    '顧客名 敬称': 'name_title',
    '顧客名（カナ）': 'name_kana',
    '顧客名2': 'name2',
    '顧客名2 敬称': 'name2_title',
    '顧客名2（カナ）': 'name2_kana',
    '顧客郵便番号': 'postal_code',
    '顧客都道府県': 'prefecture',
    '顧客現住所': 'address',
    '顧客緯度': 'latitude',
    '顧客経度': 'longitude',
    '顧客担当者名': 'contact_name',
    '顧客担当者名（カナ）': 'contact_name_kana',
    '顧客電話番号1': 'phone1',
    '顧客電話番号2': 'phone2',
    '顧客メールアドレス': 'email',
    '顧客FAX': 'fax',
    '顧客ランク': 'rank',
    '顧客分類': 'classification',
    '担当者所属店舗': 'staff_store',
    '担当者': 'staff_name',
    'DMの可否': 'dm_allowed',
  }

  const handleImport = useCallback(async () => {
    setStep('importing')
    const errors: string[] = []

    // Create import record
    const { data: importRecord } = await supabase
      .from('csv_imports')
      .insert({ file_name: fileName, table_name: targetTable, status: 'processing' })
      .select()
      .single()

    const mapped = applyMappings(rows, mappings)

    // 必須カラム(name)が空の行をスキップ
    const filtered = mapped.filter((r) => {
      if (targetTable === 'customers' && !r.name) return false
      return true
    })

    // 案件インポート時は顧客データも同時にupsert
    let customerCount = 0
    if (targetTable === 'deals') {
      const customerRows: Record<string, Record<string, unknown>> = {}
      for (const row of rows) {
        const custId = row['顧客ID']?.trim()
        const custName = row['顧客名']?.trim()
        if (!custId || !custName) continue
        // 同じ顧客IDは最初の行を使用
        if (customerRows[custId]) continue
        const custRow: Record<string, unknown> = {}
        for (const [csvCol, dbCol] of Object.entries(DEALS_CUSTOMER_COLUMN_MAP)) {
          const val = row[csvCol]?.trim() || null
          if (val) custRow[dbCol] = val
        }
        if (custRow.andpad_id && custRow.name) {
          customerRows[custId] = custRow
        }
      }
      const custArray = Object.values(customerRows)
      if (custArray.length > 0) {
        const custChunks = []
        for (let i = 0; i < custArray.length; i += 100) {
          custChunks.push(custArray.slice(i, i + 100))
        }
        for (const chunk of custChunks) {
          const { error, data } = await supabase
            .from('customers')
            .upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false })
            .select()
          if (error) {
            // 1件ずつリトライ
            for (const cRow of chunk) {
              const { error: cErr } = await supabase
                .from('customers')
                .upsert([cRow], { onConflict: 'andpad_id', ignoreDuplicates: false })
                .select()
              if (cErr) {
                errors.push(`顧客 ${cRow.andpad_id} (${cRow.name || ''}): ${cErr.message}`)
              } else {
                customerCount += 1
              }
            }
          } else {
            customerCount += data?.length || 0
          }
        }
      }
    }

    // 案件インポート時: 担当者が「会社管理」の場合、顧客住所で店舗を振り分け
    if (targetTable === 'deals') {
      // 顧客ID→住所のマップを作成（XLSXの行データから）
      const custAddrMap: Record<string, string> = {}
      for (const row of rows) {
        const custId = row['顧客ID']?.trim()
        const addr = row['顧客現住所']?.trim()
        if (custId && addr) custAddrMap[custId] = addr
      }
      for (const row of filtered) {
        const staffName = row.staff_name as string | null
        if (isCompanyManaged('', staffName)) {
          const custId = row.customer_andpad_id as string | null
          const addr = custId ? custAddrMap[custId] : null
          const area = getAreaFromAddress(addr)
          if (area) {
            row.store_name = `${area}　会社管理`
          }
        }
      }
    }

    // Add csv_import_id to each row
    const rowsWithImportId = filtered.map((r) => ({
      ...r,
      csv_import_id: importRecord?.id,
    }))

    // Batch upsert (chunks of 100), エラー時は1件ずつリトライして特定
    let successCount = 0
    const chunks: { rows: Record<string, unknown>[]; startIdx: number }[] = []
    for (let i = 0; i < rowsWithImportId.length; i += 100) {
      chunks.push({ rows: rowsWithImportId.slice(i, i + 100), startIdx: i })
    }

    // マッピングの逆引き（dbColumn → csvColumn）
    const dbToLabel: Record<string, string> = {}
    for (const m of mappings) dbToLabel[m.dbColumn] = m.csvColumn

    for (const chunk of chunks) {
      const { error, data } = await supabase
        .from(targetTable)
        .upsert(chunk.rows, { onConflict: 'andpad_id', ignoreDuplicates: false })
        .select()

      if (error) {
        // エラー発生時: 1件ずつ挿入してエラー行を特定
        for (let j = 0; j < chunk.rows.length; j++) {
          const row = chunk.rows[j]
          const rowNum = chunk.startIdx + j + 2 // +2: ヘッダー行+0始まり補正
          const { error: rowError } = await supabase
            .from(targetTable)
            .upsert([row], { onConflict: 'andpad_id', ignoreDuplicates: false })
            .select()
          if (rowError) {
            // エラーメッセージから問題の値を抽出して該当カラムを特定
            const valMatch = rowError.message.match(/invalid input.*?:\s*"(.+?)"/)
            const badValue = valMatch ? valMatch[1] : null
            let colInfo = ''
            if (badValue) {
              const found = Object.entries(row).find(([, v]) => String(v) === badValue)
              if (found) {
                const label = dbToLabel[found[0]] || found[0]
                colInfo = ` [項目: ${label}, 値: "${badValue}"]`
              }
            }
            const id = (row.andpad_id || row.name || '') as string
            errors.push(`行${rowNum} (${id})${colInfo}: ${rowError.message}`)
          } else {
            successCount += 1
          }
        }
      } else {
        successCount += data?.length || 0
      }
    }

    // Update import record
    if (importRecord) {
      await supabase
        .from('csv_imports')
        .update({
          status: errors.length > 0 ? 'error' : 'completed',
          row_count: successCount,
          error_count: errors.length,
          error_message: errors.join('; ') || null,
        })
        .eq('id', importRecord.id)
    }

    setResult({ success: successCount, errors, customerCount })
    setStep('done')
  }, [rows, mappings, targetTable, fileName])

  const reset = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setMappings([])
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">CSVインポート</h1>

      {step === 'upload' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Google Driveから案件インポート</h2>
              <button
                onClick={handleCloudImport}
                disabled={cloudImporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {cloudImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                {cloudImporting ? 'インポート中...' : 'クラウドから案件インポート'}
              </button>
            </div>
            <p className="text-xs text-slate-400">指定のGoogle Driveフォルダにあるxlsxファイルを取得してインポートします。インポート後ファイルは自動削除されます。</p>
            {cloudImporting && cloudStatus && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{cloudStatus}</span>
              </div>
            )}
            {cloudResult && (
              <div className="mt-3 p-3 rounded-lg border text-xs bg-slate-50 border-slate-200">
                {cloudResult.results && cloudResult.results.length > 0 ? (
                  cloudResult.results.map((r, i) => (
                    <div key={i} className={`${i > 0 ? 'mt-2 pt-2 border-t border-slate-200' : ''}`}>
                      <p className="font-medium text-slate-700">{r.fileName}</p>
                      <p className="text-slate-500 mt-0.5">
                        <span className="text-green-600 font-semibold">{r.success}件</span> インポート
                        {r.customerCount > 0 && <span className="ml-2">（顧客: {r.customerCount}件）</span>}
                        {r.errorCount > 0 && <span className="text-red-500 ml-2">エラー: {r.errorCount}件</span>}
                      </p>
                      {r.errors.length > 0 && (
                        <div className="mt-1 text-red-500">{r.errors.map((e, j) => <p key={j}>{e}</p>)}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">{cloudResult.message}</p>
                )}
              </div>
            )}
          </div>
          <CsvUploader onFileSelect={handleFileSelect} />
          <ImportHistory />
        </>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="p-1 rounded hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{fileName}</h2>
              <p className="text-xs text-slate-500">
                {rows.length}行 → {TABLE_LABELS[targetTable]}テーブル
              </p>
            </div>
          </div>

          <ColumnMapper
            headers={headers}
            mappings={mappings}
            targetTable={targetTable}
            onMappingsChange={setMappings}
          />

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">プレビュー（先頭5行）</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="text-xs w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {mappings.map((m) => (
                      <th key={m.dbColumn} className="px-2 py-1.5 text-left font-medium text-slate-500 whitespace-nowrap">
                        {m.dbColumn}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {mappings.map((m) => (
                        <td key={m.dbColumn} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                          {row[m.csvColumn] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
              キャンセル
            </button>
            <button
              onClick={handleImport}
              disabled={mappings.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rows.length}行をインポート
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-600 font-medium">インポート中...</p>
          <p className="text-xs text-slate-400">{rows.length}行を処理しています</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          {result.errors.length === 0 ? (
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          ) : (
            <AlertTriangle className="w-16 h-16 text-amber-500" />
          )}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900">インポート完了</h2>
            <p className="text-slate-600 mt-1">{result.success}件を正常に取り込みました</p>
            {result.customerCount != null && result.customerCount > 0 && (
              <p className="text-slate-500 text-xs mt-1">顧客テーブル: {result.customerCount}件を同時更新</p>
            )}
            {result.errors.length > 0 && (
              <div className="mt-3 text-xs text-red-600 max-w-2xl">
                <p className="font-medium">{result.errors.length}件のエラー:</p>
                <div className="mt-2 max-h-60 overflow-auto border border-red-200 rounded-lg p-2 bg-red-50 text-left">
                  {result.errors.map((e, i) => (
                    <p key={i} className="py-0.5 border-b border-red-100 last:border-0 text-xs">{e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            別のファイルをインポート
          </button>
        </div>
      )}
    </div>
  )
}
