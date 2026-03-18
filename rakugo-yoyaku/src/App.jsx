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
import { db } from './firebase'
import './App.css'

const COLLECTION = 'reservations'
const PASSWORD = 'rakugo1234'
const DEFAULT_CAPACITY = 25

const CHATWORK_API_TOKEN = '01272590631f16ed47b9789f07d5cf75'
const CHATWORK_ROOM_ID = '402525982'

const sendChatworkNotification = async (message) => {
  try {
    await fetch(`https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': CHATWORK_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `body=${encodeURIComponent(message)}`,
    })
  } catch (e) {
    console.warn('Chatwork通知の送信に失敗しました:', e)
  }
}

const DEFAULT_HELP = [
  { title: '予約の追加', body: '氏名・フリガナ・電話番号・人数を入力し「予約を追加する」ボタンを押してください。詳しい相談内容と返信希望は任意です。' },
  { title: '予約の検索', body: '予約一覧の検索ボックスに氏名・フリガナ・電話番号を入力すると絞り込みできます。漢字の表記ゆれ（斎藤／斉藤など）にも対応しています。' },
  { title: '人数変更', body: '各予約カードの「人数変更」ボタンから変更できます。変更履歴は自動で記録されます。' },
  { title: '予約キャンセル', body: '「予約キャンセル」ボタンを押すとキャンセル済みになります。キャンセルされた予約は一覧にグレー表示で残ります。' },
  { title: 'キャンセル待ち', body: '定員を超えた場合、フォーム上部に案内が表示されます。「キャンセル待ちとして受付」にチェックを入れて登録してください。定員は予約一覧の「定員」をクリックして変更できます。' },
]

const DEFAULT_FAQ = [
  { question: '落語会はどのような内容ですか？', answer: '相続に関するテーマを落語で分かりやすくお伝えする会です。専門家による解説もあります。' },
  { question: '参加費はかかりますか？', answer: '参加費は無料です。お気軽にお申し込みください。' },
  { question: '相続の相談もできますか？', answer: 'はい。予約フォームの「詳しい相談内容」欄にご記入いただければ、当日専門家がお答えします。「折り返しのご連絡を希望する」にチェックを入れると事前にご連絡いたします。' },
  { question: '定員を超えた場合はどうなりますか？', answer: 'キャンセル待ちとしてお受けします。空きが出た場合にご連絡いたします。' },
  { question: '予約のキャンセルや人数変更はできますか？', answer: 'はい。管理画面から予約のキャンセルや人数変更が可能です。' },
]

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
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [form, setForm] = useState({ name: '', furigana: '', phone: '', count: '', customCount: '', consultation: '', wantsReply: false, waitlist: false, inquiryOnly: false })
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
  const [editingFaq, setEditingFaq] = useState(false)
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [newCapacity, setNewCapacity] = useState('')
  const [editingConsultationId, setEditingConsultationId] = useState(null)
  const [newConsultation, setNewConsultation] = useState('')
  const [notifySettings, setNotifySettings] = useState({
    onNewReservation: true,
    onCancel: true,
    onCountChange: false,
    onConsultationUpdate: false,
  })
  const [showNotifySettings, setShowNotifySettings] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === PASSWORD) {
      sessionStorage.setItem('authed', '1')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('パスワードが正しくありません')
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
      try {
        const snap = await getDoc(doc(db, 'settings', 'content'))
        if (snap.exists()) {
          const data = snap.data()
          if (data.helpSections) setHelpSections(data.helpSections)
          if (data.faqItems) setFaqItems(data.faqItems)
          if (data.capacity) setCapacity(data.capacity)
          if (data.notifySettings) setNotifySettings((prev) => ({ ...prev, ...data.notifySettings }))
        }
      } catch (e) { /* use defaults on error */ }
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

  const saveNotifySettings = async (updated) => {
    setNotifySettings(updated)
    try { await setDoc(doc(db, 'settings', 'content'), { notifySettings: updated }, { merge: true }) } catch (e) { /* ignore */ }
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
    const count = getCount()
    if (!form.inquiryOnly && (!count || count < 1)) newErrors.count = '人数を選択してください'
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    const formattedPhone = formatPhoneNumber(form.phone.trim())
    const isWaitlist = form.waitlist || isOverCapacity
    const count = form.inquiryOnly ? 0 : getCount()
    await addDoc(collection(db, COLLECTION), {
      name: form.name.trim(),
      furigana: form.furigana.trim(),
      phone: formattedPhone,
      count,
      consultation: form.consultation.trim(),
      wantsReply: form.wantsReply,
      waitlist: isWaitlist,
      inquiryOnly: form.inquiryOnly,
      status: 'active',
      history: [],
      createdAt: serverTimestamp(),
    })
    if (notifySettings.onNewReservation) {
      const type = form.inquiryOnly ? '問い合わせ' : isWaitlist ? '新規予約（キャンセル待ち）' : '新規予約'
      const lines = [
        `[info][title]${type}[/title]`,
        `氏名: ${form.name.trim()}`,
        `フリガナ: ${form.furigana.trim()}`,
        `電話番号: ${formattedPhone}`,
        form.inquiryOnly ? '' : `人数: ${count}名`,
        form.consultation.trim() ? `相談内容: ${form.consultation.trim()}` : '',
        form.wantsReply ? '※ 折り返し連絡希望' : '',
        '[/info]',
      ].filter(Boolean)
      sendChatworkNotification(lines.join('\n'))
    }
    setForm({ name: '', furigana: '', phone: '', count: '', customCount: '', consultation: '', wantsReply: false, waitlist: false, inquiryOnly: false })
    setShowCustomCount(false)
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
      sendChatworkNotification(`[info][title]予約キャンセル[/title]氏名: ${r.name}\n人数: ${r.count}名[/info]`)
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
      sendChatworkNotification(`[info][title]人数変更[/title]氏名: ${r.name}\n変更: ${r.count}名 → ${parsed}名[/info]`)
    }
    setEditingCountId(null)
    setNewCount('')
  }

  const toggleContacted = async (r) => {
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, { contacted: !r.contacted })
  }

  const startEditCapacity = () => {
    setNewCapacity(String(capacity))
    setEditingCapacity(true)
  }

  const submitEditCapacity = async () => {
    const parsed = Number(newCapacity)
    if (!parsed || parsed < 1) return
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
    const ref = doc(db, COLLECTION, r.id)
    await updateDoc(ref, { consultation: newConsultation.trim() })
    if (notifySettings.onConsultationUpdate) {
      sendChatworkNotification(`[info][title]相談内容更新[/title]氏名: ${r.name}\n内容: ${newConsultation.trim()}[/info]`)
    }
    setEditingConsultationId(null)
    setNewConsultation('')
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    return ts.toDate().toLocaleString('ja-JP')
  }

  const activeReservations = reservations.filter((r) => r.status !== 'cancelled')
  const totalCount = activeReservations.reduce((sum, r) => sum + (r.count || 0), 0)
  const waitlistCount = activeReservations.filter((r) => r.waitlist).reduce((sum, r) => sum + (r.count || 0), 0)
  const isOverCapacity = totalCount >= capacity

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
        <h1 className="title">落語会 予約フォーム</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <label className="login-label" htmlFor="password">パスワードを入力してください</label>
          <p className="login-hint">パスワード: rakugo1234</p>
          <input
            id="password"
            type="password"
            className="login-input"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwError('') }}
            autoFocus
          />
          {pwError && <span className="error">{pwError}</span>}
          <button type="submit" className="submit-btn">ログイン</button>
        </form>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="title">
        落語会 予約フォーム
        <button type="button" className="manual-btn" title="ヘルプ" onClick={() => { setShowManual((v) => !v); setShowFaq(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="manual-btn-label">ヘルプ</span>
        </button>
        <button type="button" className="manual-btn" title="よくある質問" onClick={() => { setShowFaq((v) => !v); setShowManual(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="manual-btn-label">FAQ</span>
        </button>
        <button type="button" className="manual-btn" title="通知設定" onClick={() => { setShowNotifySettings((v) => !v); setShowManual(false); setShowFaq(false) }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="manual-btn-label">通知</span>
          <span className={`notify-dot ${Object.values(notifySettings).some(Boolean) ? 'on' : ''}`} />
        </button>
      </h1>

      {showManual && (
        <div className="manual">
          <div className="manual-header">
            <h2 className="manual-title">利用マニュアル</h2>
            {!editingHelp && <button type="button" className="edit-btn" onClick={() => setEditingHelp(true)}>編集</button>}
          </div>
          {editingHelp ? (
            <HelpEditor sections={helpSections} onSave={saveHelp} onCancel={() => setEditingHelp(false)} />
          ) : (
            helpSections.map((s, i) => (
              <div className="manual-section" key={i}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))
          )}
          {!editingHelp && <button type="button" className="manual-close" onClick={() => setShowManual(false)}>閉じる</button>}
        </div>
      )}

      {showFaq && (
        <div className="manual">
          <div className="manual-header">
            <h2 className="manual-title">よくある質問</h2>
            {!editingFaq && <button type="button" className="edit-btn" onClick={() => setEditingFaq(true)}>編集</button>}
          </div>
          {editingFaq ? (
            <FaqEditor items={faqItems} onSave={saveFaq} onCancel={() => setEditingFaq(false)} />
          ) : (
            faqItems.map((f, i) => (
              <div className="faq-item" key={i}>
                <h3>Q. {f.question}</h3>
                <p>{f.answer}</p>
              </div>
            ))
          )}
          {!editingFaq && <button type="button" className="manual-close" onClick={() => setShowFaq(false)}>閉じる</button>}
        </div>
      )}

      {showNotifySettings && (
        <div className="manual">
          <div className="manual-header">
            <h2 className="manual-title">チャットワーク通知設定</h2>
          </div>
          <p className="notify-settings-desc">通知するイベントを選択してください</p>
          {[
            { key: 'onNewReservation', label: '新規予約時' },
            { key: 'onCancel', label: 'キャンセル時' },
            { key: 'onCountChange', label: '人数変更時' },
            { key: 'onConsultationUpdate', label: '相談内容更新時' },
          ].map(({ key, label }) => (
            <label className="notify-check" key={key}>
              <input
                type="checkbox"
                checked={notifySettings[key]}
                onChange={(e) => saveNotifySettings({ ...notifySettings, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <button type="button" className="manual-close" onClick={() => setShowNotifySettings(false)}>閉じる</button>
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        {isOverCapacity && (
          <div className="waitlist-banner">キャンセル待ちとして受付してください</div>
        )}
        <label className="waitlist-check">
          <input
            type="checkbox"
            checked={form.waitlist || isOverCapacity}
            onChange={(e) => setForm((prev) => ({ ...prev, waitlist: e.target.checked }))}
          />
          キャンセル待ちとして受付
        </label>
        <div className="field">
          <label htmlFor="name">氏名<span className="badge-required">必須</span></label>
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
          <label htmlFor="furigana">フリガナ<span className="badge-required">必須</span></label>
          <input
            id="furigana"
            name="furigana"
            type="text"
            placeholder="ヤマダ タロウ"
            value={form.furigana}
            onChange={handleChange}
          />
          {errors.furigana && <span className="error">{errors.furigana}</span>}
        </div>

        <div className="field">
          <label htmlFor="phone">電話番号<span className="badge-required">必須</span></label>
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

        <div className="field">
          <label>人数<span className="badge-required">必須</span></label>
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
          <button
            type="button"
            className={`inquiry-only-btn ${form.inquiryOnly ? 'active' : ''}`}
            onClick={() => {
              const next = !form.inquiryOnly
              setForm((prev) => ({ ...prev, inquiryOnly: next, count: next ? '0' : '', customCount: '' }))
              setShowCustomCount(false)
              setErrors((prev) => ({ ...prev, count: '' }))
            }}
          >
            予約なし・問い合わせのみ
          </button>
          {errors.count && <span className="error">{errors.count}</span>}
        </div>

        <div className="field">
          <label htmlFor="consultation">詳しい相談内容<span className="badge-optional">任意</span></label>
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

        <label className="reply-check">
          <input
            type="checkbox"
            checked={form.wantsReply}
            onChange={(e) => setForm((prev) => ({ ...prev, wantsReply: e.target.checked }))}
          />
          折り返しのご連絡を希望する
          <span className="badge-optional">任意</span>
        </label>

        <button type="submit" className="submit-btn">予約を追加する</button>
      </form>

      <section className="list-section">
        <div className="list-header">
          <h2 className="list-title">予約一覧{reservations.length > 0 && <span className="badge">{reservations.length}</span>}</h2>
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
        ) : (
          <ul className="reservation-list">
            {filtered.map((r) => (
              <li key={r.id} className={`reservation-card ${r.status === 'cancelled' ? 'cancelled' : ''}`}>
                <div className="card-header">
                  <span className="card-name">
                    {r.name}
                    {r.status === 'cancelled' && <span className="status-cancelled">キャンセル済</span>}
                    {r.waitlist && r.status !== 'cancelled' && <span className="status-waitlist">キャンセル待ち</span>}
                  </span>

                  {editingCountId === r.id ? (
                    <span className="count-edit">
                      <input
                        type="number"
                        min="1"
                        className="count-edit-input"
                        value={newCount}
                        onChange={(e) => setNewCount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitEditCount(r)
                          if (e.key === 'Escape') cancelEditCount()
                        }}
                        autoFocus
                      />
                      <button className="count-edit-ok" onClick={() => submitEditCount(r)}>OK</button>
                      <button className="count-edit-cancel" onClick={cancelEditCount}>取消</button>
                    </span>
                  ) : (
                    <span className="card-count">{r.inquiryOnly ? '問合せのみ' : `${r.count}名`}</span>
                  )}

                  {r.status !== 'cancelled' && editingCountId !== r.id && (
                    <>
                      <button className="action-btn change-btn" onClick={() => startEditCount(r)}>人数変更</button>
                      <button className="action-btn cancel-btn" onClick={() => handleCancel(r)}>予約キャンセル</button>
                    </>
                  )}
                </div>
                {r.furigana && <p className="card-furigana">{r.furigana}</p>}
                {r.phone && <p className="card-phone">{r.phone}</p>}
                {editingConsultationId === r.id ? (
                  <div className="consultation-edit">
                    <textarea
                      className="consultation-edit-input"
                      rows={3}
                      value={newConsultation}
                      onChange={(e) => setNewConsultation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEditConsultation()
                      }}
                      autoFocus
                    />
                    <div className="consultation-edit-actions">
                      <button className="count-edit-ok" onClick={() => submitEditConsultation(r)}>保存</button>
                      <button className="count-edit-cancel" onClick={cancelEditConsultation}>取消</button>
                    </div>
                  </div>
                ) : (
                  r.consultation ? (
                    <p className="card-consultation" onClick={() => r.status !== 'cancelled' && startEditConsultation(r)} title={r.status !== 'cancelled' ? 'クリックして編集' : ''} style={r.status !== 'cancelled' ? { cursor: 'pointer' } : {}}>
                      {r.consultation}
                    </p>
                  ) : r.status !== 'cancelled' && (
                    <button className="add-consultation-btn" onClick={() => startEditConsultation(r)}>+ 相談内容を追加</button>
                  )
                )}
                {r.wantsReply && (
                  <div className="card-reply-row">
                    <span className="card-reply-badge">返信希望</span>
                    <label className="contacted-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!r.contacted}
                        onChange={() => toggleContacted(r)}
                      />
                      連絡済
                    </label>
                  </div>
                )}
                <p className="card-date">{formatDate(r.createdAt)}</p>

                {r.history && r.history.length > 0 && (
                  <div className="history">
                    <p className="history-title">変更履歴</p>
                    <ul className="history-list">
                      {r.history.map((h, i) => (
                        <li key={i} className="history-item">
                          <span className={`history-type ${h.type}`}>
                            {h.type === 'cancel' ? 'キャンセル' : '人数変更'}
                          </span>
                          {h.type === 'count_change' && (
                            <span className="history-detail">
                              {h.before.count}名 → {h.after.count}名
                            </span>
                          )}
                          <span className="history-date">{formatDate(h.changedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
