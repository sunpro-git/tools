import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { cacheGet, cacheSet } from '../../lib/cache'
import { Loader2, ChevronDown, ChevronUp, ExternalLink, X, Building2, MapPin, Tag, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw } from 'lucide-react'
import { useBusinessType } from '../../hooks/useBusinessType'
import { BUSINESS_TYPES } from '../../hooks/useDepartments'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

// 反響区分の先頭2桁ごとの色マップ
const GROUP_COLORS: Record<string, string> = {
  '01': '#3b82f6', // オーナー様本人・スタッフ本人 → 青
  '02': '#10b981', // 紹介系 → 緑
  '03': '#f59e0b', // WEB・SNS系 → 黄
  '04': '#ef4444', // チラシ → 赤
  '05': '#8b5cf6', // 雑誌・テレビCM → 紫
  '06': '#ec4899', // SUUMO・ハピすむ・HOME'S → ピンク
  '07': '#06b6d4', // 総展 → シアン
  '08': '#84cc16', // 看板・通りすがり → ライム
  '09': '#f97316', // 資料請求 → オレンジ
  '10': '#64748b', // きっかけ不明 → グレー
  '11': '#6366f1', // その他イベント → インディゴ
  '12': '#d946ef', // 見学会・お披露目会 → フューシャ
}
const FALLBACK_COLOR = '#94a3b8'

const GROUP_LABELS = [
  { prefix: '01', label: 'オーナー・本人' },
  { prefix: '02', label: '紹介' },
  { prefix: '03', label: 'WEB・SNS' },
  { prefix: '04', label: 'チラシ' },
  { prefix: '05', label: '雑誌・TV' },
  { prefix: '06', label: 'SUUMO等' },
  { prefix: '07', label: '総展' },
  { prefix: '08', label: '看板・通り' },
  { prefix: '09', label: '資料請求' },
  { prefix: '10', label: 'きっかけ不明' },
  { prefix: '11', label: 'その他イベント' },
  { prefix: '12', label: '見学会' },
]

function getCategoryColor(name: string, detailToCategory?: Record<string, string>): string {
  const prefix = name.slice(0, 2)
  if (GROUP_COLORS[prefix]) return GROUP_COLORS[prefix]
  // 反響区分詳細の場合、親の反響区分から色を引く
  if (detailToCategory && detailToCategory[name]) {
    const parentPrefix = detailToCategory[name].slice(0, 2)
    if (GROUP_COLORS[parentPrefix]) return GROUP_COLORS[parentPrefix]
  }
  return FALLBACK_COLOR
}

type ViewMode = 'monthly' | 'quarterly' | 'yearly'

/**
 * 9月始まりの期(sn)と四半期を算出
 * Q1: 9-11月, Q2: 12-2月, Q3: 3-5月, Q4: 6-8月
 * 2024/9～2025/8 → 2025sn
 */
function getFiscalQuarter(dateStr: string): { snYear: number; quarter: number } {
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(5, 7))
  // 9月以降は翌年度、8月以前は当年度
  const snYear = month >= 9 ? year + 1 : year
  let quarter: number
  if (month >= 9 && month <= 11) quarter = 1
  else if (month === 12 || month <= 2) quarter = 2
  else if (month >= 3 && month <= 5) quarter = 3
  else quarter = 4
  return { snYear, quarter }
}

function getFiscalYear(dateStr: string): number {
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(5, 7))
  return month >= 9 ? year + 1 : year
}

/** 四半期の期間文字列を返す（例: "2024年9月〜2024年11月"） */
function getQuarterRange(periodKey: string): string {
  const [yStr, qStr] = periodKey.split('-')
  const snYear = parseInt(yStr)
  const q = parseInt(qStr.replace('Q', ''))
  const baseYear = snYear - 1
  switch (q) {
    case 1: return `${baseYear}年9月〜${baseYear}年11月`
    case 2: return `${baseYear}年12月〜${baseYear + 1}年2月`
    case 3: return `${baseYear + 1}年3月〜${baseYear + 1}年5月`
    case 4: return `${baseYear + 1}年6月〜${baseYear + 1}年8月`
    default: return ''
  }
}

/** 年次の期間文字列を返す（例: "2024年9月〜2025年8月"） */
function getYearRange(periodKey: string): string {
  const snYear = parseInt(periodKey.replace('sn', ''))
  return `${snYear - 1}年9月〜${snYear}年8月`
}

// RPC結果の行型
interface SummaryRow {
  period: string // YYYY-MM
  deal_category: string
  store_name: string
  response_category: string
  response_category_detail: string
  cnt: number
  contracted: number
  contract_amount: number
}

// 契約案件の型
interface ContractedDeal {
  andpad_id: string
  order_date: string
  order_amount: number | null
  deal_name: string | null
}

// 詳細一覧の行型
interface DealRow {
  customer_name: string | null
  deal_name: string | null
  deal_category: string | null
  response_category: string
  response_category_detail: string
  inquiry_date: string | null
  order_date: string | null
  order_amount: number | null
  contract_amount_ex_tax: number | null
  estimate_amount_ex_tax: number | null
  store_name: string | null
  staff_name: string | null
  andpad_id: string | null
  customer_andpad_id?: string | null
  customer_address?: string | null
  contracted_deals?: ContractedDeal[]
}

