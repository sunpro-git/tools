import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import type { TargetTable } from '../../types/csv'
import { TABLE_LABELS } from '../../types/csv'

interface Props {
  onFileSelect: (file: File, targetTable: TargetTable) => void
}

const tables: TargetTable[] = ['customers', 'properties', 'deals', 'contracts']

export default function CsvUploader({ onFileSelect }: Props) {
  const [targetTable, setTargetTable] = useState<TargetTable>('deals')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      ) {
        onFileSelect(file, targetTable)
      } else {
        alert('CSVまたはXLSXファイルを選択してください')
      }
    },
    [onFileSelect, targetTable]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          インポート先テーブル
        </label>
        <div className="flex gap-2">
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => setTargetTable(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                targetTable === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {TABLE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          {dragOver ? (
            <FileSpreadsheet className="w-12 h-12 text-blue-500" />
          ) : (
            <Upload className="w-12 h-12 text-slate-400" />
          )}
          <div>
            <p className="text-base font-medium text-slate-700">
              CSVファイルをドラッグ&ドロップ
            </p>
            <p className="text-sm text-slate-500 mt-1">または</p>
          </div>
          <label className="cursor-pointer">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              ファイルを選択
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </label>
          <p className="text-xs text-slate-400">CSV (Shift_JIS/UTF-8) / XLSX対応</p>
        </div>
      </div>
    </div>
  )
}
