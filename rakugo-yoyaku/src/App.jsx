import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import { db, auth, googleProvider } from './firebase'
import { signInWithPopup } from 'firebase/auth'
import './App.css'

const COLLECTION = 'reservations'
const DEFAULT_PASSWORD = 'rakugo1234'
const DEFAULT_FORM_TITLE = '落語で相続 予約フォーム'
const DEFAULT_CAPACITY = 200
const MIN_CAPACITY = 1

const DEFAULT_REFERRAL_SOURCES = ['新聞', 'チラシ', 'ホームページ', 'ご紹介', 'その他']
const DEFAULT_CONCERN_OPTIONS = [
  '相続の基本的な手続き',
  '節税やお金の残し方',
  '家族でもめない方法',
  '家や土地をどうするか',
  'アパートなど土地活用',
  '老後の暮らしとリフォーム',
  'どこに相談したらいいかわからない',
  '特にない',
]
const DEFAULT_CONSULTATION_TYPES = [
  { value: 'same_day', label: '当日の無料相談を希望する（約20分）' },
  { value: 'later', label: '後日の無料相談を希望する（ご希望の時間でゆっくり）' },
  { value: 'none', label: 'いずれも希望しない' },
]

const DEFAULT_CHATWORK_API_TOKEN = '01272590631f16ed47b9789f07d5cf75'
const DEFAULT_CHATWORK_ROOM_ID = '402525982'

const DEFAULT_MESSAGE_TEMPLATES = {
  onNewReservation: '[info][title]{{type}}[/title]\n受付番号: {{no}}\n氏名: {{name}}\nフリガナ: {{furigana}}\n電話番号: {{phone}}\n{{count_line}}{{referral_line}}{{concerns_line}}{{consultation_type_line}}{{consultation_line}}[/info]',
  onNewReservationWithReply: '[To:2301384]井本真人 (めばえ｜090-3558-8950)さん\n[To:2515405]加藤あや(9:00~16:00)さん\n[To:11168792]【新】村越あかりさん\n[To:10163419]岡原 遼太さん\n[info][title]{{type}}（折り返し希望）[/title]\n受付番号: {{no}}\n氏名: {{name}}\nフリガナ: {{furigana}}\n電話番号: {{phone}}\n{{count_line}}{{referral_line}}{{concerns_line}}{{consultation_type_line}}{{consultation_line}}※折り返し連絡希望[/info]',
  onCancel: '[info][title]予約キャンセル[/title]\n氏名: {{name}}\n人数: {{count}}名[/info]',
  onCountChange: '[info][title]人数変更[/title]\n氏名: {{name}}\n変更: {{old_count}}名 → {{new_count}}名[/info]',
  onConsultationUpdate: '[info][title]相談内容更新[/title]\n氏名: {{name}}\n内容: {{consultation}}[/info]',
  onCallback: '[info][title]再入電・要対応[/title]\n受付番号: {{no}}\n氏名: {{name}}\n電話番号: {{phone}}\n※折り返し対応が必要です[/info]',
  onWaitlistConfirm: '[info][title]キャンセル待ち → 予約確定[/title]\n受付番号: {{no}}\n氏名: {{name}}\n電話番号: {{phone}}\n人数: {{count}}名[/info]',
  onStatusChange: '[info][title]対応ステータス変更[/title]\n受付番号: {{no}}\n氏名: {{name}}\nステータス: {{status}}[/info]',
}

const TEMPLATE_VARIABLES = {
  onNewReservation: '{{type}}, {{no}}, {{name}}, {{furigana}}, {{phone}}, {{count_line}}, {{referral_line}}, {{concerns_line}}, {{consultation_type_line}}, {{consultation_line}}',
  onNewReservationWithReply: '{{type}}, {{no}}, {{name}}, {{furigana}}, {{phone}}, {{count_line}}, {{referral_line}}, {{concerns_line}}, {{consultation_type_line}}, {{consultation_line}}',
  onCancel: '{{name}}, {{count}}',
  onCountChange: '{{name}}, {{old_count}}, {{new_count}}',
  onConsultationUpdate: '{{name}}, {{consultation}}',
  onCallback: '{{no}}, {{name}}, {{phone}}',
  onWaitlistConfirm: '{{no}}, {{name}}, {{phone}}, {{count}}',
  onStatusChange: '{{no}}, {{name}}, {{status}}',
}


