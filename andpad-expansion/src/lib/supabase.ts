import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Supabaseのデフォルト1000件制限を回避して全件取得
 * まずcountを取得し、全ページを並列リクエストで高速化
 */
export async function fetchAll<T>(
  table: string,
  columns = '*'
): Promise<T[]> {
  const PAGE_SIZE = 1000

  // 1. 件数を取得
  const { count, error: countError } = await supabase
    .from(table)
    .select(columns, { count: 'exact', head: true })

  if (countError) {
    console.error(`fetchAll(${table}) count error:`, countError.message)
    return []
  }
  if (!count || count === 0) return []

  // 2. 全ページを並列リクエスト
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const requests = Array.from({ length: totalPages }, (_, i) => {
    const from = i * PAGE_SIZE
    return supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
  })

  const results = await Promise.all(requests)
  const all: T[] = []
  for (const { data, error } of results) {
    if (error) {
      console.error(`fetchAll(${table}) error:`, error.message)
      continue
    }
    if (data) all.push(...(data as T[]))
  }

  return all
}
