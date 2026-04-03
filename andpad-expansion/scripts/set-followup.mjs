import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vkovflhltggyrgimeabp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE'
)

// 顧客名リスト（スペース・全角数字・注記を整理）
const rawNames = `
酒井新悟
岩下雅哉
佐々木飛翔
三塚賓耶
白澤賢吾
北野茜
杉山和哉
武井純平
中畑恭介
中嶋秀典
梅本まゆみ
羽毛田旭
宮澤一平
大野恭輔
木下貴裕
伊藤拓也
塚原佳紀
宮澤佑輔
関誠
片桐将平
今井裕也
有賀泰介
岩根淳
坂本護
伊藤直希
白鳥和弥
樋口慧
飯島真一
松井佑太
岩原健
藤森広智
平沢大志
堀内勇太郎
林努
吉川和貴
今井聡
桑澤宏則
松下一仁
平谷優雅
山口徹心
矢島照敏
齋藤太郎
高木剛志
赤羽孝之
安江茂樹
吉澤あやの
西村賢太
松本和樹
加藤駿己
伊藤剛史
藤森吉夫
本村衛
相馬雄介
森勝哉
宮坂樹
神近英一
松橋蓮
大杉彬
伊澤明夫
田丸彰寛
北原秀俊
池上淳
戸谷岳人
清水洋
吉川慎太郎
伊澤啓
松井直樹
原佑斗
山岸賢治
尾後貫成美
石田雄太
竹村一樹
岩本陽子
小野和貴子
小野力
徳武勇佑
阿藤諒
小林公貴
大脇友希
宮澤弘明
小榑慎吾
関根悠二
才木涼
藤森拓実
小林開輝
原海渡
玉木哲也
下島雅也
髙橋凌
小田切大
宮坂昂幸
川瀬至道
近藤寛樹
加藤賢一
神尾優子
武田宗一郎
伊沢快
佐藤清和
黒岩秀樹
井上博文
千村拓也
小林真人
菅沼歩
川瀬エマ
臼井凌海
星川
村瀬隆之
阿部育良
水口咲子
梅垣賢司
石川泰
岡本功祐
篠田孝也
末定拓時
須澤誠
小口建一
赤羽和貴
伊藤猛彦
茂木智彦
土田玲央
城田雄祐
山口喬之
伊藤幸栄
長島聡
宮脇和之
前田大輝
柴山大輔
中山育哉
竹澤優
石井天斗
池上由美子
伊藤俊成
出羽澤紫乃
滝澤翔太
安藤元
登内祥太
伊藤優我
小林翔太
山口友輔
根井大輔
平田凱
原直哉
北原由紀野
家高一彰
春日佑太
有賀巧
山浦貫人
両角拓美
竹村港
小林大騎
茅野修一
加藤憲拡
三澤勇
菅沼悟
三浦英希
`.trim().split('\n').map(n => n.trim()).filter(n => n.length > 0)

console.log(`検索対象: ${rawNames.length}名`)

let matched = 0
let notFound = []
let updated = 0

for (const name of rawNames) {
  // customer_nameから検索（全角スペース対応）
  const cleanName = name.replace(/\s+/g, '')
  // 名字と名前に分割して検索用パターン作成
  // DB側は「酒井　新悟」のように全角スペース区切り
  // 検索: 各文字の間に任意のスペースを許容
  const fuzzyPattern = `%${cleanName.split('').join('%')}%`

  let { data } = await supabase.from('deals')
    .select('id,customer_name,contract_amount_ex_tax,followup_active,andpad_id')
    .ilike('customer_name', fuzzyPattern)
    .eq('followup_active', false)
    .limit(10)

  // それでもダメなら名字だけで検索
  if ((!data || data.length === 0) && cleanName.length >= 2) {
    const surname = cleanName.slice(0, 2)
    const { data: data2 } = await supabase.from('deals')
      .select('id,customer_name,contract_amount_ex_tax,followup_active,andpad_id')
      .ilike('customer_name', `${surname}%`)
      .eq('followup_active', false)
      .limit(20)
    // 名前部分でフィルタ
    if (data2 && data2.length > 0) {
      const filtered = data2.filter(d => {
        const dbClean = (d.customer_name || '').replace(/[\s　]+/g, '')
        return dbClean.includes(cleanName) || cleanName.includes(dbClean)
      })
      data = filtered.length > 0 ? filtered : null
    }
  }

  if (!data || data.length === 0) {
    notFound.push(name)
    continue
  }

  matched++

  // 複数候補がある場合は2000万円の契約を優先
  let target = data[0]
  if (data.length > 1) {
    const with2000 = data.find(d => {
      const amt = Number(d.contract_amount_ex_tax) || 0
      return amt >= 19000000 && amt <= 21000000
    })
    if (with2000) {
      target = with2000
    } else {
      // 金額が大きいものを優先
      target = data.sort((a, b) => (Number(b.contract_amount_ex_tax) || 0) - (Number(a.contract_amount_ex_tax) || 0))[0]
    }
    console.log(`  [複数] ${name}: ${data.length}件 → ${target.customer_name} (${Number(target.contract_amount_ex_tax || 0).toLocaleString()}円)`)
  }

  // followup_active = true に更新
  const { error } = await supabase.from('deals')
    .update({ followup_active: true })
    .eq('id', target.id)

  if (error) {
    console.error(`  [エラー] ${name}: ${error.message}`)
  } else {
    updated++
  }
}

console.log(`\n=== 結果 ===`)
console.log(`検索対象: ${rawNames.length}名`)
console.log(`マッチ: ${matched}名`)
console.log(`更新: ${updated}件`)
console.log(`未マッチ: ${notFound.length}名`)
if (notFound.length > 0) {
  console.log(`\n--- 未マッチリスト ---`)
  notFound.forEach(n => console.log(`  ${n}`))
}