export default function InquiryPage() {
  const { businessType, setBusinessType } = useBusinessType()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('quarterly')
  const [selectedType, setSelectedType] = useState<string>(businessType)
  useEffect(() => { setSelectedType(businessType) }, [businessType])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStoreGroups, setSelectedStoreGroups] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [detailSort, setDetailSort] = useState<{ key: 'name' | 'count' | 'contract'; asc: boolean }>({ key: 'name', asc: true })
  const [detailLevel, setDetailLevel] = useState<'category' | 'detail'>('detail')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // モーダル表示中は背面スクロールを抑止
  useEffect(() => {
    if (expandedCategory) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [expandedCategory])
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  // 店舗グループ定義
  const storeGroups = ['本社/松本', '長野', '上田', '伊那', 'その他'] as const
  const getStoreGroup = useCallback((storeName: string): string => {
    if (/本社|松本/.test(storeName)) return '本社/松本'
    if (/長野/.test(storeName)) return '長野'
    if (/上田/.test(storeName)) return '上田'
    if (/伊那/.test(storeName)) return '伊那'
    return 'その他'
  // 注: 会社管理アカウントはRPC側で住所判定済み
  // 例: "本社（住所判定）"→本社にマッチ, "長野（住所判定）"→長野にマッチ
  }, [])

  // 反響区分のグルーピング（03, 04, 07は店舗サフィックスを除去して統合）
  const getCategoryGroup = useCallback((category: string): string => {
    if (/^03 WEB検索/.test(category)) return '03 WEB検索などから問合せ'
    if (/^04 チラシ/.test(category)) return '04 チラシ'
    if (/^07 総展/.test(category)) return '07 総展'
    return category
  }, [])

  // RPC結果（全データ）
  const [allRows, setAllRows] = useState<SummaryRow[]>([])
  const [dealTypes, setDealTypes] = useState<string[]>([])
  const [responseCategories, setResponseCategories] = useState<string[]>([])

  // 検算用データ
  const [verifyCounts, setVerifyCounts] = useState<{ deal_category: string; raw_total: number; deduped_total: number; duplicates: number }[]>([])

  // 詳細一覧（オンデマンド）
  const [detailDeals, setDetailDeals] = useState<DealRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [stale, setStale] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedA5Venues, setSelectedA5Venues] = useState<string[]>(['総展_長野', '総展_松本', '総展_上田', '総展_伊那'])

  // Supabaseから最新データを取得してキャッシュ更新
  const fetchLatest = useCallback(async () => {
    const [filtersRes, summaryRes, verifyRes] = await Promise.all([
      supabase.rpc('get_inquiry_filters'),
      supabase.rpc('get_inquiry_summary_all'),
      supabase.rpc('get_inquiry_verify_counts'),
    ])
    if (filtersRes.data) {
      const f = filtersRes.data as { deal_types: string[]; response_categories: string[]; stores: string[] }
      setDealTypes(f.deal_types || [])
      setResponseCategories(f.response_categories || [])
      cacheSet('inquiry_filters', { deal_types: f.deal_types, response_categories: f.response_categories })
    }
    if (summaryRes.error) {
      console.error('get_inquiry_summary_all error:', summaryRes.error.message)
    } else {
      const rows = (summaryRes.data as SummaryRow[]) || []
      setAllRows(rows)
      cacheSet('inquiry_summary', rows)
    }
    if (verifyRes.data) {
      setVerifyCounts(verifyRes.data as typeof verifyCounts)
      cacheSet('inquiry_verify', verifyRes.data)
    }
  }, [])

  // 手動再取得
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchLatest()
    setRefreshing(false)
    setStale(false)
  }, [fetchLatest])

  // stale-while-revalidate: キャッシュから即表示→裏で最新取得
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)

      // 1. キャッシュから即座に描画
      const [cachedFilters, cachedSummary, cachedVerify] = await Promise.all([
        cacheGet<{ deal_types: string[]; response_categories: string[] }>('inquiry_filters'),
        cacheGet<SummaryRow[]>('inquiry_summary'),
        cacheGet<typeof verifyCounts>('inquiry_verify'),
      ])
      if (!cancelled && cachedSummary?.data) {
        if (cachedFilters?.data) {
          setDealTypes(cachedFilters.data.deal_types || [])
          setResponseCategories(cachedFilters.data.response_categories || [])
        }
        setAllRows(cachedSummary.data)
        if (cachedVerify?.data) setVerifyCounts(cachedVerify.data)
        setLoading(false)
        setStale(true)
      }

      // 2. バックグラウンドで最新データを取得
      if (!cancelled) {
        await fetchLatest()
      }
      if (!cancelled) {
        setLoading(false)
        setStale(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchLatest])

  // フィルタ適用（クライアントサイド）
  const summaryRows = useMemo(() => {
    return allRows.filter((row) => {
      if (selectedType !== 'all' && row.deal_category !== selectedType) return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(row.response_category)) return false
      if (selectedStoreGroups.length > 0 && !selectedStoreGroups.includes(getStoreGroup(row.store_name))) return false
      return true
    })
  }, [allRows, selectedType, selectedCategories, selectedStoreGroups, getStoreGroup])

  // 詳細一覧をオンデマンド取得（期間＋反響区分詳細で絞り込み）
  const fetchDetailDeals = useCallback(async (periodFrom: string, periodTo: string, filterValue?: string, filterType: 'detail' | 'category' = 'detail') => {
    setDetailLoading(true)
    // periodTo (YYYY-MM) の月末日を算出
    const [toY, toM] = periodTo.split('-').map(Number)
    const lastDay = new Date(toY, toM, 0).getDate()
    const periodToDate = `${periodTo}-${String(lastDay).padStart(2, '0')}`
    let query = supabase
      .from('deals')
      .select('customer_name,name,deal_category,response_category,response_category_detail,inquiry_date,order_date,order_amount,contract_amount_ex_tax,estimate_amount_ex_tax,store_name,staff_name,andpad_id,customer_andpad_id')
      .not('inquiry_date', 'is', null)
      .gte('inquiry_date', `${periodFrom}-01`)
      .lte('inquiry_date', periodToDate)
      .order('inquiry_date', { ascending: false })
    if (selectedType !== 'all') query = query.eq('deal_category', selectedType)
    if (filterValue) {
      if (filterType === 'category') {
        if (filterValue === '未分類') {
          query = query.is('response_category', null)
        } else if (/^03 WEB検索|^04 チラシ|^07 総展/.test(filterValue)) {
          // グループ化された反響区分は前方一致で検索
          const prefix = filterValue.replace(/などから問合せ$/, '')
          query = query.like('response_category', `${prefix}%`)
        } else {
          query = query.eq('response_category', filterValue)
        }
      } else {
        if (filterValue === '未分類') {
          query = query.is('response_category_detail', null)
        } else {
          query = query.eq('response_category_detail', filterValue)
        }
      }
    }
    const { data, error } = await query.range(0, 9999)
    if (error) {
      console.error('fetch deals error:', error.message)
      setDetailDeals([])
      setDetailLoading(false)
      return
    }
    let rows: DealRow[] = (data || []).map((d) => ({
      ...(d as unknown as DealRow),
      deal_name: ((d as Record<string, unknown>).name as string) || null,
    }))
    if (selectedStoreGroups.length > 0) {
      rows = rows.filter((r) => selectedStoreGroups.includes(getStoreGroup(r.store_name || '')))
    }

    // 契約日がない行の顧客について、別案件の契約情報を取得
    const custIdsNeedingContracts = [
      ...new Set(
        rows
          .filter((r) => !r.order_date && r.customer_andpad_id)
          .map((r) => r.customer_andpad_id!)
      ),
    ]
    if (custIdsNeedingContracts.length > 0) {
      const { data: contractData } = await supabase
        .from('deals')
        .select('customer_andpad_id,andpad_id,order_date,order_amount,name')
        .not('order_date', 'is', null)
        .not('andpad_id', 'is', null)
        .in('customer_andpad_id', custIdsNeedingContracts)
        .order('order_date', { ascending: true })
        .range(0, 9999)
      if (contractData) {
        // 顧客ごとの契約案件マップ
        const contractMap: Record<string, ContractedDeal[]> = {}
        for (const c of contractData as Record<string, unknown>[]) {
          const cid = c.customer_andpad_id as string
          if (!contractMap[cid]) contractMap[cid] = []
          contractMap[cid].push({
            andpad_id: c.andpad_id as string,
            order_date: c.order_date as string,
            order_amount: (c.order_amount as number) || null,
            deal_name: (c.name as string) || null,
          })
        }
        for (const row of rows) {
          if (!row.order_date && row.customer_andpad_id && contractMap[row.customer_andpad_id]) {
            // 反響日以前の契約はカウントしない
            row.contracted_deals = row.inquiry_date
              ? contractMap[row.customer_andpad_id].filter(c => c.order_date >= row.inquiry_date!)
              : contractMap[row.customer_andpad_id]
          }
        }
      }
    }
    // 顧客住所を取得
    const custIds = [...new Set(rows.filter((r) => r.customer_andpad_id).map((r) => r.customer_andpad_id!))]
    if (custIds.length > 0) {
      const addrChunks = []
      for (let i = 0; i < custIds.length; i += 200) addrChunks.push(custIds.slice(i, i + 200))
      const addrMap: Record<string, string> = {}
      for (const chunk of addrChunks) {
        const { data: addrData } = await supabase
          .from('customers')
          .select('andpad_id,address')
          .in('andpad_id', chunk)
        if (addrData) {
          for (const a of addrData as { andpad_id: string; address: string | null }[]) {
            if (a.address) addrMap[a.andpad_id] = a.address
          }
        }
      }
      for (const row of rows) {
        if (row.customer_andpad_id && addrMap[row.customer_andpad_id]) {
          row.customer_address = addrMap[row.customer_andpad_id]
        }
      }
    }
    setDetailDeals(rows)
    setDetailLoading(false)
  }, [selectedType, selectedStoreGroups, getStoreGroup])

  // --- ここから集計データをフロントで整形 ---

  // YYYY-MM → 期間キーに変換（モード指定版）
  const toPeriodKeyFor = useCallback((ym: string, mode: ViewMode): string => {
    if (mode === 'monthly') return ym
    if (mode === 'quarterly') {
      const { snYear, quarter } = getFiscalQuarter(ym + '-01')
      return `${snYear}-Q${quarter}`
    }
    return `${getFiscalYear(ym + '-01')}sn`
  }, [])

  // viewMode依存のtoPeriodKey（詳細表示用に残す）
  const toPeriodKey = useCallback((ym: string): string => toPeriodKeyFor(ym, viewMode), [viewMode, toPeriodKeyFor])

  // 指定モードのチャートデータを生成
  const buildChartData = useCallback((mode: ViewMode) => {
    const counts: Record<string, Record<string, number>> = {}
    const contractedCounts: Record<string, number> = {}
    for (const row of summaryRows) {
      const key = toPeriodKeyFor(row.period, mode)
      const cat = row.response_category
      if (!counts[key]) counts[key] = {}
      counts[key][cat] = (counts[key][cat] || 0) + row.cnt
      contractedCounts[key] = (contractedCounts[key] || 0) + row.contracted
    }
    const sorted = Object.keys(counts).sort()
    return sorted.map((key) => {
      let label: string
      if (mode === 'monthly') {
        label = `${key.slice(2, 4)}/${key.slice(5)}`
      } else if (mode === 'quarterly') {
        const [y, q] = key.split('-')
        label = `${y}sn ${q}`
      } else {
        label = key
      }
      const entry: Record<string, unknown> = {
        period: key,
        label,
        total: Object.values(counts[key]).reduce((a, b) => a + b, 0),
        totalContracted: contractedCounts[key] || 0,
        ...counts[key],
      }
      if (mode === 'quarterly') {
        const [y, q] = key.split('-')
        entry.tickLabel = q
        entry.snYear = `${y}sn`
      }
      return entry
    })
  }, [summaryRows, toPeriodKeyFor])

  const yearlyData = useMemo(() => buildChartData('yearly'), [buildChartData])
  const quarterlyData = useMemo(() => buildChartData('quarterly'), [buildChartData])
  const monthlyDataAll = useMemo(() => buildChartData('monthly'), [buildChartData])
  const monthlyData = useMemo(() => monthlyDataAll.slice(-26), [monthlyDataAll])

  // 期間ごとの反響区分詳細内訳
  const detailByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      const key = toPeriodKey(row.period)
      if (!map[key]) map[key] = {}
      map[key][row.response_category_detail] = (map[key][row.response_category_detail] || 0) + row.cnt
    }
    return map
  }, [summaryRows, toPeriodKey])

  // 期間ごとの反響区分詳細別・契約数
  const contractByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      if (row.contracted <= 0) continue
      const key = toPeriodKey(row.period)
      if (!map[key]) map[key] = {}
      map[key][row.response_category_detail] = (map[key][row.response_category_detail] || 0) + row.contracted
    }
    return map
  }, [summaryRows, toPeriodKey])

  // 期間ごとの反響区分詳細別・契約金額
  const contractAmountByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      if (row.contract_amount <= 0) continue
      const key = toPeriodKey(row.period)
      if (!map[key]) map[key] = {}
      map[key][row.response_category_detail] = (map[key][row.response_category_detail] || 0) + row.contract_amount
    }
    return map
  }, [summaryRows, toPeriodKey])

  // 期間ごとの反響区分内訳（グループ化済み）
  const categoryByPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      const key = toPeriodKey(row.period)
      const cat = getCategoryGroup(row.response_category)
      if (!map[key]) map[key] = {}
      map[key][cat] = (map[key][cat] || 0) + row.cnt
    }
    return map
  }, [summaryRows, toPeriodKey, getCategoryGroup])

  // 期間ごとの反響区分別・契約数（グループ化済み）
  const contractByCategoryPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      if (row.contracted <= 0) continue
      const key = toPeriodKey(row.period)
      const cat = getCategoryGroup(row.response_category)
      if (!map[key]) map[key] = {}
      map[key][cat] = (map[key][cat] || 0) + row.contracted
    }
    return map
  }, [summaryRows, toPeriodKey, getCategoryGroup])

  // 期間ごとの反響区分別・契約金額（グループ化済み）
  const contractAmountByCategoryPeriod = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      if (row.contract_amount <= 0) continue
      const key = toPeriodKey(row.period)
      const cat = getCategoryGroup(row.response_category)
      if (!map[key]) map[key] = {}
      map[key][cat] = (map[key][cat] || 0) + row.contract_amount
    }
    return map
  }, [summaryRows, toPeriodKey, getCategoryGroup])

  // 反響区分詳細→反響区分のマッピング（色判定用）
  const detailToCategory = useMemo(() => {
    const map: Record<string, string> = {}
    for (const row of allRows) {
      if (!map[row.response_category_detail]) {
        map[row.response_category_detail] = row.response_category
      }
    }
    return map
  }, [allRows])

  // 棒グラフ用の反響区分キー（全モード共通）
  const barKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const d of [...yearlyData, ...quarterlyData, ...monthlyData]) {
      Object.keys(d).forEach((k) => {
        if (!['period', 'label', 'total', 'totalContracted', 'snYear', 'tickLabel'].includes(k)) keys.add(k)
      })
    }
    return Array.from(keys).sort().reverse()
  }, [yearlyData, quarterlyData, monthlyData])

  // A5: 総展の四半期推移データ（展示場別・契約数含む）
  const a5Data = useMemo(() => {
    // 総展（07）のみ抽出し、展示場名（response_category）別に四半期集計
    const qMap: Record<string, Record<string, number>> = {}
    const qContracted: Record<string, Record<string, number>> = {}
    for (const row of summaryRows) {
      if (!row.response_category.startsWith('07 ')) continue
      const { snYear, quarter } = getFiscalQuarter(row.period + '-01')
      const key = `${snYear}-Q${quarter}`
      const venue = row.response_category.replace(/^07 /, '')
      if (!qMap[key]) qMap[key] = {}
      qMap[key][venue] = (qMap[key][venue] || 0) + row.cnt
      if (!qContracted[key]) qContracted[key] = {}
      qContracted[key][venue] = (qContracted[key][venue] || 0) + row.contracted
    }
    // 2023sn以降のみ
    const periods = Object.keys(qMap).sort().filter((k) => k >= '2023-')
    const venueOrder = ['総展_長野', '総展_松本', '総展_上田', '総展_伊那']
    const allVenues = new Set<string>()
    for (const p of periods) Object.keys(qMap[p]).forEach((v) => allVenues.add(v))
    const venueKeys = venueOrder.filter((v) => allVenues.has(v) && selectedA5Venues.includes(v))
    const chartData = periods.map((key) => {
      const [y, q] = key.split('-')
      const entry: Record<string, unknown> = { period: key, label: `${y}sn ${q}` }
      for (const v of venueKeys) {
        entry[v] = qMap[key][v] || 0
        entry[`${v}_contracted`] = qContracted[key]?.[v] || 0
      }
      return entry
    })
    return { chartData, venueKeys }
  }, [summaryRows, selectedA5Venues])

  // A6: 完成お披露目会のイベントごとの新規来場数
  const a6Data = useMemo(() => {
    // 12 見学会系で日付パターン（YYYY-MM-DD_ or YYYY-M-DD_）にマッチするdetailのみ
    const datePattern = /^(\d{4}-\d{1,2}-\d{1,2})_(.+)$/
    const events: { date: string; label: string; cnt: number; contracted: number }[] = []
    const eventMap: Record<string, { cnt: number; contracted: number }> = {}
    for (const row of summaryRows) {
      if (!row.response_category.startsWith('12 ')) continue
      const m = row.response_category_detail.match(datePattern)
      if (!m) continue
      const key = row.response_category_detail
      if (!eventMap[key]) eventMap[key] = { cnt: 0, contracted: 0 }
      eventMap[key].cnt += row.cnt
      eventMap[key].contracted += row.contracted
    }
    for (const [key, val] of Object.entries(eventMap)) {
      const m = key.match(datePattern)!
      const dateParts = m[1].split('-')
      const dateStr = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`
      events.push({ date: dateStr, label: m[2], cnt: val.cnt, contracted: val.contracted })
    }
    events.sort((a, b) => a.date.localeCompare(b.date))
    // 直近120イベントに絞る
    return events.slice(-120)
  }, [summaryRows])

  const totalInquiries = useMemo(() => summaryRows.reduce((s, r) => s + r.cnt, 0), [summaryRows])

  // 検算: 選択中の案件種別の検算データ
  const currentVerify = useMemo(() => {
    if (selectedType === 'all') {
      return {
        raw_total: verifyCounts.reduce((s, v) => s + v.raw_total, 0),
        deduped_total: verifyCounts.reduce((s, v) => s + v.deduped_total, 0),
        duplicates: verifyCounts.reduce((s, v) => s + v.duplicates, 0),
      }
    }
    const found = verifyCounts.find((v) => v.deal_category === selectedType)
    return found || { raw_total: 0, deduped_total: 0, duplicates: 0 }
  }, [verifyCounts, selectedType])

  // 期間キー→月範囲変換（詳細取得用）
  const periodToMonthRange = useCallback((periodKey: string): [string, string] => {
    if (viewMode === 'monthly') return [periodKey, periodKey]
    if (viewMode === 'quarterly') {
      const [yStr, qStr] = periodKey.split('-')
      const snYear = parseInt(yStr)
      const q = parseInt(qStr.replace('Q', ''))
      const baseYear = snYear - 1
      switch (q) {
        case 1: return [`${baseYear}-09`, `${baseYear}-11`]
        case 2: return [`${baseYear}-12`, `${baseYear + 1}-02`]
        case 3: return [`${baseYear + 1}-03`, `${baseYear + 1}-05`]
        default: return [`${baseYear + 1}-06`, `${baseYear + 1}-08`]
      }
    }
    // yearly
    const snYear = parseInt(periodKey.replace('sn', ''))
    return [`${snYear - 1}-09`, `${snYear}-08`]
  }, [viewMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500">データ読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー: 3段構成 */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* 1段目: タイトル + 期間 + 更新 */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2"><span className="inline-flex items-center justify-center gap-1 w-auto px-2 h-10 rounded-lg bg-gray-500 text-white font-bold text-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="w-5 h-5"><path d="M328 256C306.9 243.9 285.7 231.8 256 226.7L256 86.4C289.7 77 343.4 64 384 64C480 64 608 112 608 192C608 272 488.4 288 432 288C384 288 356 272 328 256zM160 96L208 96L208 224L160 224C124.7 224 96 195.3 96 160C96 124.7 124.7 96 160 96zM264 384C292 368 320 352 368 352C424.4 352 544 368 544 448C544 528 416 576 320 576C279.5 576 225.7 563 192 553.6L192 413.3C221.7 408.1 242.9 396 264 383.9zM96 544C60.7 544 32 515.3 32 480C32 444.7 60.7 416 96 416L144 416L144 544L96 544z"/></svg>A1</span>新規反響
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className="text-sm font-semibold px-2 py-0.5 rounded-lg border-0 cursor-pointer text-white"
              style={{ backgroundColor: businessType === '新築' ? '#15803d' : businessType === 'リフォーム' ? '#d97706' : '#1e40af' }}
            >
              {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt} className="bg-white text-slate-700">{bt}</option>)}
            </select>
          </h1>
          {stale && <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">キャッシュ表示中…</span>}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
            title="データを再取得"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* 2段目: フィルター（グループ間を縦線で区切り） */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 flex-wrap">
          {/* 案件種別 */}
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="all">全案件種別</option>
              {dealTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="border-l border-slate-200 h-6" />
          {/* 店舗 */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {storeGroups.map((group) => {
              const isChecked = selectedStoreGroups.includes(group)
              return (
                <button
                  key={group}
                  onClick={() => {
                    const next = isChecked ? selectedStoreGroups.filter((s) => s !== group) : [...selectedStoreGroups, group]
                    setSelectedStoreGroups(next)
                  }}
                  className={`px-2 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                    isChecked ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {group}
                </button>
              )
            })}
          </div>
          <div className="border-l border-slate-200 h-6" />
          {/* 反響きっかけ */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm border rounded-lg transition-colors ${
                selectedCategories.length > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              反響きっかけ
              {selectedCategories.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedCategories.length}
                </span>
              )}
              {showCategoryFilter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showCategoryFilter && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-4 min-w-[640px]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">反響きっかけで絞り込み</span>
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    すべて解除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {responseCategories.map((cat) => {
                    const isChecked = selectedCategories.includes(cat)
                    return (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedCategories((prev) =>
                              isChecked ? prev.filter((c) => c !== cat) : [...prev, cat]
                            )
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(cat, detailToCategory) }} />
                        <span className={`text-sm ${isChecked ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                          {cat}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 3段目: サマリー */}
        <div className="flex items-center gap-5 px-4 py-2 text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-400">期間内新規反響数</span>
            <span className="text-lg font-bold text-slate-900">{totalInquiries.toLocaleString()}</span>
            <span className="text-slate-400">件</span>
          </div>
          <div className="flex items-baseline gap-1.5 text-xs text-slate-400">
            (全{currentVerify.raw_total.toLocaleString()} / 重複{currentVerify.duplicates.toLocaleString()} /
            新規<span className={currentVerify.deduped_total === totalInquiries ? 'text-emerald-600' : 'text-red-600'}>{currentVerify.deduped_total.toLocaleString()}</span>)
          </div>
        </div>
      </div>

      {/* 凡例（共通） */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-2">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {GROUP_LABELS.map(({ prefix, label }) => (
            <div key={prefix} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[prefix] }} />
              <span className="text-xs text-slate-600">{prefix} {label}</span>
            </div>
          ))}
          {barKeys.some((k) => !GROUP_COLORS[k.slice(0, 2)]) && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: FALLBACK_COLOR }} />
              <span className="text-xs text-slate-600">その他</span>
            </div>
          )}
        </div>
      </div>

      {/* 年次チャート */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2"><span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">1</span></span>新規反響数推移（年次）</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-600 font-semibold">■ 新規反響数</span>
            <span className="font-semibold" style={{ color: '#dc2626' }}>■ 契約になった反響数</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={yearlyData} style={{ outline: 'none' }} margin={{ top: 30, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
            <XAxis dataKey="label" interval={0} tick={{ fontSize: 13 }} height={30} />
            <YAxis tick={{ fontSize: 13 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0]?.payload
                if (!data) return null
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                    <p className="font-semibold text-slate-900 text-xs">{data.label as string}</p>
                    <p className="text-xs text-slate-500">{getYearRange(data.period as string)}</p>
                    <p className="text-xs text-slate-700">{(data.total as number).toLocaleString()}件</p>
                  </div>
                )
              }}
            />
            {barKeys.map((key) => (
              <Bar key={key} dataKey={key} stackId="a" fill={getCategoryColor(key, detailToCategory)} cursor="pointer"
                onClick={(data: any) => {
                  if (data?.period) { setViewMode('yearly'); setSelectedPeriod(data.period as string) }
                }}
              />
            ))}
            <Line dataKey="total" stroke="transparent" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false}>
              <LabelList
                content={({ x, y, value, index }: any) => {
                  const contracted = (yearlyData[index as number]?.totalContracted as number) || 0
                  return (
                    <g>
                      <text x={x as number} y={(y as number) - 18} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2563eb">{value as number}</text>
                      <text x={x as number} y={(y as number) - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#dc2626">{contracted}</text>
                    </g>
                  )
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 四半期チャート */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2"><span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">2</span></span>新規反響数推移（四半期）</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-600 font-semibold">■ 新規反響数</span>
            <span className="font-semibold" style={{ color: '#dc2626' }}>■ 契約になった反響数</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={quarterlyData} style={{ outline: 'none' }} margin={{ top: 30, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
            <XAxis
              dataKey="label"
              interval={0}
              tick={(props: Record<string, unknown>) => {
                const { x, y, index } = props as { x: number; y: number; index: number }
                const item = quarterlyData[index]
                const tickLabel = (item?.tickLabel as string) || ''
                const snYear = item?.snYear as string | undefined
                const isFirstOfYear = snYear && (index === 0 || quarterlyData[index - 1]?.snYear !== snYear)
                return (
                  <g transform={`translate(${x},${y})`}>
                    {isFirstOfYear && (
                      <text x={0} y={0} dy={10} textAnchor="middle" fontSize={13} fontWeight={600} fill="#334155">
                        {snYear}
                      </text>
                    )}
                    <text x={0} y={0} dy={28} textAnchor="middle" fontSize={13} fill="#64748b">
                      {tickLabel}
                    </text>
                  </g>
                )
              }}
              height={45}
            />
            <YAxis tick={{ fontSize: 13 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0]?.payload
                if (!data) return null
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                    <p className="font-semibold text-slate-900 text-xs">{data.label as string}</p>
                    <p className="text-xs text-slate-500">{getQuarterRange(data.period as string)}</p>
                    <p className="text-xs text-slate-700">{(data.total as number).toLocaleString()}件</p>
                  </div>
                )
              }}
            />
            {barKeys.map((key) => (
              <Bar key={key} dataKey={key} stackId="a" fill={getCategoryColor(key, detailToCategory)} cursor="pointer"
                onClick={(data: any) => {
                  if (data?.period) { setViewMode('quarterly'); setSelectedPeriod(data.period as string) }
                }}
              />
            ))}
            <Line dataKey="total" stroke="transparent" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false}>
              <LabelList
                content={({ x, y, value, index }: any) => {
                  const contracted = (quarterlyData[index as number]?.totalContracted as number) || 0
                  return (
                    <g>
                      <text x={x as number} y={(y as number) - 18} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2563eb">{value as number}</text>
                      <text x={x as number} y={(y as number) - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#dc2626">{contracted}</text>
                    </g>
                  )
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 月次チャート */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2"><span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">3</span></span>新規反響数推移（月次）</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-600 font-semibold">■ 新規反響数</span>
            <span className="font-semibold" style={{ color: '#dc2626' }}>■ 契約になった反響数</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={monthlyData} style={{ outline: 'none' }} margin={{ top: 30, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
            <XAxis
              dataKey="label"
              interval={0}
              tick={(props: Record<string, unknown>) => {
                const { x, y, index } = props as { x: number; y: number; index: number }
                const item = monthlyData[index]
                const period = (item?.period as string) || ''
                const month = parseInt(period.slice(5, 7))
                const year = period.slice(0, 4)
                const isJanuary = month === 1
                const prevItem = index > 0 ? monthlyData[index - 1] : null
                const prevYear = prevItem ? (prevItem.period as string).slice(0, 4) : ''
                const isFirstOfYear = isJanuary || (index === 0 && year !== prevYear)
                return (
                  <g transform={`translate(${x},${y})`}>
                    {isFirstOfYear && (
                      <text x={0} y={0} dy={10} textAnchor="middle" fontSize={13} fontWeight={600} fill="#334155">
                        {year}年
                      </text>
                    )}
                    <text x={0} y={0} dy={28} textAnchor="middle" fontSize={13} fill="#64748b">
                      {month}月
                    </text>
                  </g>
                )
              }}
              height={45}
            />
            <YAxis tick={{ fontSize: 13 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0]?.payload
                if (!data) return null
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                    <p className="font-semibold text-slate-900 text-xs">{data.label as string}</p>
                    <p className="text-xs text-slate-700">{(data.total as number).toLocaleString()}件</p>
                  </div>
                )
              }}
            />
            {barKeys.map((key) => (
              <Bar key={key} dataKey={key} stackId="a" fill={getCategoryColor(key, detailToCategory)} cursor="pointer"
                onClick={(data: any) => {
                  if (data?.period) { setViewMode('monthly'); setSelectedPeriod(data.period as string) }
                }}
              />
            ))}
            <Line dataKey="total" stroke="transparent" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false}>
              <LabelList
                content={({ x, y, value, index }: any) => {
                  const contracted = (monthlyData[index as number]?.totalContracted as number) || 0
                  return (
                    <g>
                      <text x={x as number} y={(y as number) - 18} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2563eb">{value as number}</text>
                      <text x={x as number} y={(y as number) - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#dc2626">{contracted}</text>
                    </g>
                  )
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 選択中の期間の反響区分内訳 */}
      {(() => {
        const chartDataMap: Record<ViewMode, Record<string, unknown>[]> = {
          yearly: yearlyData, quarterly: quarterlyData, monthly: monthlyData,
        }
        const activeData = chartDataMap[viewMode]
        const detailMap = detailLevel === 'category' ? categoryByPeriod : detailByPeriod
        const period = selectedPeriod && detailMap[selectedPeriod]
          ? selectedPeriod
          : activeData.length > 0 ? activeData[activeData.length - 1].period as string : null
        const details = period ? detailMap[period] : null
        const periodInfo = period ? activeData.find((d) => d.period === period) : null
        if (!details || !periodInfo) return null
        const contracts = (detailLevel === 'category' ? contractByCategoryPeriod : contractByPeriod)[period!] || {}
        const amounts = (detailLevel === 'category' ? contractAmountByCategoryPeriod : contractAmountByPeriod)[period!] || {}
        const entries = Object.entries(details).map(([name, count]) => ({
          name,
          count,
          contracted: contracts[name] || 0,
          amount: amounts[name] || 0,
        }))
        const sorted = entries.sort((a, b) => {
          const dir = detailSort.asc ? 1 : -1
          if (detailSort.key === 'name') return a.name.localeCompare(b.name, 'ja') * dir
          if (detailSort.key === 'contract') return (a.contracted - b.contracted || a.count - b.count) * dir
          return (a.count - b.count) * dir
        })
        const total = sorted.reduce((s, r) => s + r.count, 0)
        const totalContracted = sorted.reduce((s, r) => s + r.contracted, 0)
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">4</span></span>
                {(() => {
                  const [y, m] = (period || '').split('-')
                  const levelLabel = '反響きっかけ'
                  return viewMode === 'yearly'
                    ? `${y}（${getYearRange(y)}）の${levelLabel}`
                    : viewMode === 'quarterly'
                      ? `${periodInfo.label}（${getQuarterRange(period!)}）の${levelLabel}`
                      : `${parseInt(y)}年${parseInt(m)}月の${levelLabel}`
                })()}　<span className="text-blue-600">{total.toLocaleString()}件</span>
              </h2>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                {(['category', 'detail'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDetailLevel(level)}
                    className={`px-3 py-1 text-xs transition-colors ${
                      detailLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {{ category: '反響きっかけをまとめて表示', detail: '反響きっかけを詳しく表示' }[level]}
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th
                    className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => setDetailSort((prev) => prev.key === 'name' ? { key: 'name', asc: !prev.asc } : { key: 'name', asc: true })}
                  >
                    <span className="inline-flex items-center gap-1">
                      反響きっかけ
                      {detailSort.key === 'name'
                        ? detailSort.asc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />}
                    </span>
                  </th>
                  <th
                    className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-blue-600 w-28 whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => setDetailSort((prev) => prev.key === 'count' ? { key: 'count', asc: !prev.asc } : { key: 'count', asc: false })}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      新規反響数
                      {detailSort.key === 'count'
                        ? detailSort.asc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />}
                    </span>
                  </th>
                  <th
                    className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 w-40 whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => setDetailSort((prev) => prev.key === 'contract' ? { key: 'contract', asc: !prev.asc } : { key: 'contract', asc: false })}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      契約になった反響数
                      {detailSort.key === 'contract'
                        ? detailSort.asc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        : <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />}
                    </span>
                  </th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 w-20">契約率</th>
                  <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-red-600 w-28">契約金額</th>
                  <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalAmount = sorted.reduce((s, r) => s + r.amount, 0)
                  return (
                    <tr className="bg-slate-200 font-semibold">
                      <td className="py-1.5 px-3 border-b border-slate-300 text-slate-700">合計</td>
                      <td className="py-1.5 px-3 border-b border-slate-300 text-right text-blue-600">{total.toLocaleString()}</td>
                      <td className="py-1.5 px-3 border-b border-slate-300 text-right text-red-600">{totalContracted.toLocaleString()}</td>
                      <td className="py-1.5 px-3 border-b border-slate-300 text-right text-red-600">{total > 0 ? ((totalContracted / total) * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="py-1.5 px-3 border-b border-slate-300 text-right text-red-600">{totalAmount > 0 ? `¥${totalAmount.toLocaleString()}` : '-'}</td>
                      <td className="py-1.5 px-3 border-b border-slate-300 text-center">
                        <button
                          onClick={() => {
                            setExpandedCategory('合計')
                            if (period) {
                              const [from, to] = periodToMonthRange(period)
                              fetchDetailDeals(from, to)
                            }
                          }}
                          className="px-3 py-0.5 text-xs rounded border transition-colors text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  )
                })()}
                {sorted.map((row, idx) => (
                  <tr key={row.name} className={`hover:bg-slate-100 ${idx % 2 === 1 ? 'bg-slate-100/70' : ''}`}>
                    <td className="py-1.5 px-3 border-b border-slate-100" style={{ color: getCategoryColor(row.name, detailToCategory) }}>
                      {row.name}
                    </td>
                    <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-blue-600">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 border-b border-slate-100 text-right font-medium text-red-600">
                      {row.contracted > 0 ? row.contracted.toLocaleString() : '-'}
                    </td>
                    <td className="py-1.5 px-3 border-b border-slate-100 text-right text-red-600">
                      {row.count > 0 && row.contracted > 0 ? ((row.contracted / row.count) * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className="py-1.5 px-3 border-b border-slate-100 text-right text-red-600">
                      {row.amount > 0 ? `¥${row.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-1.5 px-3 border-b border-slate-100 text-center">
                      <button
                        onClick={() => {
                          setExpandedCategory(row.name)
                          if (period) {
                            const [from, to] = periodToMonthRange(period)
                            fetchDetailDeals(from, to, row.name, detailLevel)
                          }
                        }}
                        className="px-3 py-0.5 text-xs rounded border transition-colors text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* A5: 総展 四半期推移（店舗別） */}
      {a5Data.chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">5</span></span>
              総合展示場 反響数推移（四半期・展示場別）
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-blue-600 font-semibold">■ 新規反響数</span>
              <span className="font-semibold" style={{ color: '#dc2626' }}>■ 契約になった反響数</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-500 mr-1">展示場:</span>
            {(['総展_長野', '総展_松本', '総展_上田', '総展_伊那'] as const).map((v) => {
              const colors: Record<string, string> = { '総展_松本': '#3b82f6', '総展_長野': '#10b981', '総展_上田': '#f59e0b', '総展_伊那': '#8b5cf6' }
              const active = selectedA5Venues.includes(v)
              return (
                <button
                  key={v}
                  onClick={() => setSelectedA5Venues((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${active ? 'text-white font-semibold' : 'bg-white text-slate-400 border-slate-200'}`}
                  style={active ? { backgroundColor: colors[v], borderColor: colors[v] } : undefined}
                >
                  {v.replace('総展_', '')}
                </button>
              )
            })}
          </div>
          {(() => {
            const a5Colors: Record<string, string> = { '総展_松本': '#3b82f6', '総展_長野': '#10b981', '総展_上田': '#f59e0b', '総展_伊那': '#8b5cf6' }
            const a5LightColors: Record<string, string> = { '総展_松本': '#93c5fd', '総展_長野': '#6ee7b7', '総展_上田': '#fcd34d', '総展_伊那': '#c4b5fd' }
            return (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={a5Data.chartData} style={{ outline: 'none' }} margin={{ top: 30, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    tick={(props: Record<string, unknown>) => {
                      const { x, y, index } = props as { x: number; y: number; index: number }
                      const item = a5Data.chartData[index]
                      const label = (item?.label as string) || ''
                      const parts = label.split(' ')
                      const snYear = parts[0] || ''
                      const q = parts[1] || ''
                      const isFirstOfYear = index === 0 || !(a5Data.chartData[index - 1]?.label as string)?.startsWith(snYear)
                      return (
                        <g transform={`translate(${x},${y})`}>
                          {isFirstOfYear && (
                            <text x={0} y={0} dy={10} textAnchor="middle" fontSize={13} fontWeight={600} fill="#334155">
                              {snYear}
                            </text>
                          )}
                          <text x={0} y={0} dy={28} textAnchor="middle" fontSize={13} fill="#64748b">
                            {q}
                          </text>
                        </g>
                      )
                    }}
                    height={45}
                  />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const venueOrder = ['総展_長野', '総展_松本', '総展_上田', '総展_伊那']
                      const entryMap = new Map(payload.filter((e) => !(e.dataKey as string).endsWith('_contracted')).map((e) => [e.dataKey as string, e]))
                      const ordered = venueOrder.map((v) => entryMap.get(v)).filter(Boolean)
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-900 mb-1">{label as string}</p>
                          <table className="border-collapse">
                            <tbody>
                              {ordered.map((entry) => {
                                const v = entry!.dataKey as string
                                const cnt = (entry!.value as number) || 0
                                const contracted = (entry!.payload as Record<string, number>)?.[`${v}_contracted`] || 0
                                return (
                                  <tr key={v}>
                                    <td className="pr-2 py-0.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry!.color }} /></td>
                                    <td className="pr-3 py-0.5 text-slate-600">{v}</td>
                                    <td className="py-0.5 text-right font-semibold text-blue-600">{cnt.toLocaleString()}</td>
                                    <td className="py-0.5 text-right font-semibold pl-2" style={{ color: '#dc2626', minWidth: 28 }}>{contracted > 0 ? contracted : ''}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {a5Data.venueKeys.map((v) => (
                    <Bar key={v} dataKey={v} fill={a5Colors[v] || '#94a3b8'} isAnimationActive={false}>
                      <LabelList
                        content={({ x, y, width: bw, index }: any) => {
                          const item = a5Data.chartData[index as number]
                          if (!item) return null
                          const cnt = (item[v] as number) || 0
                          const contracted = (item[`${v}_contracted`] as number) || 0
                          if (cnt === 0) return null
                          const cx = (x as number) + (bw as number) / 2
                          return (
                            <g>
                              <text x={cx} y={(y as number) - 16} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2563eb">{cnt}</text>
                              {contracted > 0 && (
                                <text x={cx} y={(y as number) - 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="#dc2626">{contracted}</text>
                              )}
                            </g>
                          )
                        }}
                      />
                    </Bar>
                  ))}
                  {a5Data.venueKeys.length === 1 && (
                    <Line type="monotone" dataKey={a5Data.venueKeys[0]} stroke={a5LightColors[a5Data.venueKeys[0]] || '#cbd5e1'} strokeWidth={3} dot={{ r: 5, fill: a5LightColors[a5Data.venueKeys[0]] || '#cbd5e1', stroke: a5LightColors[a5Data.venueKeys[0]] || '#cbd5e1' }} isAnimationActive={false} legendType="none" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      )}

      {/* A6: 完成お披露目会 イベント別新規来場数 */}
      {a6Data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-10 rounded-lg bg-gray-500 text-white font-bold text-sm px-3">A1 - <span className="text-xl">6</span></span>
              完成お披露目会 新規来場数推移（イベント別）
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-blue-600 font-semibold">■ 新規反響数</span>
              <span className="font-semibold" style={{ color: '#dc2626' }}>■ 契約になった反響数</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(800, a6Data.length * 28) }}>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={a6Data} style={{ outline: 'none' }} margin={{ top: 30, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" fill="#ffffff" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    tick={(props: Record<string, unknown>) => {
                      const { x, y, index } = props as { x: number; y: number; index: number }
                      const item = a6Data[index]
                      if (!item) return <g />
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={10} textAnchor="end" fontSize={10} fill="#334155" transform="rotate(-55)">
                            {item.date.slice(5)}
                          </text>
                        </g>
                      )
                    }}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { date: string; label: string; cnt: number; contracted: number }
                      if (!d) return null
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-900">{d.date}</p>
                          <p className="text-slate-600">{d.label}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="font-semibold text-blue-600">{d.cnt}件</span>
                            {d.contracted > 0 && <span className="font-semibold" style={{ color: '#dc2626' }}>契約 {d.contracted}件</span>}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="cnt" fill="#3b82f6" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    <LabelList
                      content={({ x, y, width: bw, index }: any) => {
                        const item = a6Data[index as number]
                        if (!item || item.cnt === 0) return null
                        const cx = (x as number) + (bw as number) / 2
                        return (
                          <g>
                            <text x={cx} y={(y as number) - 16} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2563eb">{item.cnt}</text>
                            {item.contracted > 0 && (
                              <text x={cx} y={(y as number) - 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="#dc2626">{item.contracted}</text>
                            )}
                          </g>
                        )
                      }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {expandedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpandedCategory(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1600px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {expandedCategory} の詳細
                {!detailLoading && <span className="ml-3 text-xs font-normal text-slate-500">{detailDeals.length}件</span>}
              </h3>
              <button onClick={() => setExpandedCategory(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-xs text-slate-500">読み込み中...</span>
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100">
                      <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap w-10">No.</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">顧客名</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">案件名</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">住所</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">案件種別</th>
                      <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">反響日</th>
                      <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold text-emerald-600 whitespace-nowrap">契約見込額</th>
                      <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold whitespace-nowrap" style={{ color: '#c53d43' }}>契約日</th>
                      <th className="text-right py-2 px-3 border-b border-slate-200 font-semibold whitespace-nowrap" style={{ color: '#c53d43' }}>契約額</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">店舗</th>
                      <th className="text-left py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">担当</th>
                      <th className="text-center py-2 px-3 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap w-16">ANDPAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailDeals.length === 0 ? (
                      <tr><td colSpan={12} className="py-8 text-center text-slate-400">データなし</td></tr>
                    ) : detailDeals.map((d, i) => {
                      const hasContract = d.order_date != null
                      const andpadUrl = d.andpad_id ? `https://andpad.jp/manager/my/orders/${d.andpad_id}` : null
                      const hasRelatedContracts = !hasContract && d.contracted_deals && d.contracted_deals.length > 0
                      const cleanStaff = d.staff_name ? d.staff_name.replace(/^\d+:\s*/, '').replace(/\s+/g, '') : '-'
                      const contractAmount = hasContract
                        ? d.order_amount
                        : hasRelatedContracts
                          ? d.contracted_deals!.reduce((sum, c) => sum + (c.order_amount || 0), 0) || null
                          : null
                      return (
                        <tr key={`${d.andpad_id || i}`} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="py-1.5 px-3 text-center text-slate-400 text-xs">{i + 1}</td>
                          <td className="py-1.5 px-3 font-medium text-slate-800 whitespace-nowrap">{d.customer_name || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600 max-w-[250px] truncate">{d.deal_name || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-500 text-xs max-w-[200px] truncate" title={d.customer_address || ''}>{d.customer_address || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600 whitespace-nowrap">{d.deal_category || '-'}</td>
                          <td className="py-1.5 px-3 text-center text-slate-600 whitespace-nowrap">{d.inquiry_date || '-'}</td>
                          <td className="py-1.5 px-3 text-right whitespace-nowrap text-xs">
                            {(() => {
                              const amt = d.contract_amount_ex_tax || d.estimate_amount_ex_tax
                              return amt ? <span className="text-emerald-600 font-medium">¥{amt.toLocaleString()}</span> : <span className="text-slate-300">-</span>
                            })()}
                          </td>
                          <td className="py-1.5 px-3 text-center whitespace-nowrap">
                            {hasContract
                              ? <span className="font-medium" style={{ color: '#c53d43' }}>{d.order_date}</span>
                              : hasRelatedContracts
                                ? <div className="text-xs leading-relaxed" style={{ color: '#c53d43', opacity: 0.7 }} title="別案件で契約">
                                    {d.contracted_deals!.map((c, ci) => (
                                      <div key={ci}>{c.order_date}</div>
                                    ))}
                                  </div>
                                : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-1.5 px-3 text-right whitespace-nowrap text-xs">
                            {contractAmount ? <span style={{ color: '#c53d43' }}>¥{contractAmount.toLocaleString()}</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-1.5 px-3 text-slate-500 whitespace-nowrap text-xs">{d.store_name || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-500 whitespace-nowrap text-xs">{cleanStaff}</td>
                          <td className="py-1.5 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {andpadUrl && (
                                <a href={andpadUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs"
                                  title="反響案件"
                                  onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {hasRelatedContracts && d.contracted_deals!.map((c, ci) => (
                                <a key={ci} href={`https://andpad.jp/manager/my/orders/${c.andpad_id}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs hover:underline"
                                  style={{ color: '#c53d43' }}
                                  title={`契約案件: ${c.deal_name || c.andpad_id}（${c.order_date}）`}
                                  onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ))}
                              {!andpadUrl && !hasRelatedContracts && <span className="text-slate-300">-</span>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {!detailLoading && detailDeals.length > 0 && (() => {
              const totalAmount = detailDeals.reduce((sum, d) => {
                if (d.order_date && d.order_amount) return sum + d.order_amount
                if (!d.order_date && d.contracted_deals) {
                  return sum + d.contracted_deals.reduce((s, c) => s + (c.order_amount || 0), 0)
                }
                return sum
              }, 0)
              return (
                <div className="px-5 py-3 border-t border-slate-200 text-xs text-slate-500">
                  {detailDeals.length}件
                  {totalAmount > 0 && <span className="ml-3">契約金額合計: <span className="font-semibold text-red-600">¥{totalAmount.toLocaleString()}</span></span>}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
