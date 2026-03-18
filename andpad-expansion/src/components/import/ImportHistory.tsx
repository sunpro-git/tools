import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { CsvImport } from '../../types/database'
import { TABLE_LABELS, type TargetTable } from '../../types/csv'
import { formatDate } from '../../lib/formatters'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ImportHistory() {
  const [imports, setImports] = useState<CsvImport[]>([])

  useEffect(() => {
    supabase
      .from('csv_imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setImports(data)
      })
  }, [])

  if (imports.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">インポート履歴</h3>
      <div className="space-y-2">
        {imports.map((imp) => (
          <div key={imp.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
            {imp.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : imp.status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900 truncate">{imp.file_name}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {TABLE_LABELS[imp.table_name as TargetTable] || imp.table_name}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {formatDate(imp.created_at)} / {imp.row_count}件取込
                {imp.error_count > 0 && ` / ${imp.error_count}件エラー`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
