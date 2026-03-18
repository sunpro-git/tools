import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Supabaseのデフォルト1000件制限を回避してページネーションで全件取得
 */
export async function fetchAll<T>(
  table: string,
  columns = '*'
): Promise<T[]> {
  const PAGE_SIZE = 1000
  const all: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error(`fetchAll(${table}) error:`, error.message)
      break
    }
    if (!data || data.length === 0) break

    all.push(...(data as T[]))

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}
