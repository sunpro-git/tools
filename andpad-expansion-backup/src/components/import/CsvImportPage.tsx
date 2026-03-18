import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { parseFile, autoDetectMappings, applyMappings } from '../../lib/csv-parser'
import type { TargetTable, ColumnMapping } from '../../types/csv'
import { TABLE_LABELS } from '../../types/csv'
import CsvUploader from './CsvUploader'
import ColumnMapper from './ColumnMapper'
import ImportHistory from './ImportHistory'
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

export default function CsvImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [targetTable, setTargetTable] = useState<TargetTable>('deals')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

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

    // Add csv_import_id to each row
    const rowsWithImportId = mapped.map((r) => ({
      ...r,
      csv_import_id: importRecord?.id,
    }))

    // Batch upsert (chunks of 100)
    let successCount = 0
    const chunks = []
    for (let i = 0; i < rowsWithImportId.length; i += 100) {
      chunks.push(rowsWithImportId.slice(i, i + 100))
    }

    for (const chunk of chunks) {
      const { error, data } = await supabase
        .from(targetTable)
        .upsert(chunk, { onConflict: 'andpad_id', ignoreDuplicates: false })
        .select()

      if (error) {
        errors.push(error.message)
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

    setResult({ success: successCount, errors })
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
              <p className="text-sm text-slate-500">
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
          <p className="text-sm text-slate-400">{rows.length}行を処理しています</p>
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
            {result.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-600 max-w-md">
                <p className="font-medium">{result.errors.length}件のエラー:</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="mt-1">{e}</p>
                ))}
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