const sendChatworkNotification = async (message, apiToken, roomId) => {
  if (!apiToken || !roomId) return
  try {
    await fetch(`/api/chatwork/v2/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': apiToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `body=${encodeURIComponent(message)}`,
    })
  } catch (e) {
    console.warn('Chatwork通知の送信に失敗しました:', e)
  }
}


const B = (text, type) => <span className={`m-btn m-btn-${type || 'default'}`}>{text}</span>
const Badge = (text, type) => <span className={`m-badge m-badge-${type || 'default'}`}>{text}</span>

const MANUAL_CATEGORIES = [
  {
    category: '新規登録',
    items: [
      { title: '① 受付種別を選ぶ', body: <><p>フォーム先頭の受付種別から目的に合ったボタンを選択します。</p><div className="m-btn-row">{B('通常予約', 'primary')}{B('キャンセル待ち予約', 'waitlist')}{B('お問合せ', 'inquiry')}</div><p>定員に達している場合は {B('通常予約', 'primary')} が選択できなくなり、自動で {B('キャンセル待ち予約', 'waitlist')} に切り替わります。</p></> },
      { title: '② 氏名・フリガナ・電話番号を入力', body: <><p>{Badge('必須', 'required')} マークの付いた3項目を入力します。</p><ul className="m-list"><li>フリガナ — ひらがなで入力すると自動でカタカナに変換されます</li><li>電話番号 — ハイフンなしでも自動整形されます（例: 09012345678 → 090-1234-5678）</li></ul></> },
      { title: '③ 参加人数を選択', body: <><p>1〜4人のボタンから選択します。5人以上の場合は {B('5人以上', 'default')} を選び、表示される入力欄に具体的な人数を入力します。</p></> },
      { title: '④ 紹介元を選択', body: <><p>この講演を知ったきっかけを選びます。{B('その他', 'default')} を選ぶと自由入力欄が表示されます。</p></> },
      { title: '⑤ お悩みや関心のあることを選択', body: <><p>該当するボタンをタップすると色が変わります。{Badge('複数選択可', 'multi')} もう一度タップで解除できます。</p></> },
      { title: '⑥ 無料相談の希望を選択', body: <><p>以下から1つ選択してください（{Badge('必須', 'required')}）。</p></> },
      { title: '⑦ 相談内容・折り返し連絡', body: <><p>{Badge('任意', 'optional')} 「詳しい相談内容・お問合せ内容」欄に自由入力できます。</p><p>折り返しの連絡は {B('希望する', 'default')}{B('希望しない', 'default')} から選択します。「希望する」を選ぶと、Chatwork通知にTO（担当者メンション）が付きます。</p></> },
      { title: '⑧ 登録する', body: <><p>すべて入力したら {B('予約を登録する', 'submit')} を押して登録完了です。受付種別に応じてボタン名が変わります。</p><p>自動で3桁の受付番号（例: #001）が付与され、Chatworkに通知が送信されます。</p></> },
    ],
  },
  {
    category: '問い合わせ登録',
    items: [
      { title: '① 受付種別で「お問合せ」を選択', body: <><p>フォーム先頭で {B('お問合せ', 'inquiry')} を選択すると、人数・紹介元・お悩み・無料相談の入力欄が非表示になり、簡易登録モードになります。</p></> },
      { title: '② 氏名・フリガナ・電話番号を入力', body: <><p>お問合せモードの {Badge('必須', 'required')} 項目はこの3つだけです。入力漏れがあると登録時にエラーが表示されます。</p></> },
      { title: '③ 相談内容・折り返し連絡', body: <><p>{Badge('任意', 'optional')} 「詳しい相談内容・お問合せ内容」欄にお客様の問い合わせ内容を自由に入力できます。</p><p>折り返しの連絡で {B('希望する', 'default')} を選ぶと、Chatwork通知にTO（担当者メンション）が付きます。</p></> },
      { title: '④ 登録する', body: <><p>{B('お問合せを登録する', 'submit')} で登録完了です。</p></> },
    ],
  },
  {
    category: '予約の変更・キャンセル',
    items: [
      { title: '人数変更', body: <><p>カード下部の {B('人数変更', 'default')} を押すと入力欄が表示されます。</p><p>新しい人数を入力して {B('OK', 'ok')} で確定。{B('取消', 'cancel')} で中止。変更前後の人数は履歴に自動記録されます。</p></> },
      { title: '予約キャンセル', body: <><p>カード下部の {B('予約キャンセル', 'danger')} を押すと確認ダイアログが表示されます。「OK」を押すとキャンセル済みとなり、カードが半透明のグレー表示になります。Chatworkにもキャンセル通知が送られます。</p></> },
      { title: 'キャンセル待ちの予約確定', body: <><p>キャンセル待ちのカードには {B('予約確定', 'ok')} ボタンが表示されます。押すとキャンセル待ちから通常予約に変更され、Chatworkに通知が送信されます。</p></> },
      { title: '対応・相談履歴の追記', body: <><p>カード内の {B('+ 追記', 'add')} ボタンを押すと入力欄が開きます。対応メモを入力して {B('追記保存', 'ok')} で保存。日時付きの履歴として蓄積されます。</p><p>履歴は「対応・相談履歴」の ▼ をクリックして展開・折りたたみできます。</p></> },
    ],
  },
  {
    category: 'ステータス管理',
    items: [
      { title: 'ステータスの見方', body: <><p>「折り返し希望」ありの予約には、現在のステータスがラベルで表示されます。</p><div className="m-status-list"><div className="m-status-row">{Badge('未対応', 'pending')} — 登録直後の状態です</div><div className="m-status-row">{Badge('対応中', 'progress')} — 折り返し対応を開始した状態です</div><div className="m-status-row">{Badge('対応済', 'done')} — 対応が完了した状態です</div><div className="m-status-row">{Badge('再入電対応中', 'callback')} — お客様から再度連絡があり対応中です</div></div></> },
      { title: 'ステータスの変更', body: <><p>ステータスラベルの右にある変更ボタンを押すと切り替わります。</p><div className="m-btn-row">{B('対応中にする', 'default')}{B('対応済にする', 'default')}{B('再入電対応中にする', 'danger')}</div><p>{B('再入電対応中にする', 'danger')} を押すと確認ダイアログが表示され、Chatworkに通知が送信されます。</p><p>現在のステータスのボタンは表示されません（例: 対応中のときは「対応済にする」と「再入電対応中にする」のみ表示）。</p></> },
      { title: '折り返し連絡の通知', body: <><p>登録時に折り返しの連絡で「希望する」を選ぶと、Chatwork通知に自動でTO（担当者メンション）が付きます。カード上部に {Badge('返信希望', 'reply')} バッジが表示されるので見逃しを防げます。</p><p>通知テンプレートは設定画面の「新規予約時（折り返し希望）」で編集できます。</p></> },
    ],
  },
  {
    category: '検索・表示切替',
    items: [
      { title: '予約の検索', body: <><p>予約一覧上部の検索ボックスに氏名・フリガナ・電話番号を入力すると、リアルタイムで絞り込みできます。漢字の表記ゆれ（例: 斎藤／斉藤／齋藤）にも対応しています。</p></> },
      { title: 'カード表示 / テーブル表示', body: <><p>予約一覧ヘッダーの切替ボタンで表示モードを変更できます。</p><ul className="m-list"><li><strong>カード表示</strong> — 各予約の詳細確認・操作に最適</li><li><strong>テーブル表示</strong> — スプレッドシートのように一覧性を重視</li></ul></> },
      { title: 'PDF出力', body: <><p>{B('一覧PDF', 'default')} で全予約の一覧表を、{B('個別PDF', 'default')} で1件ずつの詳細シートを印刷・PDF保存できます。印刷ダイアログで「PDFに保存」を選択してください。</p></> },
    ],
  },
  {
    category: 'ログイン・設定',
    items: [
      { title: 'ログイン方法', body: <><p>ログインは2つの方法があります。</p><ul className="m-list"><li><strong>Googleアカウント</strong> — sunpro36.co.jp のアカウントでログインできます。設定画面へのアクセスが可能です。</li><li><strong>パスワード</strong> — 共通パスワードでログインできます。基本的な操作のみ可能です。</li></ul></> },
      { title: '設定画面（Googleログイン時のみ）', body: <><p>Googleアカウントでログインすると、ヘッダーに {B('設定', 'default')} ボタンが表示されます。設定画面では以下を変更できます。</p><ul className="m-list"><li><strong>基本設定</strong> — フォームタイトル、パスワード</li><li><strong>フォーム項目設定</strong> — きっかけ選択肢、お悩み選択肢、相談希望選択肢</li><li><strong>Chatwork通知設定</strong> — 通知先、通知イベントのON/OFF、メッセージテンプレート</li></ul></> },
      { title: 'ログアウト', body: <><p>ヘッダーの {B('ログアウト', 'default')} ボタンでログアウトできます。</p></> },
    ],
  },
]

const DEFAULT_HELP = MANUAL_CATEGORIES.flatMap((c) => c.items)

const FAQ_CATEGORIES = [
  {
    category: 'セミナー内容・開催情報',
    items: [
      { question: 'セミナーの開催時間は何時から何時までですか？', answer: '受付開始が13:15で、14:00開演・16:00終演の約二時間の講演でございます。希望者のみ終演後相談会を実施しています。途中入場・退出も可能です。' },
      { question: 'セミナーの途中で休憩はありますか？', answer: 'ございます。' },
      { question: '登壇者は誰ですか？', answer: '三遊亭英遊（さんゆうていえいゆう）さんという公認会計士・税理士資格を持つ落語家が主な登壇者です。' },
      { question: 'セミナーの内容を教えてください。', answer: '相続に関するテーマを落語で分かりやすくお伝えする会です。専門家による解説もございます。' },
      { question: '相続の相談もできますか？', answer: '講演終了後、個別の相談会もございます。個別相談のご予約をご希望されますか？→フォームに反映' },
      { question: '何名まで参加できますか？', answer: '何名様でもご参加いただけます。' },
      { question: 'オンライン配信はありますか？', answer: 'ございません。' },
    ],
  },
  {
    category: '会場・アクセス',
    items: [
      { question: '会場の最寄り駅・バス停はどこですか？', answer: '・電車の場合はJR松本駅より徒歩10分です。\n・バスでお越しの場合は停留所「市民芸術館」で下車してください。' },
      { question: '会場までの行き方（電車・バス・自動車）を教えてください。', answer: '上記をご参照ください。' },
      { question: '会場に駐車場はありますか？', answer: '駐車場の用意はございません。公共交通機関や有料駐車場をご利用ください。' },
      { question: '会場にエレベーターはありますか？', answer: 'ございます。' },
      { question: 'バリアフリートイレはありますか？', answer: '館内の各階に多目的トイレ（車椅子対応）が設置されています。' },
      { question: '喫煙できる場所はありますか？', answer: '館内（室内）は全面禁煙ですが、一部屋外に喫煙所が設けられています。' },
      { question: '会場の住所を教えてください。', answer: '長野県松本市深志3丁目10-1' },
      { question: '会場の地図はどこで確認できますか？', answer: "インターネットで『まつもと市民芸術館（しみんげいじゅつかん）』と検索していただき、アクセスのページをご確認ください。" },
    ],
  },
  {
    category: '座席・バリアフリー',
    items: [
      { question: '車椅子席や介添席はありますか？', answer: 'はい。当日会場スタッフへお声がけください。' },
      { question: '座席は自由席ですか？それとも指定席ですか？', answer: '自由席です。' },
      { question: '視覚・聴覚に配慮した座席の案内は可能ですか？', answer: 'はい。当日会場スタッフへお声がけください。' },
      { question: '補助犬を同伴してもよいですか？', answer: 'はい。当日会場スタッフへお声がけください。' },
    ],
  },
  {
    category: '当日の参加・ルール',
    items: [
      { question: 'セミナーの途中で入退場はできますか？', answer: '可能です。' },
      { question: '会場内で飲食はできますか？', answer: '水分補給は問題ございませんが、お食事につきましては、客席・ロビーともにご遠慮いただいております。' },
      { question: '録音や写真・動画の撮影は可能ですか？', answer: 'あいにく、撮影や録音はすべてご遠慮いただいております。' },
      { question: '当日の持ち物はありますか？', answer: '特にございません。' },
      { question: '受付は何分前から開始しますか？', answer: '45分前（13：15）より開始します。' },
      { question: '受付はどこで行いますか？', answer: '会場2Fホールです。当日スタッフがご案内します。' },
      { question: '何分前までに来場すればよいですか？', answer: '14時開演でございます。' },
    ],
  },
  {
    category: '予約・変更・キャンセル',
    items: [
      { question: '予約内容はどのように確認できますか？', answer: 'お電話でのご予約となりますので、確認メールや書類などの発行はございません。' },
      { question: '当日予約はできますか？', answer: '当日は満席が予想されますので、事前予約をおすすめしております。' },
      { question: '予約をキャンセルできますか？', answer: '可能です。→お名前or電話番号をお伺いしてフォームに入力してください。' },
      { question: '参加人数を変更できますか？', answer: 'はい、お電話にてお申し付けください。' },
      { question: '代理で参加することはできますか？', answer: 'はい、可能です。' },
      { question: '満席の場合、キャンセル待ちはできますか？', answer: 'はい、キャンセル待ちとしてお受けいたします。' },
    ],
  },
  {
    category: '個人情報・連絡',
    items: [
      { question: '申込時の個人情報は何に使用されますか？', answer: '今回のご予約のお手続きに使用させていただくほか、今後おすすめのイベントのご案内等を、お電話で差し上げる場合がございます。' },
      { question: '電話番号を伝えた場合、営業電話などはかかってきますか？', answer: 'ご予約の確認やイベントのご案内以外の目的ではご連絡いたしません。' },
      { question: '確認メールが届かない場合はどうすればよいですか？', answer: 'お電話でのご予約のため、確認メールの送付はございません。' },
      { question: '問い合わせ先はどこですか？', answer: '本イベントの主催は株式会社サンプロでございます。' },
    ],
  },
]

const DEFAULT_FAQ = FAQ_CATEGORIES.flatMap((c) => c.items)

/** 全角数字→半角、全角ハイフン→半角、非数字除去して電話番号を整形 */
const formatPhoneNumber = (raw) => {
  const digits = raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^\d]/g, '')

  if (digits.length === 11) {
    if (/^0[5789]0/.test(digits))
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    if (/^0800/.test(digits))
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    if (/^0120/.test(digits))
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
    if (/^0[36]/.test(digits))
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

/** 異体字検索漢字リスト（PDF準拠）: 異体字→正字 の正規化マップ */
const KANJI_VARIANTS = {
  // ア行
  '亞': '亜', '惡': '悪', '菴': '庵', '爲': '為', '壹': '壱',
  '隱': '隠', '鹽': '塩', '緣': '縁', '渕': '淵', '渊': '淵',
  '榮': '栄', '衞': '衛', '頴': '穎', '悅': '悦', '圓': '円',
  '櫻': '桜', '應': '応', '橫': '横', '歐': '欧', '鶯': '鴬',
  '奧': '奥',
  // カ行
  '假': '仮', '會': '会', '繪': '絵', '檜': '桧', '靏': '鶴',
  '覺': '覚', '攪': '撹', '樂': '楽', '學': '学', '斈': '学',
  '閒': '間', '寬': '寛', '關': '関', '舘': '館', '卷': '巻',
  '顏': '顔', '巖': '巌', '歸': '帰', '龜': '亀', '氣': '気',
  '憙': '喜', '煕': '熙', '熈': '熙', '經': '経', '繼': '継',
  '溪': '渓', '谿': '渓', '螢': '蛍', '縣': '県',
  '劍': '剣', '劔': '剣', '劒': '剣',
  '顯': '顕', '獻': '献', '權': '権', '藝': '芸', '嚴': '厳',
  '恆': '恒', '廣': '広', '髙': '高', '畊': '耕', '鑛': '鉱',
  '鈎': '鉤', '壺': '壷', '號': '号', '國': '国', '圀': '国',
  '黑': '黒',
  // サ行
  '齊': '斉', '斎': '斉', '齋': '斉',
  '﨑': '崎', '嵜': '崎', '碕': '崎',
  '實': '実', '坐': '座', '雜': '雑', '棧': '桟', '兒': '児',
  '舍': '舎', '釋': '釈', '壽': '寿', '收': '収', '從': '従',
  '澁': '渋', '澀': '渋', '肅': '粛', '處': '処', '敍': '叙', '敘': '叙',
  '枩': '松', '將': '将', '筱': '篠', '燒': '焼',
  '奬': '奨', '獎': '奨', '條': '条', '乘': '乗', '塲': '場',
  '讓': '譲', '繩': '縄', '淨': '浄', '穰': '穣', '觸': '触',
  '眞': '真', '寢': '寝', '愼': '慎', '槇': '槙', '晉': '晋',
  '圖': '図', '廚': '厨', '埀': '垂', '穗': '穂', '數': '数',
  '淸': '清', '靑': '青', '靜': '静', '聲': '声', '攝': '摂',
  '舩': '船', '淺': '浅', '專': '専', '錢': '銭', '戰': '戦',
  '禪': '禅', '蘓': '蘇', '莊': '荘', '藪': '薮', '籔': '薮',
  '艸': '草', '總': '総', '聰': '聡', '壯': '壮', '裝': '装',
  '竈': '竃', '藏': '蔵', '屬': '属', '邨': '村',
  // タ行
  '夛': '多', '帶': '帯', '臺': '台', '對': '対',
  '躰': '体', '軆': '体', '體': '体', '瀧': '滝', '澤': '沢',
  '逹': '達', '單': '単', '彈': '弾', '團': '団',
  '遲': '遅', '晝': '昼', '鐵': '鉄', '鐡': '鉄', '傳': '伝',
  '嶋': '島', '嶌': '島', '當': '当', '稻': '稲', '垰': '峠',
  '德': '徳', '獨': '独', '讀': '読', '杤': '栃',
  // ナ行
  '弍': '弐', '貳': '弐', '貮': '弐',
  // ハ行
  '禰': '祢', '發': '発', '拔': '抜', '霸': '覇', '盃': '杯',
  '拜': '拝', '栢': '柏', '麥': '麦', '彌': '弥',
  '濵': '浜', '濱': '浜', '冨': '富', '釡': '釜', '凬': '風',
  '佛': '仏', '邊': '辺', '邉': '辺', '峯': '峰', '豐': '豊',
  '萠': '萌', '鋪': '舗', '舖': '舗', '寶': '宝', '寳': '宝',
  '萬': '万', '滿': '満', '默': '黙',
  // ヤ行
  '藥': '薬', '與': '与', '譽': '誉', '豫': '予',
  '謠': '謡', '遙': '遥', '瑤': '瑶', '來': '来', '徠': '来',
  '賴': '頼', '栁': '柳', '畄': '留',
  // ラ行
  '龍': '竜', '凉': '涼', '綠': '緑', '蘆': '芦', '樓': '楼',
  '禮': '礼', '齡': '齢', '蠣': '蛎', '勞': '労', '籠': '篭',
  '祿': '禄',
  // その他
  '𠮷': '吉', '堯': '尭', '曉': '暁', '薰': '薫', '勳': '勲',
  '惠': '恵', '鷄': '鶏', '敎': '教', '鄕': '郷', '舊': '旧',
  '敕': '勅', '鎭': '鎮', '廸': '迪', '濟': '済',
}
const variantRe = new RegExp(`[${Object.keys(KANJI_VARIANTS).join('')}]`, 'g')

/** 検索用にカタカナ→ひらがな・全角→半角・異体字を正規化 */
const normalizeForSearch = (str) =>
  str
    .toLowerCase()
    .replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(variantRe, (c) => KANJI_VARIANTS[c] || c)

function HelpEditor({ sections, onSave, onCancel }) {
  const [draft, setDraft] = useState(sections.map((s) => ({ ...s })))
  const update = (i, key, val) => setDraft((d) => d.map((s, j) => (j === i ? { ...s, [key]: val } : s)))
  const add = () => setDraft((d) => [...d, { title: '', body: '' }])
  const remove = (i) => setDraft((d) => d.filter((_, j) => j !== i))
  return (
    <div className="content-editor">
      {draft.map((s, i) => (
        <div className="editor-item" key={i}>
          <div className="editor-item-header">
            <span className="editor-item-num">{i + 1}</span>
            <button type="button" className="editor-remove" onClick={() => remove(i)}>削除</button>
          </div>
          <input className="editor-input" placeholder="タイトル" value={s.title} onChange={(e) => update(i, 'title', e.target.value)} />
          <textarea className="editor-textarea" rows={3} placeholder="内容" value={s.body} onChange={(e) => update(i, 'body', e.target.value)} />
        </div>
      ))}
      <button type="button" className="editor-add" onClick={add}>+ 項目を追加</button>
      <div className="editor-actions">
        <button type="button" className="editor-save" onClick={() => onSave(draft.filter((s) => s.title.trim() || s.body.trim()))}>保存</button>
        <button type="button" className="editor-cancel" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

function FaqEditor({ items, onSave, onCancel }) {
  const [draft, setDraft] = useState(items.map((f) => ({ ...f })))
  const update = (i, key, val) => setDraft((d) => d.map((f, j) => (j === i ? { ...f, [key]: val } : f)))
  const add = () => setDraft((d) => [...d, { question: '', answer: '' }])
  const remove = (i) => setDraft((d) => d.filter((_, j) => j !== i))
  return (
    <div className="content-editor">
      {draft.map((f, i) => (
        <div className="editor-item" key={i}>
          <div className="editor-item-header">
            <span className="editor-item-num">Q{i + 1}</span>
            <button type="button" className="editor-remove" onClick={() => remove(i)}>削除</button>
          </div>
          <input className="editor-input" placeholder="質問" value={f.question} onChange={(e) => update(i, 'question', e.target.value)} />
          <textarea className="editor-textarea" rows={3} placeholder="回答" value={f.answer} onChange={(e) => update(i, 'answer', e.target.value)} />
        </div>
      ))}
      <button type="button" className="editor-add" onClick={add}>+ 質問を追加</button>
      <div className="editor-actions">
        <button type="button" className="editor-save" onClick={() => onSave(draft.filter((f) => f.question.trim() || f.answer.trim()))}>保存</button>
        <button type="button" className="editor-cancel" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('admin') === 'true' || sessionStorage.getItem('authed') === '1'
  })
  const [isGoogleAuth, setIsGoogleAuth] = useState(() => sessionStorage.getItem('authMethod') === 'google')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [form, setForm] = useState({
    name: '', furigana: '', phone: '', count: '', customCount: '',
    referralSource: '', referralSourceOther: '',
    concerns: [], concernOther: '',
    consultationType: '',
    consultation: '', wantsReply: false, reservationType: 'normal',
  })
  const [showCustomCount, setShowCustomCount] = useState(false)
  const [reservations, setReservations] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCountId, setEditingCountId] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [newCount, setNewCount] = useState('')
  const [helpSections, setHelpSections] = useState(DEFAULT_HELP)
  const [faqItems, setFaqItems] = useState(DEFAULT_FAQ)
  const [editingHelp, setEditingHelp] = useState(false)
  const [manualTab, setManualTab] = useState(0)
  const [editingFaq, setEditingFaq] = useState(false)
  const [faqTab, setFaqTab] = useState(0)
  const [faqSearch, setFaqSearch] = useState('')
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState('')
  const [editingConsultationId, setEditingConsultationId] = useState(null)
  const [newConsultation, setNewConsultation] = useState('')
  const [formTitle, setFormTitle] = useState(DEFAULT_FORM_TITLE)
  const [appPassword, setAppPassword] = useState(DEFAULT_PASSWORD)
  const [referralSources, setReferralSources] = useState(DEFAULT_REFERRAL_SOURCES)
  const [concernOptions, setConcernOptions] = useState(DEFAULT_CONCERN_OPTIONS)
  const [consultationTypes, setConsultationTypes] = useState(DEFAULT_CONSULTATION_TYPES)
  const [notifySettings, setNotifySettings] = useState({
    onNewReservation: true,
    onNewReservationWithReply: true,
    onCancel: true,
    onCountChange: false,
    onConsultationUpdate: false,
    onCallback: true,
    onWaitlistConfirm: true,
    onStatusChange: false,
  })
  const [chatworkApiToken, setChatworkApiToken] = useState(DEFAULT_CHATWORK_API_TOKEN)
  const [chatworkRoomId, setChatworkRoomId] = useState(DEFAULT_CHATWORK_ROOM_ID)
  const [messageTemplates, setMessageTemplates] = useState({ ...DEFAULT_MESSAGE_TEMPLATES })
  const [showNotifySettings, setShowNotifySettings] = useState(false)

  const [viewMode, setViewMode] = useState('card')
  const [expandedCards, setExpandedCards] = useState({})

  const toggleCardSection = (cardId, section) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], [section]: !prev[cardId]?.[section] }
    }))
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === appPassword) {
      sessionStorage.setItem('authed', '1')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('パスワードが正しくありません')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email || ''
      if (email.endsWith('@sunpro36.co.jp')) {
        sessionStorage.setItem('authed', '1')
        sessionStorage.setItem('authMethod', 'google')
        setAuthed(true)
        setIsGoogleAuth(true)
        setPwError('')
      } else {
        setPwError('sunpro36.co.jp のアカウントでログインしてください')
        await auth.signOut()
      }
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setPwError('Googleログインに失敗しました')
      }
    }
  }

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setReservations(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const loadContent = async () => {
      // localStorageからフォールバック読み込み
      try {
        const local = JSON.parse(localStorage.getItem('rakugo_settings') || '{}')
        if (local.notifySettings) setNotifySettings((prev) => ({ ...prev, ...local.notifySettings }))
        if (local.chatworkApiToken) setChatworkApiToken(local.chatworkApiToken)
        if (local.chatworkRoomId) setChatworkRoomId(local.chatworkRoomId)
        if (local.messageTemplates) setMessageTemplates((prev) => ({ ...prev, ...local.messageTemplates }))
        if (local.formTitle) setFormTitle(local.formTitle)
        if (local.appPassword) setAppPassword(local.appPassword)
        if (local.referralSources) setReferralSources(local.referralSources)
        if (local.concernOptions) setConcernOptions(local.concernOptions)
        if (local.consultationTypes) setConsultationTypes(local.consultationTypes)
      } catch (e) { /* ignore parse error */ }
      // Firestoreから読み込み（成功すれば上書き）
      try {
        const snap = await getDoc(doc(db, 'settings', 'content'))
        if (snap.exists()) {
          const data = snap.data()
          if (data.helpSections) setHelpSections(data.helpSections)
          if (data.faqItems) setFaqItems(data.faqItems)
          if (data.capacity) setCapacity(Math.max(data.capacity, MIN_CAPACITY))
          if (data.notifySettings) setNotifySettings((prev) => ({ ...prev, ...data.notifySettings }))
          if (data.chatworkApiToken) setChatworkApiToken(data.chatworkApiToken)
          if (data.chatworkRoomId) setChatworkRoomId(data.chatworkRoomId)
          if (data.messageTemplates) setMessageTemplates((prev) => ({ ...prev, ...data.messageTemplates }))
          if (data.formTitle) setFormTitle(data.formTitle)
          if (data.appPassword) setAppPassword(data.appPassword)
          if (data.referralSources) setReferralSources(data.referralSources)
          if (data.concernOptions) setConcernOptions(data.concernOptions)
          if (data.consultationTypes) setConsultationTypes(data.consultationTypes)
        }
      } catch (e) { /* Firestore unavailable, using localStorage fallback */ }
    }
    loadContent()
  }, [])

  const saveHelp = async (sections) => {
    setHelpSections(sections)
    try { await setDoc(doc(db, 'settings', 'content'), { helpSections: sections, faqItems }, { merge: true }) } catch (e) { /* ignore */ }
    setEditingHelp(false)
  }

  const saveFaq = async (items) => {
    setFaqItems(items)
    try { await setDoc(doc(db, 'settings', 'content'), { helpSections, faqItems: items }, { merge: true }) } catch (e) { /* ignore */ }
    setEditingFaq(false)
  }

  const saveToLocal = (partial) => {
    try {
      const current = JSON.parse(localStorage.getItem('rakugo_settings') || '{}')
      localStorage.setItem('rakugo_settings', JSON.stringify({ ...current, ...partial }))
    } catch (e) { /* ignore */ }
  }

  const saveNotifySettings = async (updated) => {
    setNotifySettings(updated)
    saveToLocal({ notifySettings: updated })
    try { await setDoc(doc(db, 'settings', 'content'), { notifySettings: updated }, { merge: true }) } catch (e) { /* ignore */ }
  }

  const saveChatworkConfig = async (token, roomId) => {
    setChatworkApiToken(token)
    setChatworkRoomId(roomId)
    saveToLocal({ chatworkApiToken: token, chatworkRoomId: roomId })
    try { await setDoc(doc(db, 'settings', 'content'), { chatworkApiToken: token, chatworkRoomId: roomId }, { merge: true }) } catch (e) { /* ignore */ }
  }

  const saveMessageTemplate = async (key, value) => {
    const updated = { ...messageTemplates, [key]: value }
    setMessageTemplates(updated)
    saveToLocal({ messageTemplates: updated })
    try { await setDoc(doc(db, 'settings', 'content'), { messageTemplates: updated }, { merge: true }) } catch (e) { /* ignore */ }
  }

  const saveSetting = async (key, value) => {
    saveToLocal({ [key]: value })
    try { await setDoc(doc(db, 'settings', 'content'), { [key]: value }, { merge: true }) } catch (e) { /* ignore */ }
  }

  const getCount = () => {
    if (showCustomCount) return Number(form.customCount) || 0
    return Number(form.count) || 0
  }

  const validate = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = '氏名を入力してください'
    if (!form.furigana.trim()) newErrors.furigana = 'フリガナを入力してください'
    if (!form.phone.trim()) newErrors.phone = '電話番号を入力してください'
    // お問合せの場合は氏名・フリガナ・電話番号のみ必須
    if (form.reservationType !== 'inquiry') {
      const count = getCount()
      if (!count || count < 1) newErrors.count = '人数を選択してください'
      if (!form.referralSource) newErrors.referralSource = 'きっかけを選択してください'
      if (form.referralSource === 'その他' && !form.referralSourceOther.trim()) newErrors.referralSourceOther = '内容を入力してください'
      if (form.concerns.length === 0) newErrors.concerns = 'お悩みを1つ以上選択してください'
      if (!form.consultationType) newErrors.consultationType = '無料相談の希望を選択してください'
    }
    return newErrors
  }

  const selectCount = (n) => {
    setShowCustomCount(false)
    setForm((prev) => ({ ...prev, count: String(n), customCount: '' }))
    setErrors((prev) => ({ ...prev, count: '' }))
  }

  const selectCustom = () => {
    setShowCustomCount(true)
    setForm((prev) => ({ ...prev, count: '', customCount: '' }))
    setErrors((prev) => ({ ...prev, count: '' }))
  }

  const toKatakana = (str) => str.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
  const [isComposing, setIsComposing] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleFuriganaCompositionEnd = (e) => {
    setIsComposing(false)
    const converted = toKatakana(e.target.value)
    setForm((prev) => ({ ...prev, furigana: converted }))
  }

  const generateReservationNumber = () => {
    // 3桁番号のみを対象に最大番号を取得して連番を振る（旧4桁・T付き番号は無視）
    let maxNum = 0
    reservations.forEach((r) => {
      if (r.reservationNo && /^\d{1,3}$/.test(r.reservationNo)) {
        const num = parseInt(r.reservationNo, 10)
        if (!isNaN(num) && num <= 999 && num > maxNum) maxNum = num
      }
    })
    return String(maxNum + 1).padStart(3, '0')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    try {
    const formattedPhone = formatPhoneNumber(form.phone.trim())
    const isWaitlist = form.reservationType === 'waitlist' || isOverCapacity
    const count = form.reservationType === 'inquiry' ? 0 : getCount()
    const referralText = form.referralSource === 'その他' ? `その他: ${form.referralSourceOther.trim()}` : form.referralSource
    const consultationTypeLabel = consultationTypes.find((c) => c.value === form.consultationType)?.label || ''
    const reservationNo = generateReservationNumber()
    await addDoc(collection(db, COLLECTION), {
      reservationNo,
      name: form.name.trim(),
      furigana: form.furigana.trim(),
      phone: formattedPhone,
      count,
      referralSource: referralText,
      concerns: form.concerns,
      concernOther: form.concernOther.trim(),
      consultationType: form.consultationType,
      consultationTypeLabel,
      consultation: form.consultation.trim(),
      consultationLogs: form.consultation.trim() ? [{ text: form.consultation.trim(), createdAt: Timestamp.now() }] : [],
      wantsReply: form.wantsReply,
      contactStatus: '',
      waitlist: isWaitlist,
      inquiryOnly: form.reservationType === 'inquiry',
      status: 'active',
      history: [],
      createdAt: serverTimestamp(),
    })
    {
      const type = form.reservationType === 'inquiry' ? '問い合わせ' : isWaitlist ? '新規予約（キャンセル待ち）' : '新規予約'
      const templateKey = form.wantsReply ? 'onNewReservationWithReply' : 'onNewReservation'
      if (notifySettings[templateKey]) {
        const msg = messageTemplates[templateKey]
          .replace('{{type}}', type)
          .replace('{{no}}', reservationNo)
          .replace('{{name}}', form.name.trim())
          .replace('{{furigana}}', form.furigana.trim())
          .replace('{{phone}}', formattedPhone)
          .replace('{{count_line}}', form.reservationType === 'inquiry' ? '' : `人数: ${count}名\n`)
          .replace('{{referral_line}}', `きっかけ: ${referralText}\n`)
          .replace('{{concerns_line}}', form.concerns.length > 0 ? `お悩み: ${form.concerns.join('、')}\n` : '')
          .replace('{{consultation_type_line}}', form.consultationType ? `無料相談: ${consultationTypeLabel}\n` : '')
          .replace('{{consultation_line}}', form.consultation.trim() ? `相談内容: ${form.consultation.trim()}\n` : '')
        sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
      }
    }
    setForm({
      name: '', furigana: '', phone: '', count: '', customCount: '',
      referralSource: '', referralSourceOther: '',
      concerns: [], concernOther: '', consultationType: '',
      consultation: '', wantsReply: false, reservationType: 'normal',
    })
    setShowCustomCount(false)
    } catch (err) {
      console.error('登録エラー:', err)
      alert('登録に失敗しました: ' + err.message)
    }
  }

  const handleCancel = async (r) => {
    if (!window.confirm(`${r.name} さんの予約をキャンセルしますか？`)) return
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, {
      status: 'cancelled',
      history: arrayUnion({
        type: 'cancel',
        before: { status: 'active' },
        after: { status: 'cancelled' },
        changedAt: Timestamp.now(),
      }),
    })
    if (notifySettings.onCancel) {
      const msg = messageTemplates.onCancel
        .replace('{{name}}', r.name)
        .replace('{{count}}', r.count)
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
  }

  const handleConfirmWaitlist = async (r) => {
    if (!window.confirm(`${r.name} さんをキャンセル待ちから予約確定にしますか？`)) return
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, {
      waitlist: false,
      history: arrayUnion({
        type: 'waitlist_confirm',
        before: { waitlist: true },
        after: { waitlist: false },
        changedAt: Timestamp.now(),
      }),
    })
    if (notifySettings.onWaitlistConfirm) {
      const msg = messageTemplates.onWaitlistConfirm
        .replace('{{no}}', r.reservationNo || '-')
        .replace('{{name}}', r.name)
        .replace('{{phone}}', r.phone || '-')
        .replace('{{count}}', r.count || '-')
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
  }

  const startEditCount = (r) => {
    setEditingCountId(r.id)
    setNewCount(String(r.count))
  }

  const cancelEditCount = () => {
    setEditingCountId(null)
    setNewCount('')
  }

  const submitEditCount = async (r) => {
    const parsed = Number(newCount)
    if (!parsed || parsed < 1) return
    if (parsed === r.count) {
      cancelEditCount()
      return
    }
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, {
      count: parsed,
      history: arrayUnion({
        type: 'count_change',
        before: { count: r.count },
        after: { count: parsed },
        changedAt: Timestamp.now(),
      }),
    })
    if (notifySettings.onCountChange) {
      const msg = messageTemplates.onCountChange
        .replace('{{name}}', r.name)
        .replace('{{old_count}}', r.count)
        .replace('{{new_count}}', parsed)
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
    setEditingCountId(null)
    setNewCount('')
  }

  const STATUS_LABELS = { in_progress: '対応中', done: '対応済', needs_action: '再入電対応中' }
  const updateContactStatus = async (r, status) => {
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, { contactStatus: status })
    if (notifySettings.onStatusChange) {
      const msg = messageTemplates.onStatusChange
        .replace('{{no}}', r.reservationNo || '-')
        .replace('{{name}}', r.name)
        .replace('{{status}}', STATUS_LABELS[status] || status)
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
  }

  const handleCallback = async (r) => {
    if (!window.confirm(`${r.name} さんの再入電通知を送信しますか？`)) return
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, {
      contactStatus: 'needs_action',
      history: arrayUnion({
        type: 'callback',
        detail: '再入電あり・要対応',
        changedAt: Timestamp.now(),
      }),
    })
    // 通知送信
    if (notifySettings.onCallback) {
      const msg = messageTemplates.onCallback
        .replace('{{no}}', r.reservationNo || '-')
        .replace('{{name}}', r.name)
        .replace('{{phone}}', r.phone || '')
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
  }

  const startEditCapacity = () => {
    setNewCapacity(String(capacity))
    setEditingCapacity(true)
  }

  const submitEditCapacity = async () => {
    const parsed = Number(newCapacity)
    if (!parsed || parsed < MIN_CAPACITY) {
      alert(`定員は${MIN_CAPACITY}名以上で設定してください`)
      return
    }
    setCapacity(parsed)
    setEditingCapacity(false)
    try { await setDoc(doc(db, 'settings', 'content'), { capacity: parsed }, { merge: true }) } catch (e) { /* ignore */ }
  }

  const startEditConsultation = (r) => {
    setEditingConsultationId(r.id)
    setNewConsultation(r.consultation || '')
  }

  const cancelEditConsultation = () => {
    setEditingConsultationId(null)
    setNewConsultation('')
  }

  const submitEditConsultation = async (r) => {
    if (!newConsultation.trim()) return
    const ref = doc(db, COLLECTION, r.id)
    const newLog = { text: newConsultation.trim(), createdAt: Timestamp.now() }
    await updateDoc(ref, {
      consultation: newConsultation.trim(),
      consultationLogs: arrayUnion(newLog),
    })
    if (notifySettings.onConsultationUpdate) {
      const msg = messageTemplates.onConsultationUpdate
        .replace('{{name}}', r.name)
        .replace('{{consultation}}', newConsultation.trim())
      sendChatworkNotification(msg, chatworkApiToken, chatworkRoomId)
    }
    setEditingConsultationId(null)
    setNewConsultation('')
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    return ts.toDate().toLocaleString('ja-JP')
  }

  const openPdfWindow = (html) => {
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const today = () => new Date().toLocaleDateString('ja-JP').replace(/\//g, '')

  const printList = () => {
    const data = filtered.length > 0 ? filtered : reservations
    const rows = data.map((r) => `<tr>
      <td>${r.reservationNo || '-'}</td><td>${r.name}</td><td>${r.furigana || ''}</td>
      <td>${r.phone || ''}</td><td style="text-align:center">${r.inquiryOnly ? '-' : r.count}</td>
      <td>${r.referralSource || ''}</td><td style="white-space:normal;max-width:120px">${(r.concerns || []).join('、')}${r.concernOther ? '（' + r.concernOther + '）' : ''}</td>
      <td>${r.consultationTypeLabel || ''}</td><td style="white-space:normal;max-width:150px">${r.consultation || ''}</td>
      <td style="text-align:center">${r.wantsReply ? (r.contactStatus === 'done' ? '済' : r.contactStatus === 'in_progress' ? '対応中' : '希望') : ''}</td>
      <td style="text-align:center">${r.status === 'cancelled' ? 'キャンセル' : r.waitlist ? '待ち' : '確定'}</td>
      <td style="font-size:10px">${r.createdAt ? r.createdAt.toDate().toLocaleString('ja-JP') : ''}</td>
    </tr>`).join('')
    openPdfWindow(`<html><head><title>予約一覧_${today()}</title><style>
      @page { size: A3 landscape; margin: 10mm; }
      body { font-family: 'Noto Sans JP', sans-serif; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-banner { background: #5c3317; color: #fff; text-align: center; padding: 8px; font-size: 13px; margin-bottom: 12px; border-radius: 4px; }
      @media print { .pdf-banner { display: none; } }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 5px 6px; }
      th { background: #5c3317; color: #fff; font-size: 10px; white-space: nowrap; }
      tr:nth-child(even) { background: #f5f5f5; }
    </style></head><body>
      <div class="pdf-banner">印刷ダイアログで「PDFに保存」を選択してください</div>
      <h2 style="text-align:center;color:#5c3317;margin:0 0 8px">予約一覧（${data.length}件）</h2>
      <table><thead><tr><th>受付No.</th><th>氏名</th><th>フリガナ</th><th>電話番号</th><th>人数</th><th>きっかけ</th><th>お悩み</th><th>無料相談</th><th>相談内容</th><th>返信</th><th>状態</th><th>予約日時</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`)
  }

  const printIndividual = () => {
    const data = filtered.length > 0 ? filtered : reservations
    const pages = data.map((r) => `
      <div style="page-break-after: always; padding: 20px;">
        <h2 style="color:#5c3317; border-bottom: 2px solid #5c3317; padding-bottom: 8px; margin-top: 0;">
          受付番号: ${r.reservationNo || '-'}　${r.name}
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr><th style="width:140px;text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">フリガナ</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.furigana || ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">電話番号</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.phone || ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">参加人数</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.inquiryOnly ? '問合せのみ' : r.count + '名'}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">きっかけ</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.referralSource || ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">お悩み</th><td style="padding:10px;border-bottom:1px solid #ddd">${(r.concerns || []).join('、')}${r.concernOther ? '（' + r.concernOther + '）' : ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">無料相談</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.consultationTypeLabel || ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">相談内容</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.consultation || ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">返信希望</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.wantsReply ? '希望あり' : 'なし'}${r.contactStatus === 'done' ? '（対応済み）' : r.contactStatus === 'in_progress' ? '（対応中）' : ''}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">状態</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.status === 'cancelled' ? 'キャンセル' : r.waitlist ? 'キャンセル待ち' : '確定'}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;color:#5c3317;background:#faf6f0">予約日時</th><td style="padding:10px;border-bottom:1px solid #ddd">${r.createdAt ? r.createdAt.toDate().toLocaleString('ja-JP') : ''}</td></tr>
        </table>
        ${(r.consultationLogs && r.consultationLogs.length > 0) ? '<h3 style="margin-top:16px;color:#5c3317">対応履歴</h3><ul style="list-style:none;padding:0">' + r.consultationLogs.map(l => '<li style="padding:6px 0;border-bottom:1px dotted #ddd"><span style="color:#888;font-size:11px">' + (l.createdAt ? l.createdAt.toDate().toLocaleString('ja-JP') : '') + '</span> ' + l.text + '</li>').join('') + '</ul>' : ''}
      </div>
    `).join('')
    openPdfWindow(`<html><head><title>予約個別_${today()}</title><style>
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Noto Sans JP', sans-serif; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-banner { background: #5c3317; color: #fff; text-align: center; padding: 8px; font-size: 13px; margin-bottom: 12px; border-radius: 4px; }
      @media print { .pdf-banner { display: none; } }
    </style></head><body>
      <div class="pdf-banner">印刷ダイアログで「PDFに保存」を選択してください</div>
      ${pages}
    </body></html>`)
  }

  const activeReservations = reservations.filter((r) => r.status !== 'cancelled')
  const totalCount = activeReservations.reduce((sum, r) => sum + (r.count || 0), 0)
  const waitlistCount = activeReservations.filter((r) => r.waitlist).reduce((sum, r) => sum + (r.count || 0), 0)
  const isOverCapacity = totalCount >= capacity

  useEffect(() => {
    if (isOverCapacity) {
      setForm((prev) => prev.reservationType === 'normal' ? { ...prev, reservationType: 'waitlist' } : prev)
    }
  }, [isOverCapacity])

  const filtered = reservations.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = normalizeForSearch(searchQuery)
    return (
      normalizeForSearch(r.name).includes(q) ||
      normalizeForSearch(r.furigana || '').includes(q) ||
      normalizeForSearch(r.phone || '').includes(q) ||
      normalizeForSearch(r.consultation).includes(q) ||
      (r.status === 'cancelled' && normalizeForSearch('キャンセル').includes(q))
    )
  })

  if (!authed) {
    return (
      <div className="container">
        <h1 className="title">{formTitle}</h1>
        <div className="login-form">
          <button type="button" className="google-login-btn" onClick={handleGoogleLogin}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleアカウントでログイン
          </button>
          <div className="login-divider"><span>または</span></div>
          <form onSubmit={handleLogin}>
            <label className="login-label" htmlFor="password">パスワードを入力してください</label>
            <div className="login-input-row">
              <input
                id="password"
                type="password"
                className="login-input"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setPwError('') }}
                autoFocus
              />
              <p className="login-hint">パスワード: {appPassword}<br />※本番運用時には非表示となります</p>
            </div>
            <button type="submit" className="submit-btn">パスワードでログイン</button>
          </form>
          {pwError && <span className="error">{pwError}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="title">
        {formTitle}
      </h1>
      <div className="title-actions">
        <button type="button" className="manual-btn" title="マニュアル" onClick={() => { setShowManual((v) => !v); setShowFaq(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="manual-btn-label">マニュアル</span>
        </button>
        <button type="button" className="manual-btn" title="よくある質問" onClick={() => { setShowFaq((v) => !v); setShowManual(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="manual-btn-label">FAQ</span>
        </button>
        {isGoogleAuth && (
          <button type="button" className="manual-btn" title="設定" onClick={() => { setShowNotifySettings((v) => !v); setShowManual(false); setShowFaq(false) }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="manual-btn-label">設定</span>
          </button>
        )}
        <button type="button" className="manual-btn logout-btn" title="ログアウト" onClick={() => { sessionStorage.removeItem('authed'); sessionStorage.removeItem('authMethod'); auth.signOut().catch(() => {}); setAuthed(false); setIsGoogleAuth(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="manual-btn-label">ログアウト</span>
        </button>
      </div>

      {showManual && (
        <div className="manual">
          <div className="manual-header">
            <h2 className="manual-title">操作マニュアル</h2>
          </div>
          <div className="faq-tabs">
            {MANUAL_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                type="button"
                className={`faq-tab${manualTab === i ? ' active' : ''}`}
                onClick={() => setManualTab(i)}
              >
                {cat.category}
              </button>
            ))}
          </div>
          <div className="faq-tab-content">
            {MANUAL_CATEGORIES[manualTab] && MANUAL_CATEGORIES[manualTab].items.map((s, i) => (
              <div className="manual-section" key={i}>
                <h3>{s.title}</h3>
                <div className="manual-body">{s.body}</div>
              </div>
            ))}
          </div>
          <button type="button" className="manual-close" onClick={() => setShowManual(false)}>閉じる</button>
        </div>
      )}

      {showFaq && (() => {
        const keyword = faqSearch.trim().toLowerCase()
        const searchResults = keyword
          ? FAQ_CATEGORIES.flatMap((cat) =>
              cat.items
                .filter((f) => f.question.toLowerCase().includes(keyword) || f.answer.toLowerCase().includes(keyword))
                .map((f) => ({ ...f, category: cat.category }))
            )
          : null
        return (
          <div className="manual">
            <div className="manual-header">
              <h2 className="manual-title">よくある質問</h2>
              <div className="faq-search-box">
                <svg className="faq-search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="text"
                  className="faq-search-input"
                  placeholder="キーワード検索..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                />
                {faqSearch && (
                  <button type="button" className="faq-search-clear" onClick={() => setFaqSearch('')}>×</button>
                )}
              </div>
            </div>
            {searchResults ? (
              <div className="faq-tab-content">
                {searchResults.length === 0 ? (
                  <p className="faq-no-result">該当する質問が見つかりませんでした。</p>
                ) : (
                  searchResults.map((f, i) => (
                    <div className="faq-item" key={i}>
                      <span className="faq-item-category">{f.category}</span>
                      <h3>Q. {f.question}</h3>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{f.answer}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="faq-tabs">
                  {FAQ_CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`faq-tab${faqTab === i ? ' active' : ''}`}
                      onClick={() => setFaqTab(i)}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>
                <div className="faq-tab-content">
                  {FAQ_CATEGORIES[faqTab] && FAQ_CATEGORIES[faqTab].items.map((f, i) => (
                    <div className="faq-item" key={i}>
                      <h3>Q. {f.question}</h3>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{f.answer}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button type="button" className="manual-close" onClick={() => setShowFaq(false)}>閉じる</button>
          </div>
        )
      })()}

      {showNotifySettings && (
        <div className="manual">
          <div className="manual-header">
            <h2 className="manual-title">設定</h2>
          </div>

          <div className="notify-section">
            <h3 className="notify-section-title">基本設定</h3>
            <div className="notify-field">
              <label className="notify-field-label">フォームタイトル</label>
              <input
                type="text"
                className="notify-input"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onBlur={() => saveSetting('formTitle', formTitle)}
              />
            </div>
            <div className="notify-field">
              <label className="notify-field-label">パスワード</label>
              <input
                type="text"
                className="notify-input"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                onBlur={() => saveSetting('appPassword', appPassword)}
              />
            </div>
          </div>

          <div className="notify-section">
            <h3 className="notify-section-title">フォーム項目設定</h3>
            <p className="notify-settings-desc">改行で項目を区切ります。変更はフォーカスを外した時に保存されます。</p>
            <div className="notify-field">
              <label className="notify-field-label">きっかけ選択肢</label>
              <textarea
                className="notify-template-input"
                value={referralSources.join('\n')}
                onChange={(e) => setReferralSources(e.target.value.split('\n'))}
                onBlur={() => { const cleaned = referralSources.filter(s => s.trim()); setReferralSources(cleaned); saveSetting('referralSources', cleaned) }}
                rows={3}
              />
            </div>
            <div className="notify-field">
              <label className="notify-field-label">お悩み選択肢</label>
              <textarea
                className="notify-template-input"
                value={concernOptions.join('\n')}
                onChange={(e) => setConcernOptions(e.target.value.split('\n'))}
                onBlur={() => { const cleaned = concernOptions.filter(s => s.trim()); setConcernOptions(cleaned); saveSetting('concernOptions', cleaned) }}
                rows={5}
              />
            </div>
            <div className="notify-field">
              <label className="notify-field-label">相談希望選択肢</label>
              <p className="notify-settings-desc">「値:ラベル」の形式で入力してください（例: same_day:当日の無料相談を希望する）</p>
              <textarea
                className="notify-template-input"
                value={consultationTypes.map(ct => `${ct.value}:${ct.label}`).join('\n')}
                onChange={(e) => setConsultationTypes(e.target.value.split('\n').map(line => { const [value, ...rest] = line.split(':'); return { value: value?.trim() || '', label: rest.join(':')?.trim() || '' } }))}
                onBlur={() => { const cleaned = consultationTypes.filter(ct => ct.value.trim() && ct.label.trim()); setConsultationTypes(cleaned); saveSetting('consultationTypes', cleaned) }}
                rows={3}
              />
            </div>
          </div>

          <div className="notify-section">
            <h3 className="notify-section-title">Chatwork通知設定</h3>
            <div className="notify-field">
              <label className="notify-field-label">APIトークン</label>
              <input
                type="password"
                className="notify-input"
                value={chatworkApiToken}
                onChange={(e) => setChatworkApiToken(e.target.value)}
                onBlur={() => saveChatworkConfig(chatworkApiToken, chatworkRoomId)}
                placeholder="APIトークンを入力"
              />
            </div>
            <div className="notify-field">
              <label className="notify-field-label">ルームID</label>
              <input
                type="text"
                className="notify-input"
                value={chatworkRoomId}
                onChange={(e) => setChatworkRoomId(e.target.value)}
                onBlur={() => saveChatworkConfig(chatworkApiToken, chatworkRoomId)}
                placeholder="ルームIDを入力"
              />
            </div>
            <h4 className="notify-section-subtitle">通知イベント・メッセージ</h4>
            <p className="notify-settings-desc">通知するイベントを選択し、メッセージテンプレートを編集できます</p>
            {[
              { key: 'onNewReservation', label: '新規予約時（折り返し不要）' },
              { key: 'onNewReservationWithReply', label: '新規予約時（折り返し希望）' },
              { key: 'onCancel', label: 'キャンセル時' },
              { key: 'onCountChange', label: '人数変更時' },
              { key: 'onConsultationUpdate', label: '相談内容更新時' },
              { key: 'onCallback', label: '再入電・要対応時' },
              { key: 'onWaitlistConfirm', label: 'キャンセル待ち確定時' },
              { key: 'onStatusChange', label: 'ステータス変更時' },
            ].map(({ key, label }) => (
              <div className="notify-event-block" key={key}>
                <label className="notify-check">
                  <input
                    type="checkbox"
                    checked={notifySettings[key]}
                    onChange={(e) => saveNotifySettings({ ...notifySettings, [key]: e.target.checked })}
                  />
                  {label}
                </label>
                {notifySettings[key] && (
                  <div className="notify-template">
                    <textarea
                      className="notify-template-input"
                      value={messageTemplates[key]}
                      onChange={(e) => setMessageTemplates((prev) => ({ ...prev, [key]: e.target.value }))}
                      onBlur={() => saveMessageTemplate(key, messageTemplates[key])}
                      rows={4}
                    />
                    <p className="notify-template-vars">変数: {TEMPLATE_VARIABLES[key]}</p>
                    <button
                      type="button"
                      className="notify-reset-btn"
                      onClick={() => saveMessageTemplate(key, DEFAULT_MESSAGE_TEMPLATES[key])}
                    >
                      初期値に戻す
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="manual-close" onClick={() => setShowNotifySettings(false)}>閉じる</button>
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label>受付種別</label>
          <div className="reservation-type-buttons">
            <button
              type="button"
              className={`reservation-type-btn ${form.reservationType === 'normal' ? 'active' : ''}`}
              onClick={() => {
                setForm((prev) => ({ ...prev, reservationType: 'normal', count: prev.reservationType === 'inquiry' ? '' : prev.count, customCount: prev.reservationType === 'inquiry' ? '' : prev.customCount }))
                setShowCustomCount(false)
              }}
              disabled={isOverCapacity}
            >
              通常予約
            </button>
            <button
              type="button"
              className={`reservation-type-btn waitlist ${form.reservationType === 'waitlist' ? 'active' : ''}`}
              onClick={() => {
                setForm((prev) => ({ ...prev, reservationType: 'waitlist', count: prev.reservationType === 'inquiry' ? '' : prev.count, customCount: prev.reservationType === 'inquiry' ? '' : prev.customCount }))
                setShowCustomCount(false)
              }}
            >
              キャンセル待ち予約
            </button>
            <button
              type="button"
              className={`reservation-type-btn inquiry ${form.reservationType === 'inquiry' ? 'active' : ''}`}
              onClick={() => {
                setForm((prev) => ({ ...prev, reservationType: 'inquiry', count: '0', customCount: '' }))
                setShowCustomCount(false)
                setErrors((prev) => ({ ...prev, count: '', referralSource: '', referralSourceOther: '', concerns: '', consultationType: '' }))
              }}
            >
              お問合せ
            </button>
          </div>
          {isOverCapacity && form.reservationType === 'waitlist' && (
            <p className="reservation-type-note">※ 定員に達したためキャンセル待ちでの受付となります</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="name"><span className="badge-required">必須</span>氏名</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="山田 太郎"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="furigana"><span className="badge-required">必須</span>フリガナ</label>
          <input
            id="furigana"
            name="furigana"
            type="text"
            placeholder="ヤマダ タロウ"
            value={form.furigana}
            onChange={handleChange}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={handleFuriganaCompositionEnd}
            onBlur={(e) => setForm((prev) => ({ ...prev, furigana: toKatakana(prev.furigana) }))}
          />
          {errors.furigana && <span className="error">{errors.furigana}</span>}
        </div>

        <div className="field">
          <label htmlFor="phone"><span className="badge-required">必須</span>電話番号</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="090-1234-5678"
            value={form.phone}
            onChange={handleChange}
            onBlur={() =>
              setForm((prev) => ({ ...prev, phone: formatPhoneNumber(prev.phone) }))
            }
          />
          {errors.phone && <span className="error">{errors.phone}</span>}
        </div>

        {form.reservationType !== 'inquiry' && (
          <>
        <div className="field">
          <label><span className="badge-required">必須</span>人数</label>
          <div className="count-buttons">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={`count-btn ${!showCustomCount && form.count === String(n) ? 'active' : ''}`}
                onClick={() => selectCount(n)}
              >
                {n}人
              </button>
            ))}
            <button
              type="button"
              className={`count-btn ${showCustomCount ? 'active' : ''}`}
              onClick={selectCustom}
            >
              5人以上
            </button>
          </div>
          {showCustomCount && (
            <input
              type="number"
              min="5"
              className="custom-count-input"
              placeholder="人数を入力"
              value={form.customCount}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, customCount: e.target.value }))
                setErrors((prev) => ({ ...prev, count: '' }))
              }}
              autoFocus
            />
          )}
          {errors.count && <span className="error">{errors.count}</span>}
        </div>

        <div className="field">
          <label><span className="badge-required">必須</span>この講演を知ったきっかけ</label>
          <div className="count-buttons">
            {referralSources.map((src) => (
              <button
                key={src}
                type="button"
                className={`count-btn ${form.referralSource === src ? 'active' : ''}`}
                onClick={() => {
                  setForm((prev) => ({ ...prev, referralSource: src, referralSourceOther: src !== 'その他' ? '' : prev.referralSourceOther }))
                  setErrors((prev) => ({ ...prev, referralSource: '', referralSourceOther: '' }))
                }}
              >
                {src}
              </button>
            ))}
          </div>
          {form.referralSource === 'その他' && (
            <input
              type="text"
              className="custom-count-input"
              placeholder="具体的にご記入ください"
              value={form.referralSourceOther}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, referralSourceOther: e.target.value }))
                setErrors((prev) => ({ ...prev, referralSourceOther: '' }))
              }}
              autoFocus
            />
          )}
          {errors.referralSource && <span className="error">{errors.referralSource}</span>}
          {errors.referralSourceOther && <span className="error">{errors.referralSourceOther}</span>}
        </div>

        <div className="field">
          <label><span className="badge-required">必須</span>次の中で、お悩みや関心のあること<span className="badge-multi">複数選択可</span></label>
          <div className="concern-buttons">
            {concernOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`concern-btn ${form.concerns.includes(opt) ? 'active' : ''}`}
                onClick={() => {
                  setForm((prev) => {
                    const exists = prev.concerns.includes(opt)
                    return { ...prev, concerns: exists ? prev.concerns.filter((c) => c !== opt) : [...prev.concerns, opt] }
                  })
                  setErrors((prev) => ({ ...prev, concerns: '' }))
                }}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              className={`concern-btn ${form.concerns.includes('その他') ? 'active' : ''}`}
              onClick={() => {
                setForm((prev) => {
                  const exists = prev.concerns.includes('その他')
                  return { ...prev, concerns: exists ? prev.concerns.filter((c) => c !== 'その他') : [...prev.concerns, 'その他'], concernOther: exists ? '' : prev.concernOther }
                })
                setErrors((prev) => ({ ...prev, concerns: '' }))
              }}
            >
              その他
            </button>
          </div>
          {form.concerns.includes('その他') && (
            <input
              type="text"
              className="custom-count-input"
              placeholder="その他の内容（任意）"
              value={form.concernOther}
              onChange={(e) => setForm((prev) => ({ ...prev, concernOther: e.target.value }))}
            />
          )}
          {errors.concerns && <span className="error">{errors.concerns}</span>}
        </div>

        <div className="field">
          <label>
            <span className="badge-required">必須</span>専門家への無料相談の希望
          </label>
          <div className="consultation-type-buttons">
            {consultationTypes.map((ct) => (
              <button
                key={ct.value}
                type="button"
                className={`consultation-type-btn ${form.consultationType === ct.value ? 'active' : ''}`}
                onClick={() => {
                  setForm((prev) => ({ ...prev, consultationType: ct.value }))
                  setErrors((prev) => ({ ...prev, consultationType: '' }))
                }}
              >
                {ct.label}
              </button>
            ))}
          </div>
          {form.consultationType === 'later' && (
            <p className="consultation-type-note">※サンプロよりイベント終了後にご連絡させていただきます</p>
          )}
          {errors.consultationType && <span className="error">{errors.consultationType}</span>}
        </div>
          </>
        )}

        <div className="field">
          <label htmlFor="consultation"><span className="badge-optional">任意</span>詳しい相談内容・お問合せ内容</label>
          <textarea
            id="consultation"
            name="consultation"
            rows={4}
            placeholder="相談内容をご入力ください"
            value={form.consultation}
            onChange={handleChange}
          />
          {errors.consultation && <span className="error">{errors.consultation}</span>}
        </div>

        <div className="field">
          <label><span className="badge-optional">任意</span>折り返しの連絡</label>
          <div className="count-buttons">
            <button type="button" className={`count-btn${form.wantsReply === true ? ' selected' : ''}`} onClick={() => setForm((prev) => ({ ...prev, wantsReply: true }))}>希望する</button>
            <button type="button" className={`count-btn${form.wantsReply === false ? ' selected' : ''}`} onClick={() => setForm((prev) => ({ ...prev, wantsReply: false }))}>希望しない</button>
          </div>
        </div>

        <button type="submit" className="submit-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
          {form.reservationType === 'inquiry' ? 'お問合せを登録する' : form.reservationType === 'waitlist' ? 'キャンセル待ち予約を登録する' : '予約を登録する'}
        </button>
      </form>

      <section className="list-section">
        <div className="list-header">
          <h2 className="list-title">予約一覧{reservations.length > 0 && <span className="badge">{reservations.length}</span>}</h2>
          <div className="list-header-right">
            <div className="view-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
                title="カード表示"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="表形式"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
            <button type="button" className="print-btn" onClick={() => printList()} title="一覧PDF（A3横）">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              一覧PDF
            </button>
            <button type="button" className="print-btn" onClick={() => printIndividual()} title="個別PDF（1名1ページ）">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
              個別PDF
            </button>
            <div className="search-box">
              <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        {!loading && reservations.length > 0 && (
          <div className="total-count">
            予約組数: <span>{activeReservations.length}組</span>
            確定人数: <span>{totalCount - waitlistCount}名</span>
            {waitlistCount > 0 && <>キャンセル待ち: <span>{waitlistCount}名</span></>}
            <span className="capacity-separator">/</span>
            {editingCapacity ? (
              <span className="capacity-edit">
                定員:
                <input
                  type="number"
                  min="1"
                  className="capacity-edit-input"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitEditCapacity()
                    if (e.key === 'Escape') setEditingCapacity(false)
                  }}
                  autoFocus
                />
                名
                <button className="count-edit-ok" onClick={submitEditCapacity}>OK</button>
                <button className="count-edit-cancel" onClick={() => setEditingCapacity(false)}>取消</button>
              </span>
            ) : (
              <span className="capacity-display" onClick={startEditCapacity} title="クリックして定員を編集">
                定員: <span>{capacity}名</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <p className="empty">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="empty">{searchQuery ? '該当する予約はありません' : 'まだ予約はありません'}</p>
        ) : viewMode === 'table' ? (
          <div className="table-wrapper">
            <table className="reservation-table">
              <thead>
                <tr>
                  <th>受付No.</th>
                  <th>氏名</th>
                  <th>フリガナ</th>
                  <th>電話番号</th>
                  <th>人数</th>
                  <th>きっかけ</th>
                  <th>お悩み</th>
                  <th>無料相談</th>
                  <th>相談内容</th>
                  <th>返信</th>
                  <th>状態</th>
                  <th>予約日時</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'row-cancelled' : r.waitlist ? 'row-waitlist' : ''}>
                    <td>{r.reservationNo || '-'}</td>
                    <td>{r.name}</td>
                    <td>{r.furigana || ''}</td>
                    <td>{r.phone || ''}</td>
                    <td className="td-center">{r.inquiryOnly ? '-' : r.count}</td>
                    <td>{r.referralSource || ''}</td>
                    <td className="td-concerns">{(r.concerns || []).join('、')}</td>
                    <td>{r.consultationTypeLabel || ''}</td>
                    <td className="td-consultation">{r.consultation || ''}</td>
                    <td className="td-center">{r.wantsReply ? (r.contactStatus === 'done' ? '済' : r.contactStatus === 'in_progress' ? '対応中' : r.contactStatus === 'needs_action' ? '要対応' : '希望') : ''}</td>
                    <td className="td-center">
                      {r.status === 'cancelled' ? 'キャンセル' : r.waitlist ? (
                        <><span>待ち </span><button className="action-btn confirm-btn" style={{ fontSize: '0.72rem', padding: '1px 6px' }} onClick={() => handleConfirmWaitlist(r)}>確定</button></>
                      ) : '確定'}
                    </td>
                    <td className="td-date">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="reservation-list">
            {filtered.map((r) => (
              <li key={r.id} className={`reservation-card ${r.status === 'cancelled' ? 'cancelled' : ''}`}>
                <div className="card-header">
                  {/* ヘッダー: 番号+名前+ステータスバッジ+人数 */}
                  <span className="card-name">
                    {r.reservationNo && <span className="card-no">#{r.reservationNo}</span>}
                    {r.name}
                    {r.status === 'cancelled' && <span className="status-cancelled">キャンセル済</span>}
                    {r.waitlist && r.status !== 'cancelled' && <span className="status-waitlist">キャンセル待ち</span>}
                    {r.wantsReply && !r.contactStatus && <span className="status-reply-pending">返信希望</span>}
                    {r.contactStatus === 'needs_action' && <span className="status-needs-action">要対応</span>}
                  </span>
                  {editingCountId === r.id ? (
                    <span className="count-edit">
                      <input type="number" min="1" className="count-edit-input" value={newCount} onChange={(e) => setNewCount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitEditCount(r); if (e.key === 'Escape') cancelEditCount() }} autoFocus />
                      <button className="count-edit-ok" onClick={() => submitEditCount(r)}>OK</button>
                      <button className="count-edit-cancel" onClick={cancelEditCount}>取消</button>
                    </span>
                  ) : (
                    <span className="card-count">{r.inquiryOnly ? '問合せのみ' : `${r.count}名`}</span>
                  )}
                </div>

                {/* メタ行: フリガナ | 電話番号 */}
                <div className="card-meta">
                  {r.furigana && <span className="card-furigana">{r.furigana}</span>}
                  {r.furigana && r.phone && <span className="card-meta-sep" />}
                  {r.phone && <a className="card-phone" href={`tel:${r.phone.replace(/-/g, '')}`}>{r.phone}</a>}
                </div>

                {/* 対応ステータス行 */}
                {r.wantsReply && r.status !== 'cancelled' && (
                  <div className="card-reply-row">
                    <span className={`card-status-label ${r.contactStatus === 'needs_action' ? 'status-callback' : r.contactStatus === 'done' ? 'status-done' : r.contactStatus === 'in_progress' ? 'status-progress' : 'status-pending'}`}>
                      {r.contactStatus === 'needs_action' ? '再入電対応中' : r.contactStatus === 'done' ? '対応済' : r.contactStatus === 'in_progress' ? '対応中' : '未対応'}
                    </span>
                    <div className="contact-status-buttons">
                      {r.contactStatus !== 'in_progress' && <button className="contact-status-btn" onClick={() => updateContactStatus(r, 'in_progress')}>対応中にする</button>}
                      {r.contactStatus !== 'done' && <button className="contact-status-btn" onClick={() => updateContactStatus(r, 'done')}>対応済にする</button>}
                      {r.contactStatus !== 'needs_action' && <button className="contact-status-btn callback-btn" onClick={() => handleCallback(r)}>再入電対応中にする</button>}
                    </div>
                  </div>
                )}

                {/* 対応・相談履歴（折りたたみ） */}
                <div className="card-section">
                  <button type="button" className="card-section-toggle" onClick={() => toggleCardSection(r.id, 'logs')}>
                    <span className="card-section-arrow">{expandedCards[r.id]?.logs === false ? '▶' : '▼'}</span>
                    対応・相談履歴{r.consultationLogs?.length > 0 && <span className="card-section-count">({r.consultationLogs.length}件)</span>}
                  </button>
                  {r.status !== 'cancelled' && (
                    editingConsultationId === r.id ? (
                      <div className="consultation-edit">
                        <textarea className="consultation-edit-input" rows={2} value={newConsultation} onChange={(e) => setNewConsultation(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') cancelEditConsultation() }} placeholder="対応内容を追記..." autoFocus />
                        <div className="consultation-edit-actions">
                          <button className="count-edit-ok" onClick={() => submitEditConsultation(r)}>追記保存</button>
                          <button className="count-edit-cancel" onClick={cancelEditConsultation}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-consultation-btn" onClick={() => { setEditingConsultationId(r.id); setNewConsultation('') }}>+ 追記</button>
                    )
                  )}
                  {expandedCards[r.id]?.logs !== false && r.consultationLogs?.length > 0 && (
                    <ul className="consultation-logs-list">
                      {r.consultationLogs.map((log, i) => (
                        <li key={i} className="consultation-log-item">
                          <span className="consultation-log-date">{formatDate(log.createdAt)}</span>
                          <span className="consultation-log-text">{log.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 変更履歴（折りたたみ） */}
                {r.history && r.history.length > 0 && (
                  <div className="card-section">
                    <button type="button" className="card-section-toggle" onClick={() => toggleCardSection(r.id, 'history')}>
                      <span className="card-section-arrow">{expandedCards[r.id]?.history ? '▼' : '▶'}</span>
                      変更履歴<span className="card-section-count">({r.history.length}件)</span>
                    </button>
                    {expandedCards[r.id]?.history && (
                      <ul className="history-list">
                        {r.history.map((h, i) => (
                          <li key={i} className="history-item">
                            <span className={`history-type ${h.type}`}>{h.type === 'cancel' ? 'キャンセル' : h.type === 'callback' ? '再入電' : '人数変更'}</span>
                            {h.type === 'count_change' && <span className="history-detail">{h.before.count}名 → {h.after.count}名</span>}
                            {h.type === 'callback' && <span className="history-detail">{h.detail}</span>}
                            <span className="history-date">{formatDate(h.changedAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* フッター: 操作ボタン + 登録日 */}
                <div className="card-footer">
                  {r.status !== 'cancelled' && editingCountId !== r.id && (
                    <div className="card-footer-actions">
                      {r.waitlist && <button className="action-btn confirm-btn" onClick={() => handleConfirmWaitlist(r)}>予約確定</button>}
                      <button className="action-btn change-btn" onClick={() => startEditCount(r)}>人数変更</button>
                      <button className="action-btn cancel-btn" onClick={() => handleCancel(r)}>予約キャンセル</button>
                    </div>
                  )}
                  <span className="card-date">{formatDate(r.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
