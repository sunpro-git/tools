/**
 * Bulk insert URLs into the database with custom created_at dates.
 * Usage: node scripts/bulk-insert.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read .env
const envPath = resolve(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.replace(/\r/g, '').split('\n')) {
  const match = line.match(/^([^=]+)=(.+)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function detectPlatform(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.includes('note.com') || host.includes('note.mu')) return 'note'
    if (host.includes('twitter.com') || host.includes('x.com')) return 'x'
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'
    return 'other'
  } catch {
    return 'other'
  }
}

// URL list: date|url
const entries = [
  ['2025-12-15', 'https://note.com/4bata/n/nf8fbcb832e91?sub_rt=share_b'],
  ['2025-12-15', 'https://note.com/_aki_39_/n/n1a21e064c259?sub_rt=share_pw'],
  ['2025-12-15', 'https://note.com/141ishii/n/na578fec5ef84'],
  ['2025-12-15', 'https://note.com/gimupop/n/n980e2e6addff?sub_rt=share_pw'],
  ['2025-12-15', 'https://konifar-zatsu.hatenadiary.jp/entry/2021/08/31/203627'],
  ['2025-12-15', 'https://note.com/kgmyshin/n/ndbed1f3496a1'],
  ['2025-12-15', 'https://note.com/1600to72/n/nce44f994e80c'],
  ['2025-12-15', 'https://amix-design.com/tominaga/eyan-theme'],
  ['2025-12-15', 'https://type.jp/et/feature/29020/'],
  ['2025-12-16', 'https://coneinc.jp/corpsiteren/'],
  ['2025-12-16', 'https://note.com/1600to72/n/nce44f994e80c'],
  ['2025-12-16', 'https://zenn.dev/levtech/articles/d724ef8e44fc86'],
  ['2025-12-16', 'https://note.com/sudoakiy/n/nc553aa158a67?sub_rt=share_pw'],
  ['2025-12-16', 'https://note.com/katsutaro/n/n60fec0705593'],
  ['2025-12-18', 'https://note.com/onebookof_mag/n/n2cca1be3fd55'],
  ['2025-12-24', 'https://note.com/sakinotomiura/n/n4e4edeb2c95f'],
  ['2025-12-24', 'https://downloads.ctfassets.net/7mrdlclm9xss/m7XsAz2M3bT8WoDrfmYn3/8ee77c25f48de5dab3b792b428df5495/AI_100tips_slide.pdf'],
  ['2026-02-01', 'https://x.com/toro_minato/status/2017528884963774942?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-01', 'https://x.com/take_404/status/2017779438856114388?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-01', 'https://x.com/kawai_design/status/2017556232249479238?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-02', 'https://x.com/m_imai_cerebrix/status/2017843310082330913?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-02', 'https://x.com/kinoppirx78/status/1744295826007159258'],
  ['2026-02-02', 'https://x.com/genmai_tokyo/status/2018261738794475955?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-03', 'https://x.com/tetumemo/status/2018196555392831586?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/macopeninsutaba/status/2018490368656859643?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/ryo14da/status/2018084197769076841?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/ai_biostat/status/2005779365267923216?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/yusuke_horie/status/2018250750842036597?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/digital_jpn/status/1565178206214586368?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/kojiteshigawara/status/2017828436061061229?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-04', 'https://x.com/w55umqzevgqd7fp/status/2018621143260041437?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-06', 'https://x.com/sxbxzxsx/status/2019311271406178758?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-08', 'https://note.com/mmmiyama/n/n4b6af6ad8b16'],
  ['2026-02-08', 'https://x.com/taichi_we/status/2019969673949798900?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-08', 'https://x.com/ysk_motoyama/status/2018455963863499157?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-08', 'https://x.com/aiyabai1219/status/2020017913324028117?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-09', 'https://x.com/suh_sunaneko/status/2020129695350878650?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-10', 'https://x.com/uemura_hr/status/2021001113554780656?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-11', 'https://x.com/kajikent/status/2021027814678700292?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-14', 'https://x.com/seootaku/status/2021789844289335587?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-14', 'https://x.com/ryo_y0521/status/2022506171845017782?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-16', 'https://togetter.com/li/2663428'],
  ['2026-02-19', 'https://x.com/wanho_book/status/2023870078962614447?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-20', 'https://x.com/osaruproducer/status/2024001436686970926?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-20', 'https://m.youtube.com/shorts/rvXqycpK-8M'],
  ['2026-02-21', 'https://x.com/naoki_gpt/status/2024855303909757303?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-21', 'https://x.com/umino_chibi/status/2025037288208826783?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-21', 'https://x.com/xauxbt/status/2024822664649752977?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-21', 'https://x.com/watanabeeeeee/status/2025133400089395264?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-21', 'https://x.com/fujin_metaverse/status/2025062763803119628?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-21', 'https://note.com/google_gemini/n/n2dd1c6f4ea9e?sub_rt=share_b'],
  ['2026-02-22', 'https://www.opefac.com/'],
  ['2026-02-22', 'https://shirokuro-inc.co.jp/index.html'],
  ['2026-02-22', 'https://uniel.jp/'],
  ['2026-02-22', 'https://draft.co.jp/'],
  ['2026-02-22', 'https://www.barhotel.com/'],
  ['2026-02-22', 'https://x.com/kgsi/status/2024663324982726850?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-22', 'https://x.com/ai_masaou/status/2025137538894381487?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-22', 'https://note.com/daisukewasa/n/nc08c8f69ab8e?sub_rt=share_b'],
  ['2026-02-22', 'https://x.com/viktoroddy/status/2024832374048215404?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-22', 'https://x.com/commte/status/2025405334005973271?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-23', 'https://x.com/daifukujinji/status/2025314693942755469?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-23', 'https://x.com/drmosari/status/2024294874510741767?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-23', 'https://x.com/kannonnka/status/2025330188196655379?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-23', 'https://x.com/daifukujinji/status/2025495785090027614?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-24', 'https://x.com/sem_samurai/status/2025940427539681588?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-24', 'https://x.com/daifukujinji/status/2025677059440202124?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-24', 'https://x.com/ponnuzukai/status/2022264235670339587?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-25', 'https://allis-co.com/allisblog/100082/'],
  ['2026-02-25', 'https://x.com/shin_iwa_utill/status/2026208070007980125?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-25', 'https://x.com/mercarioji/status/2026226693506232356?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
  ['2026-02-25', 'https://x.com/miyachi_riku/status/2026217609277165847?s=46&t=bxrDm3EfkoCT0hR3S1YpZw'],
]

async function main() {
  console.log(`Total entries: ${entries.length}`)

  // Deduplicate by URL (keep first occurrence)
  const seen = new Set()
  const uniqueEntries = []
  for (const [date, url] of entries) {
    if (!seen.has(url)) {
      seen.add(url)
      uniqueEntries.push([date, url])
    } else {
      console.log(`  [DUPLICATE in list] ${url} (keeping first occurrence)`)
    }
  }
  console.log(`Unique entries: ${uniqueEntries.length}`)

  // Fetch all existing URLs from DB
  console.log('\nFetching existing contents from DB...')
  const { data: existing, error: fetchErr } = await supabase
    .from('contents')
    .select('url')

  if (fetchErr) {
    console.error('Failed to fetch existing contents:', fetchErr)
    process.exit(1)
  }

  const existingUrls = new Set((existing || []).map(c => c.url))
  console.log(`Existing contents in DB: ${existingUrls.size}`)

  // Filter out already registered URLs
  const toInsert = uniqueEntries.filter(([, url]) => !existingUrls.has(url))
  const skipped = uniqueEntries.filter(([, url]) => existingUrls.has(url))

  if (skipped.length > 0) {
    console.log(`\nSkipping ${skipped.length} already registered URLs:`)
    for (const [date, url] of skipped) {
      console.log(`  [SKIP] ${date} ${url}`)
    }
  }

  if (toInsert.length === 0) {
    console.log('\nAll URLs are already registered. Nothing to do.')
    return
  }

  console.log(`\nInserting ${toInsert.length} new URLs...`)

  const inserted = []
  const failed = []

  for (const [date, url] of toInsert) {
    const platform = detectPlatform(url)
    const created_at = new Date(`${date}T12:00:00+09:00`).toISOString() // noon JST

    const { data, error } = await supabase
      .from('contents')
      .insert({
        url,
        platform,
        status: 'pending',
        title: null,
        full_text: null,
        summary: null,
        category: null,
        tags: [],
        thumbnail_url: null,
        author: null,
        published_at: null,
        error_message: null,
        created_at,
      })
      .select()
      .single()

    if (error) {
      console.log(`  [FAIL] ${date} ${url} — ${error.message}`)
      failed.push([date, url, error.message])
    } else {
      console.log(`  [OK] ${date} ${platform.padEnd(8)} ${url}`)
      inserted.push(data)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Inserted: ${inserted.length}`)
  console.log(`Failed: ${failed.length}`)
  console.log(`Skipped (already exists): ${skipped.length}`)
  console.log(`Duplicate in list: ${entries.length - uniqueEntries.length}`)

  if (inserted.length === 0) {
    console.log('\nNo new content to process.')
    return
  }

  // Process each inserted content (fetch + AI analysis)
  console.log(`\nProcessing ${inserted.length} new contents (fetch + AI analysis)...`)
  console.log('This may take a while. Processing runs in sequence to avoid rate limits.\n')

  let processOk = 0
  let processFail = 0

  for (const content of inserted) {
    try {
      // Step 1: Fetch content
      const { error: fetchErr } = await supabase.functions.invoke('fetch-content', {
        body: { content_id: content.id },
      })
      if (fetchErr) throw new Error(fetchErr.message || 'fetch-content failed')

      // Step 2: AI analysis
      const { error: analyzeErr } = await supabase.functions.invoke('analyze-content', {
        body: { content_id: content.id },
      })
      if (analyzeErr) {
        console.log(`  [WARN] Analysis failed for ${content.url}: ${analyzeErr.message}`)
      }

      processOk++
      console.log(`  [PROCESSED ${processOk}/${inserted.length}] ${content.url}`)

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      processFail++
      console.log(`  [PROCESS FAIL] ${content.url}: ${err.message}`)

      // Mark as error in DB
      await supabase
        .from('contents')
        .update({ status: 'error', error_message: err.message })
        .eq('id', content.id)
    }
  }

  console.log(`\n--- Processing Summary ---`)
  console.log(`Processed OK: ${processOk}`)
  console.log(`Process failed: ${processFail}`)
  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
