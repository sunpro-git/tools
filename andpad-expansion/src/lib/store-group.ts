// 会社管理アカウント判定: 担当者名（staff_name）に「会社管理」を含む
export function isCompanyManaged(_storeName: string, staffName?: string | null): boolean {
  return /会社管理/.test(staffName || '')
}

// 顧客住所からエリアを判定
export function getAreaFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  // 本社/松本エリア（中信）
  if (/松本市|塩尻市|安曇野市|大町市|麻績村|生坂村|山形村|朝日村|筑北村|池田町|松川村|白馬村|小谷村|木祖村|王滝村|大桑村|上松町|南木曽町|木曽町/.test(address)) return '本社'
  // 長野エリア（北信）
  if (/長野市|須坂市|千曲市|中野市|飯山市|坂城町|小布施町|高山村|山ノ内町|木島平村|野沢温泉村|信濃町|飯綱町|小川村|栄村/.test(address)) return '長野'
  // 上田エリア（東信）
  if (/上田市|東御市|小諸市|佐久市|青木村|長和町|立科町|軽井沢町|御代田町|小海町|佐久穂町|川上村|南牧村|南相木村|北相木村/.test(address)) return '上田'
  // 伊那エリア（南信）
  if (/伊那市|駒ヶ根市|駒ケ根市|飯田市|岡谷市|諏訪市|茅野市|辰野町|箕輪町|飯島町|南箕輪村|中川村|宮田村|松川町|高森町|阿南町|阿智村|平谷村|根羽村|下條村|売木村|天龍村|泰阜村|喬木村|豊丘村|大鹿村|下諏訪町|富士見町|原村/.test(address)) return '伊那'
  return null
}
