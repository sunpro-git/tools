import { createElement, useState, useEffect, Fragment, useRef } from 'react';
import htm from 'htm';
import {
  Shield, Sword, Swords, Search, Menu, User, ChevronRight,
  CheckSquare, Download, PlayCircle, AlertTriangle, Copy,
  Home, LogOut, Bell, ArrowDown,
  MapPin, Building, Hammer, Flag, Phone, FileText, Heart, PenTool,
  FileImage, Star, Lightbulb, Zap, Clock, Link as LinkIcon, File,
  HelpCircle, Trophy, Users, Loader2, SlidersHorizontal, Plus, X, Calendar
} from 'lucide-react';
import { loginWithGoogle, logout, onAuthChange, refreshGoogleToken } from './services/auth.js';
import { getUserDoc, upsertUserDoc, subscribeToWeapons, addWeapon, updateWeapon, seedWeaponsIfEmpty } from './services/db.js';
import AdminPanelView from './views/AdminPanel.js';
import StaffPanelView from './views/StaffView.js';

const html = htm.bind(createElement);

// ------------------------------------------------------------------
// データ
// ------------------------------------------------------------------
const INITIAL_WEAPONS = [
  {
    id: 1,
    title: '土地なし客への初回アプローチ',
    categories: ['土地探し', 'お披露目会 / 見学会'],
    businessType: '不動産',
    tags: ['新人向け', '基本'],
    winRate: '30%',
    overview: '土地を持っていない顧客に対し、土地探しの難しさと自社のサポート体制を伝え、次回アポ（FP相談）につなげる。',
    summary: '土地なし客へのアプローチは「土地探しの難しさ」を共有することから始まります。自社の土地探しサポートがいかに有利かを説明し、まずは予算決め（FP相談）への動線を作ることがゴールです。',
    transcript: `（00:00）はい、それでは土地なしのお客様への初回接客について解説します。\n（00:15）まず重要なのは、いきなり土地を紹介しないことです。「良い土地があれば紹介します」と言ってしまうと、お客様は「待ち」の姿勢になってしまいます。\n（00:45）ここで伝えるべきは、市場に出回らない土地情報の存在と、それをどうやって入手するかという当社のノウハウです。\n（01:20）具体的なトークとしては...（以下略）`,
    todos: ['現在の住まいの不満点を聞き出す', '希望エリアの相場観を伝える（高めに）', '「土地探し＝総予算の把握」が必要と伝える', '次回FP相談の日程を提示する（二択で）'],
    downloads: [
      { type: 'PDF', name: '土地探しガイドブック.pdf', url: '#', thumbnail: 'https://placehold.co/100x100/e2e8f0/64748b?text=PDF' },
      { type: 'Excel', name: '資金計画シミュレーター.xlsx', url: '#', thumbnail: 'https://placehold.co/100x100/dcfce7/166534?text=XLS' }
    ],
    templates: [{ label: 'お礼LINE（初回）', content: '本日は貴重なお時間をいただきありがとうございました。土地探しの件、〇〇様の理想の暮らしを実現するために、まずは総予算の把握からお手伝いさせてください。' }],
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    videoTitle: 'トップセールスAさんの初回トーク実演',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop',
    updatedAt: '2023-10-01',
    supervisor: { name: '鈴木 一郎', role: '営業部長' },
    likes: 128,
    metrics: { favorites: 45, understood: 89, practicing: 32 },
    timestamps: [{ label: '冒頭：アイスブレイク', time: 0 }, { label: '土地探しの落とし穴', time: 45 }, { label: '自社のサポート体制', time: 120 }, { label: '次回アポの打診', time: 180 }],
    quiz: { questions: [
      { id: 1, text: '土地なし客への初回アプローチで、最初にやってはいけないことは？', options: ['今の不満を聞く', 'いきなり土地物件を紹介する', '資金計画の重要性を話す', 'エリアの相場観を伝える'], correctAnswer: 1 },
      { id: 2, text: '「良い土地があれば紹介します」と言うと、お客様はどうなる傾向がある？', options: ['積極的に探し始める', '「待ち」の姿勢になる', '他社に行かなくなる', 'すぐに契約してくれる'], correctAnswer: 1 },
      { id: 3, text: '次回アポとして最も適切な誘導先は？', options: ['モデルハウス再来場', '土地ツアー', 'FP相談（資金計画）', '設計申し込み'], correctAnswer: 2 },
      { id: 4, text: '土地情報の種類について説明する際、強調すべきなのは？', options: ['ネット情報の多さ', '市場に出回らない未公開情報の存在', 'チラシ情報の正確さ', '知人からの紹介'], correctAnswer: 1 },
      { id: 5, text: 'アポイントの日程提示で効果的な手法は？', options: ['いつでも良いと言う', 'お客様から連絡をもらう', '二者択一（A日かB日か）で提示する', '来月の日程を出す'], correctAnswer: 2 }
    ]},
    completedBy: [{ id: 'u1', name: '佐藤 健', date: '2023-10-02' }, { id: 'u2', name: '田中 美咲', date: '2023-10-03' }, { id: 'u3', name: '高橋 涼太', date: '2023-10-05' }, { id: 'u4', name: '伊藤 さくら', date: '2023-10-08' }, { id: 'u5', name: '渡辺 翔', date: '2023-10-10' }],
    roleplay: {
      customerProfile: '30代ファミリー。土地なし。注文住宅を検討中。',
      situation: '初回来店。「土地から探したい」と言っているが、何から始めればいいか全くわからない状況。',
      steps: [
        { id: 1, customerText: 'こんにちは。土地から探して家を建てたいんですが、何から始めればいいか全然わからなくて...', hint: '共感を示しつつ、「土地探しの前にまず総予算を把握することが重要」と伝える' },
        { id: 2, customerText: '良い土地があったら紹介してもらえますか？', hint: '「良い土地があれば紹介します」とは言わない。市場に出ない未公開情報がある話をして興味を引く' },
        { id: 3, customerText: '予算の目安ってどのくらいですか？', hint: 'いきなり金額を言わず、「FP相談で明確にしましょう」と次の動線を作る' },
        { id: 4, customerText: 'まだ買う気持ちが固まっていなくて...', hint: 'プレッシャーをかけず「まず話だけでも」とFP相談のハードルを下げる' },
        { id: 5, customerText: '次はいつ来ればいいですか？', hint: '「A日かB日か」の二択でFP相談アポを確定させる' }
      ],
      roleplays: []
    }
  },
  {
    id: 2,
    title: '競合他社比較時の切り返しトーク',
    categories: ['競合対策', 'クロージング', '商談'],
    businessType: '新築',
    tags: ['難易度高', '勝負所'],
    winRate: '45%',
    overview: '「A社の方が安い」と言われた際の対抗策。価格ではなく「性能」と「長期的なメンテナンスコスト」で差別化を図る。',
    summary: '価格競争に巻き込まれそうな時こそ、長期的な視点を提供します。初期コストだけでなく、ランニングコストを含めた生涯コストでの比較を提案し、性能の価値を伝えます。',
    transcript: `（00:00）競合他社と比較された時のマインドセットです。\n（00:30）「高い」と言われたら、それは「価値が伝わっていない」と捉えてください。\n（01:00）光熱費シミュレーションを見せながら...`,
    todos: ['競合の見積もり内容を詳細にヒアリング', '初期費用とランニングコストの違いを図解する', 'OB顧客の声を提示する'],
    downloads: [
      { type: 'PPT', name: '他社比較・性能比較表.pptx', url: '#', thumbnail: 'https://placehold.co/100x100/ffedd5/9a3412?text=PPT' },
      { type: 'Link', name: '【参考】断熱性能比較サイト', url: 'https://example.com', thumbnail: 'https://placehold.co/100x100/e0e7ff/4338ca?text=WEB' }
    ],
    templates: [{ label: '検討中顧客への追撃メール', content: '先日はありがとうございました。他社様と比較されているとのこと、光栄です。長期的なメンテナンスコストを含めた比較表を作成しましたので、添付ファイルをご確認ください。' }],
    videoUrl: 'https://www.youtube.com/embed/iCvmsMzlF7o',
    videoTitle: '価格競争に巻き込まれないマインドセット',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop',
    updatedAt: '2023-10-05',
    supervisor: { name: '高橋 優子', role: 'トップセールス' },
    likes: 256,
    metrics: { favorites: 120, understood: 200, practicing: 150 },
    timestamps: [{ label: '価格ではなく価値を売る', time: 30 }, { label: '自信を持つためのボディランゲージ', time: 120 }],
    quiz: { questions: [
      { id: 1, text: '「高い」と言われた時の正しい捉え方は？', options: ['値引きが必要', '価値が伝わっていない', '顧客層が違う', '諦めるべき'], correctAnswer: 1 },
      { id: 2, text: '価格以外で勝負すべき要素は？', options: ['営業の人柄', '性能とランニングコスト', '会社の規模', '景品'], correctAnswer: 1 },
      { id: 3, text: '競合対策で最初に行うべきことは？', options: ['他社の悪口を言う', '競合の見積もり内容のヒアリング', '即座に値引き', '上司を呼ぶ'], correctAnswer: 1 },
      { id: 4, text: 'コスト比較で見せるべき期間は？', options: ['初期費用のみ', '10年後まで', '生涯コスト（30-50年）', 'ローン完済まで'], correctAnswer: 2 },
      { id: 5, text: '差別化を図るために有効な資料は？', options: ['会社案内', '光熱費シミュレーション', '名刺', 'チラシ'], correctAnswer: 1 }
    ]},
    completedBy: [{ id: 'u1', name: '佐藤 健', date: '2023-10-12' }, { id: 'u6', name: '加藤 結衣', date: '2023-10-15' }],
    roleplay: {
      customerProfile: '40代オーナー夫婦。競合他社と比較検討中。価格に敏感。',
      situation: '商談中盤。「A社の方が安い」と言われた場面。値引き交渉になりかけている。',
      steps: [
        { id: 1, customerText: 'A社さんから見積もりをもらったんですが、御社より100万円ほど安かったんですよ。', hint: '焦らず「どのような内容でしたか？」と競合の見積もりを詳しくヒアリングする' },
        { id: 2, customerText: '結局、金額が安い方がいいですよね？', hint: '初期費用だけでなく、光熱費を含めた生涯コストで比較することを提案する' },
        { id: 3, customerText: '性能って具体的にどう違うんですか？', hint: '光熱費シミュレーションを使い、30年・50年スパンで具体的な数字を見せる' },
        { id: 4, customerText: 'それでも少し値引きしてもらえませんか？', hint: '値引きよりOB顧客の体験談を紹介し、価値で答える' },
        { id: 5, customerText: 'もう少し考えさせてください...', hint: '「ではいつ頃ご判断できそうですか？」と次回アポを今すぐ設定する' }
      ],
      roleplays: []
    }
  },
  {
    id: 3,
    title: '見学会案内（当日予約獲得）',
    categories: ['見学会アポ', 'お披露目会 / 見学会', '住宅博 / リフォーム博'],
    businessType: '新築',
    tags: ['テレアポ', '即効性'],
    winRate: '15%',
    overview: '過去の資料請求者に対して、週末の完成見学会への来場を促す。',
    summary: 'リストへの架電はスピードとタイミングが命です。週末の見学会への動員を最大化するためのスクリプトとSMS活用法を解説します。',
    transcript: `（00:00）テレアポのコツは、断られることを恐れないことです。\n（00:20）「ちょうど近くで完成見学会がありまして」という軽いトーンで...`,
    todos: ['リストの精査（直近1ヶ月以内）', '電話またはSMS送信', '特典（クオカード等）の訴求'],
    downloads: [],
    templates: [{ label: 'SMS送信文面', content: '【〇〇ホーム】今週末、〇〇エリアで完成見学会を開催します。Web予約限定でAmazonギフト券プレゼント中！詳細はこちら→ https://example.com' }],
    videoUrl: 'https://www.youtube.com/embed/EngW7tLk6R8',
    videoTitle: '見学会動員のためのテレアポ実践編',
    thumbnail: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&h=225&fit=crop',
    updatedAt: '2023-10-10',
    supervisor: { name: '田中 健太', role: '店長' },
    likes: 89,
    metrics: { favorites: 30, understood: 70, practicing: 10 },
    timestamps: [{ label: 'リスト作成のポイント', time: 10 }, { label: '実際のトークスクリプト', time: 60 }],
    quiz: { questions: [
      { id: 1, text: 'テレアポリストの精査基準は？', options: ['全顧客', '直近1ヶ月以内', '1年以上前', 'エリア外含む'], correctAnswer: 1 },
      { id: 2, text: '電話が繋がらない時の有効な手段は？', options: ['諦める', 'SMS（ショートメール）送信', '手紙を送る', '留守電に長文を入れる'], correctAnswer: 1 },
      { id: 3, text: 'テレアポ時の重要なトーンは？', options: ['重々しく', '軽いトーンで', '早口で', '小声で'], correctAnswer: 1 },
      { id: 4, text: '来場特典を訴求する目的は？', options: ['安売りするため', '来場のハードルを下げるため', '利益を減らすため', '暇だから'], correctAnswer: 1 },
      { id: 5, text: '見学会への動員で最も重要なのは？', options: ['スピードとタイミング', '説明の長さ', '資料の量', '服装'], correctAnswer: 0 }
    ]},
    completedBy: [],
    roleplay: {
      customerProfile: '過去の資料請求者。30代共働き夫婦。週末は比較的自由。',
      situation: 'テレアポ。週末の完成見学会への来場を促す架電の場面。',
      steps: [
        { id: 1, customerText: 'はい、もしもし？（少し警戒した様子）', hint: '明るいトーンで手短に自己紹介。「少し前に資料請求いただいた〇〇ホームです」' },
        { id: 2, customerText: 'ああ、はい...何かご用ですか？', hint: '来場特典（クオカード等）を最初に訴求してメリットを伝える' },
        { id: 3, customerText: '今週末はちょっと予定があるかも...', hint: '土曜か日曜かで二択を提示し、短時間でいいことを伝える' },
        { id: 4, customerText: 'どんな見学会なんですか？', hint: '具体的なエリアと物件の特長を10秒でアピールする' }
      ],
      roleplays: []
    }
  }
];

const CATEGORIES = [
  { id: '資料請求 / 来場予約', name: '資料請求 / 来場予約', group: 'phase0', iconComp: FileText, color: 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 shadow-sm' },
  { id: '競合対策', name: '競合対策', group: 'phase1', iconComp: Swords, color: 'bg-sky-600 text-white border-sky-700 hover:bg-sky-700 shadow-sm' },
  { id: 'お披露目会 / 見学会', name: 'お披露目会 / 見学会', group: 'phase1', iconComp: Home, color: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm' },
  { id: '住宅博 / リフォーム博', name: '住宅博 / リフォーム博', group: 'phase1', iconComp: Building, color: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm' },
  { id: '総合展示場', name: '総合展示場', group: 'phase1', iconComp: Flag, color: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm' },
  { id: '相続相談',  name: '相続相談',  group: 'phase1', iconComp: HelpCircle, color: 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm' },
  { id: '土地探し', name: '土地探しアポ', group: 'phase2', iconComp: MapPin, color: 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700 shadow-sm' },
  { id: '資金計画', name: '資金計画アポ', group: 'phase2', iconComp: Download, color: 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700 shadow-sm' },
  { id: '現地調査', name: '現地調査アポ', group: 'phase2', iconComp: Search, color: 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700 shadow-sm' },
  { id: '見学会アポ', name: '見学会アポ', group: 'phase2', iconComp: User, color: 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700 shadow-sm' },
  { id: '設計申込誘致', name: '設計申込誘致', group: 'phase3', iconComp: PenTool, color: 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm' },
  { id: '無料プラン誘致', name: '無料プラン誘致', group: 'phase3', iconComp: FileImage, color: 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm' },
  { id: 'クロージング', name: 'クロージング', group: 'phase3', iconComp: CheckSquare, color: 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm' },
];

const BUSINESS_TYPES = ['新築', 'リフォーム', '不動産', 'ソリューション'];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ------------------------------------------------------------------
// ユーティリティコンポーネント
// ------------------------------------------------------------------

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bgColor = type === 'success' ? 'bg-teal-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600';
  return html`
    <div className=${`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center animate-fade-in-down`}>
      ${type === 'success' && html`<${CheckSquare} className="mr-2" size=${18} />`}
      ${type === 'error' && html`<${AlertTriangle} className="mr-2" size=${18} />`}
      <span className="font-bold text-sm">${message}</span>
    </div>
  `;
};

const QuizModal = ({ isOpen, onClose, weapon, onComplete, currentUser }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isOpen) { setCurrentQuestion(0); setAnswers({}); setShowResult(false); setScore(0); }
  }, [isOpen]);

  if (!isOpen) return null;

  const questions = weapon.quiz?.questions || [];
  const totalQuestions = questions.length;

  const handleAnswer = (optionIndex) => setAnswers({ ...answers, [currentQuestion]: optionIndex });

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      let correctCount = 0;
      questions.forEach((q, idx) => { if (answers[idx] === q.correctAnswer) correctCount++; });
      setScore(correctCount);
      setShowResult(true);
    }
  };

  const handleFinish = () => {
    if (score >= totalQuestions * 0.8) onComplete(weapon.id, score);
    onClose();
  };

  return html`
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        ${!showResult ? html`
          <${Fragment}>
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-slate-800 flex items-center">
                  <${HelpCircle} className="mr-2 text-indigo-600" /> 理解度チェックテスト
                </h3>
                <p className="text-sm text-slate-500 mt-1">全${totalQuestions}問 / 4択形式</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block mb-1">進捗</span>
                  <span className="text-2xl font-bold text-indigo-600">${currentQuestion + 1}</span>
                  <span className="text-slate-400 text-sm"> / ${totalQuestions}</span>
                </div>
                <button onClick=${onClose} className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-600">
                  <${X} size=${20} />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="mb-8">
                <h4 className="text-lg font-bold text-slate-800 mb-6 leading-relaxed">
                  Q${currentQuestion + 1}. ${questions[currentQuestion].text}
                </h4>
                <div className="space-y-3">
                  ${questions[currentQuestion].options.map((option, idx) => html`
                    <button
                      key=${idx}
                      onClick=${() => handleAnswer(idx)}
                      className=${`w-full text-left p-4 rounded-xl border-2 transition relative ${answers[currentQuestion] === idx ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      <span className=${`inline-flex items-center justify-center w-6 h-6 rounded-full mr-3 text-xs font-bold ${answers[currentQuestion] === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        ${['A', 'B', 'C', 'D'][idx]}
                      </span>
                      ${option}
                    </button>
                  `)}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="w-full bg-slate-200 h-2 rounded-full mr-6 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style=${{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }} />
              </div>
              <button
                disabled=${answers[currentQuestion] === undefined}
                onClick=${handleNext}
                className=${`flex-shrink-0 px-8 py-3 rounded-xl font-bold transition flex items-center ${answers[currentQuestion] !== undefined ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                ${currentQuestion === totalQuestions - 1 ? '結果を見る' : '次へ'} <${ChevronRight} className="ml-2" size=${18} />
              </button>
            </div>
          </${Fragment}>
        ` : html`
          <div className="text-center p-12">
            <div className=${`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-xl ${score >= totalQuestions * 0.8 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <${Trophy} size=${48} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">テスト終了！</h3>
            <p className="text-slate-500 mb-8">お疲れ様でした。あなたのスコアは...</p>
            <div className="text-6xl font-black text-indigo-600 mb-2 tracking-tighter">
              ${score} <span className="text-2xl text-slate-400 font-normal">/ ${totalQuestions}問</span>
            </div>
            <p className=${`text-lg font-bold mb-8 ${score >= totalQuestions * 0.8 ? 'text-teal-600' : 'text-rose-500'}`}>
              ${score >= totalQuestions * 0.8 ? '🎉 合格！理解度バッチリです！' : '惜しい！もう一度復習しましょう。'}
            </p>
            <button onClick=${handleFinish} className="bg-indigo-600 text-white font-bold py-3 px-10 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
              結果を保存して閉じる
            </button>
          </div>
        `}
      </div>
    </div>
  `;
};

const RoleplayModal = ({ isOpen, onClose, weapon, user, onComplete }) => {
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const steps = weapon.roleplay?.steps || [];
      setHistory(steps.length > 0 ? [{ role: 'customer', text: steps[0].customerText }] : []);
      setCurrentStep(0);
      setInputText('');
      setShowHint(false);
      setIsFinished(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const steps = weapon.roleplay?.steps || [];
  const customerProfile = weapon.roleplay?.customerProfile || '顧客';
  const situation = weapon.roleplay?.situation || weapon.overview || '';
  const step = steps[currentStep];

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userEntry = { role: 'user', text: inputText.trim() };
    let newHistory = [...history, userEntry];
    if (currentStep < steps.length - 1) {
      const nextStepData = steps[currentStep + 1];
      newHistory = [...newHistory, { role: 'customer', text: nextStepData.customerText }];
      setCurrentStep(currentStep + 1);
      setShowHint(false);
    } else {
      setIsFinished(true);
      onComplete && onComplete(weapon.id);
    }
    setHistory(newHistory);
    setInputText('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return html`
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style=${{ maxHeight: '90vh' }}>

        <!-- ヘッダー -->
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-start shrink-0">
          <div>
            <h3 className="font-bold text-xl text-slate-800 flex items-center">
              <${Swords} className="mr-2 text-emerald-600" size=${22} /> ロープレ実施
            </h3>
            <p className="text-sm text-slate-500 mt-1">${weapon.title}</p>
          </div>
          <div className="flex items-center gap-4">
            ${!isFinished && html`
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block mb-1">進捗</span>
                <span className="text-2xl font-bold text-emerald-600">${currentStep + 1}</span>
                <span className="text-slate-400 text-sm"> / ${steps.length}</span>
              </div>
            `}
            <button onClick=${onClose} className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-600">
              <${X} size=${20} />
            </button>
          </div>
        </div>

        ${!isFinished ? html`
          <!-- シナリオ情報 -->
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 shrink-0">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="font-bold text-emerald-700">顧客像：</span><span className="text-slate-600">${customerProfile}</span></div>
              <div><span className="font-bold text-emerald-700">状況：</span><span className="text-slate-600">${situation}</span></div>
            </div>
          </div>

          <!-- チャット履歴 -->
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            ${history.map((entry, i) => html`
              <div key=${i} className=${`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                ${entry.role === 'customer' ? html`
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                      <${User} size=${16} />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                      <p className="text-xs font-bold text-slate-400 mb-1">顧客</p>
                      <p className="text-sm text-slate-700 leading-relaxed">${entry.text}</p>
                    </div>
                  </div>
                ` : html`
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="bg-emerald-600 rounded-2xl rounded-tr-none px-4 py-3">
                      <p className="text-xs font-bold text-emerald-200 mb-1">あなた</p>
                      <p className="text-sm text-white leading-relaxed">${entry.text}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 font-bold text-sm">
                      ${user?.name?.charAt(0) || 'Y'}
                    </div>
                  </div>
                `}
              </div>
            `)}
            <div ref=${chatEndRef} />
          </div>

          <!-- ヒント -->
          ${step && html`
            <div className="px-5 pb-2 shrink-0">
              ${showHint ? html`
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <${Lightbulb} size=${16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">${step.hint}</p>
                </div>
              ` : html`
                <button
                  onClick=${() => setShowHint(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition"
                >
                  <${Lightbulb} size=${13} /> ヒントを見る
                </button>
              `}
            </div>
          `}

          <!-- 入力エリア -->
          <div className="border-t border-slate-100 p-4 shrink-0">
            <div className="flex gap-3 items-end">
              <textarea
                ref=${inputRef}
                value=${inputText}
                onInput=${(e) => setInputText(e.target.value)}
                onKeyDown=${handleKeyDown}
                placeholder="営業トークを入力してください（Enterで送信 / Shift+Enterで改行）"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                rows="3"
              />
              <button
                onClick=${handleSend}
                disabled=${!inputText.trim()}
                className=${`flex-shrink-0 px-5 py-3 rounded-xl font-bold transition flex items-center gap-1.5 ${inputText.trim() ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                送信 <${ChevronRight} size=${16} />
              </button>
            </div>
          </div>
        ` : html`
          <!-- 完了画面 -->
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-400 text-white mb-6 shadow-xl">
              <${Trophy} size=${48} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">ロープレ完了！</h3>
            <p className="text-slate-500 mb-2">お疲れ様でした。全${steps.length}ステップを実施しました。</p>
            <p className="text-sm text-slate-400 mb-8">振り返りを行い、実際の商談に活かしましょう。</p>
            <button onClick=${onClose} className="bg-emerald-600 text-white font-bold py-3 px-10 rounded-xl hover:bg-emerald-700 transition shadow-lg">
              結果を保存して閉じる
            </button>
          </div>
        `}
      </div>
    </div>
  `;
};

const UserListModal = ({ isOpen, onClose, title, users, color }) => {
  if (!isOpen) return null;
  return html`
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick=${onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick=${(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <${Users} size=${18} className=${color} />
            ${title}
            <span className="text-sm font-normal text-slate-400">（${users.length}名）</span>
          </h3>
          <button onClick=${onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <${X} size=${18} />
          </button>
        </div>
        ${users.length === 0 ? html`
          <div className="p-10 text-center text-slate-400 text-sm">まだいません</div>
        ` : html`
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            ${users.map((u, i) => html`
              <li key=${i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                    ${u.name.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-700">${u.name}</span>
                </div>
                <span className="text-xs text-slate-400">${u.date}</span>
              </li>
            `)}
          </ul>
        `}
      </div>
    </div>
  `;
};

const EXPORT_HEADERS = [
  'ID', 'タイトル', '業種', 'カテゴリ', 'タグ',
  '概要', '動画の要約', 'トークスクリプト', '動画URL', '動画タイトル',
  'TODO', 'チャプター(JSON)', 'クイズ(JSON)', 'テンプレート(JSON)', 'ダウンロード(JSON)',
  'ロープレ-顧客像', 'ロープレ-状況', 'ロープレ-ステップ(JSON)',
  'いいね数', 'お気に入り数', '理解した数', '実践している数',
  '更新日', '監修者名', '監修者役職', '登録者名', 'サムネイルURL',
];

const escCell = (s) => String(s ?? '').replace(/\t/g, '  ');
const escText = (s) => String(s ?? '').replace(/\t/g, '  ').replace(/\n/g, '\\n').replace(/\r/g, '');

const SpreadsheetExportModal = ({ isOpen, onClose, weapons, weaponThumbnails }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rows = weapons.map(w => [
    escCell(w.id),
    escCell(w.title),
    escCell(Array.isArray(w.businessType) ? w.businessType.join('・') : (w.businessType || '')),
    escCell((w.categories || []).join('・')),
    escCell((w.tags || []).join('・')),
    escText(w.overview),
    escText(w.summary),
    escText(w.transcript),
    escCell(w.videoUrl),
    escCell(w.videoTitle),
    escCell((w.todos || []).join('|')),
    escCell(JSON.stringify(w.timestamps || [])),
    escCell(JSON.stringify(w.quiz?.questions || [])),
    escCell(JSON.stringify(w.templates || [])),
    escCell(JSON.stringify(w.downloads || [])),
    escCell(w.roleplay?.customerProfile),
    escCell(w.roleplay?.situation),
    escCell(JSON.stringify(w.roleplay?.steps || [])),
    w.likes || 0,
    w.metrics?.favorites || 0,
    w.metrics?.understood || 0,
    w.metrics?.practicing || 0,
    escCell(w.updatedAt),
    escCell(w.supervisor?.name),
    escCell(w.supervisor?.role),
    escCell(w.createdBy?.name),
    escCell((weaponThumbnails || {})[w.id] || w.thumbnail),
  ]);

  const tsv = [EXPORT_HEADERS, ...rows].map(row => row.join('\t')).join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return html`
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick=${onClose}>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style=${{ maxHeight: '85vh' }} onClick=${(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <${FileText} size=${20} className="text-indigo-500" />
              スプレッドシート出力
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">全${weapons.length}件 / タブ区切り形式（Googleスプレッドシート等に貼り付け可）</p>
          </div>
          <button onClick=${onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <${X} size=${20} />
          </button>
        </div>
        <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
          <textarea
            readOnly
            value=${tsv}
            className="flex-1 w-full border border-slate-200 rounded-xl p-4 text-xs text-slate-600 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
          />
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick=${onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition">
            閉じる
          </button>
          <button
            onClick=${handleCopy}
            className=${`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${copied ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <${Copy} size=${16} />
            ${copied ? 'コピーしました！' : 'クリップボードにコピー'}
          </button>
        </div>
      </div>
    </div>
  `;
};

// CSV1行をダブルクォート対応でパース
const parseCsvLine = (line) => {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
};

const parseTsv = (text) => {
  const rawLines = text.trim().split('\n');
  if (rawLines.length === 0) return [];
  // タブが含まれる場合はタブ区切り、そうでなければカンマ区切り（CSV）と判定
  const isTab = rawLines[0].includes('\t');
  const lines = rawLines.map(l => isTab ? l.split('\t') : parseCsvLine(l));
  // 1行目がヘッダー行かどうか判定（ID列が数値でなければヘッダーとみなしスキップ）
  const start = (lines[0][0]?.trim() === 'ID' || (isNaN(Number(lines[0][0]?.trim())) && lines[0][0]?.trim() !== '')) ? 1 : 0;
  const safeJson = (str, fallback) => { try { return JSON.parse(str || ''); } catch { return fallback; } };
  const c = (cols, i) => cols[i]?.trim() || '';
  return lines.slice(start).filter(cols => cols.length >= 2 && cols[0] !== '').map(cols => ({
    id: c(cols, 0),
    title: c(cols, 1),
    businessType: cols[2] ? cols[2].split('・').map(s => s.trim()).filter(Boolean) : [],
    categories: cols[3] ? cols[3].split('・').map(s => s.trim()).filter(Boolean) : [],
    tags: cols[4] ? cols[4].split('・').map(s => s.trim()).filter(Boolean) : [],
    overview: c(cols, 5).replace(/\\n/g, '\n'),
    summary: c(cols, 6).replace(/\\n/g, '\n'),
    transcript: c(cols, 7).replace(/\\n/g, '\n'),
    videoUrl: c(cols, 8),
    videoTitle: c(cols, 9),
    todos: cols[10] ? cols[10].split('|').map(s => s.trim()).filter(Boolean) : [],
    timestamps: safeJson(c(cols, 11), []).map(ts => {
      const t = ts.time;
      const secs = typeof t === 'number' ? t : (() => {
        const parts = String(t || '0').split(':').map(Number);
        return parts.length === 2 ? parts[0] * 60 + (parts[1] || 0) : parts[0] || 0;
      })();
      return { label: ts.label || ts.title || '', time: secs };
    }),
    quiz: { questions: safeJson(c(cols, 12), []).map((q, i) => ({
      id: q.id ?? i + 1,
      text: q.text || q.question || '',
      options: q.options || q.choices || [],
      correctAnswer: q.correctAnswer ?? q.answer ?? 0,
      ...(q.explanation ? { explanation: q.explanation } : {}),
    })) },
    templates: safeJson(c(cols, 13), []),
    downloads: safeJson(c(cols, 14), []),
    roleplay: {
      customerProfile: c(cols, 15),
      situation: c(cols, 16),
      steps: safeJson(c(cols, 17), []),
      roleplays: [],
    },
    likes: parseInt(cols[18]) || 0,
    metrics: {
      favorites: parseInt(cols[19]) || 0,
      understood: parseInt(cols[20]) || 0,
      practicing: parseInt(cols[21]) || 0,
    },
    updatedAt: c(cols, 22) || new Date().toISOString().split('T')[0],
    supervisor: { name: c(cols, 23), role: c(cols, 24) },
    _importedCreatorName: c(cols, 25),
    thumbnail: c(cols, 26),
  }));
};

const SpreadsheetImportModal = ({ isOpen, onClose, weapons, onImport }) => {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null); // null | { adds, updates, errors }
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handlePreview = () => {
    if (!rawText.trim()) return;
    const parsed = parseTsv(rawText);
    const existingIds = new Set(weapons.map(w => String(w.id)));
    const adds = [], updates = [], errors = [];
    parsed.forEach(row => {
      if (!row.title) { errors.push(`ID "${row.id}" : タイトルが空です`); return; }
      if (existingIds.has(String(row.id))) {
        updates.push(row);
      } else {
        adds.push(row);
      }
    });
    setPreview({ adds, updates, errors });
  };

  const handleImport = () => {
    if (!preview) return;
    setImporting(true);
    onImport(preview.adds, preview.updates);
    setImporting(false);
    setRawText('');
    setPreview(null);
    onClose();
  };

  const handleReset = () => { setPreview(null); };

  return html`
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick=${onClose}>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style=${{ maxHeight: '90vh' }} onClick=${(e) => e.stopPropagation()}>

        <!-- ヘッダー -->
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <${Download} size=${20} className="text-teal-500" />
              スプレッドシート入力
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">タブ区切り形式のデータを貼り付けて武器を一括登録・更新</p>
          </div>
          <button onClick=${onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <${X} size=${20} />
          </button>
        </div>

        ${!preview ? html`
          <!-- 入力エリア -->
          <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 shrink-0">
              <p className="font-bold text-slate-600 mb-1">列の順番（タブ区切り・全${EXPORT_HEADERS.length}列）</p>
              <p className="font-mono text-slate-400 break-all leading-relaxed">${EXPORT_HEADERS.join(' | ')}</p>
              <p className="mt-1.5 text-slate-400">※ タブ区切り・カンマ区切り（CSV）どちらも自動判定して取り込みます。1行目のヘッダー行は自動スキップ。IDが既存レコードと一致する場合は上書き更新、新しいIDは追加登録。TODO は「|」区切り、配列・JSONフィールドはJSON形式で入力してください。</p>
            </div>
            <textarea
              className="flex-1 w-full border border-slate-200 rounded-xl p-4 text-xs text-slate-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              placeholder="ここにタブ区切りデータを貼り付けてください..."
              value=${rawText}
              onInput=${(e) => setRawText(e.target.value)}
            />
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button onClick=${onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition">
              キャンセル
            </button>
            <button
              onClick=${handlePreview}
              disabled=${!rawText.trim()}
              className=${`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition ${rawText.trim() ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <${Search} size=${16} /> 内容を確認する
            </button>
          </div>
        ` : html`
          <!-- プレビュー -->
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            <!-- サマリー -->
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-teal-600">${preview.adds.length}</div>
                <div className="text-xs font-bold text-teal-700 mt-1">新規追加</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-indigo-600">${preview.updates.length}</div>
                <div className="text-xs font-bold text-indigo-700 mt-1">上書き更新</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-rose-600">${preview.errors.length}</div>
                <div className="text-xs font-bold text-rose-700 mt-1">エラー</div>
              </div>
            </div>

            <!-- エラー -->
            ${preview.errors.length > 0 && html`
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                  <${AlertTriangle} size=${15} /> エラー（これらの行はスキップされます）
                </p>
                <ul className="space-y-1">
                  ${preview.errors.map((e, i) => html`<li key=${i} className="text-xs text-rose-600">${e}</li>`)}
                </ul>
              </div>
            `}

            <!-- 新規追加 -->
            ${preview.adds.length > 0 && html`
              <div>
                <p className="text-sm font-bold text-teal-700 mb-2">新規追加（${preview.adds.length}件）</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">ID</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">タイトル</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">業種</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">更新日</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      ${preview.adds.map((row, i) => html`
                        <tr key=${i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-slate-400">${row.id}</td>
                          <td className="px-3 py-2 font-bold text-slate-700">${row.title}</td>
                          <td className="px-3 py-2 text-slate-500">${Array.isArray(row.businessType) ? row.businessType.join('・') : row.businessType}</td>
                          <td className="px-3 py-2 text-slate-400">${row.updatedAt}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              </div>
            `}

            <!-- 更新 -->
            ${preview.updates.length > 0 && html`
              <div>
                <p className="text-sm font-bold text-indigo-700 mb-2">上書き更新（${preview.updates.length}件）</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">ID</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">タイトル</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">業種</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-bold">更新日</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      ${preview.updates.map((row, i) => html`
                        <tr key=${i} className="hover:bg-indigo-50">
                          <td className="px-3 py-2 font-mono text-slate-400">${row.id}</td>
                          <td className="px-3 py-2 font-bold text-slate-700">${row.title}</td>
                          <td className="px-3 py-2 text-slate-500">${Array.isArray(row.businessType) ? row.businessType.join('・') : row.businessType}</td>
                          <td className="px-3 py-2 text-slate-400">${row.updatedAt}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              </div>
            `}
          </div>

          <div className="p-4 border-t border-slate-100 flex justify-between items-center shrink-0">
            <button onClick=${handleReset} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition flex items-center gap-1.5">
              ← 修正する
            </button>
            <button
              onClick=${handleImport}
              disabled=${importing || (preview.adds.length === 0 && preview.updates.length === 0)}
              className=${`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition ${(preview.adds.length > 0 || preview.updates.length > 0) ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <${CheckSquare} size=${16} />
              ${importing ? '処理中...' : `${preview.adds.length + preview.updates.length}件をインポート`}
            </button>
          </div>
        `}
      </div>
    </div>
  `;
};

const CompletedUsersTooltip = ({ users }) => html`
  <div className="group relative flex items-center">
    <div className="flex items-center bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm cursor-help hover:border-indigo-300 hover:text-indigo-600 transition">
      <${Users} size=${14} className="mr-2 text-slate-400 group-hover:text-indigo-500" />
      <span className="text-sm font-bold text-slate-700">${users.length}名</span>
      <span className="text-xs text-slate-400 ml-1">が実施済み</span>
    </div>
    ${users.length > 0 && html`
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs rounded-xl py-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        <div className="font-bold mb-2 border-b border-slate-600 pb-1 text-slate-300">実施者リスト</div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          ${users.map((u, i) => html`
            <li key=${i} className="flex justify-between items-center">
              <span>${u.name}</span>
              <span className="text-slate-500 text-xs">${u.date}</span>
            </li>
          `)}
        </ul>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
      </div>
    `}
  </div>
`;

const HeaderMenu = ({ isOpen, onClose, user, onLogout, navigateTo, onShowSpreadsheet, onShowSpreadsheetImport }) => {
  if (!isOpen) return null;
  return html`
    <${Fragment}>
      <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40" onClick=${onClose}></div>
      <div className="fixed top-20 right-4 w-64 bg-white rounded-xl shadow-xl z-50 border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-500">ログイン中</p>
          <p className="font-bold text-slate-800">${user?.name}</p>
        </div>
        <nav className="p-2">
          <button onClick=${() => { navigateTo('home'); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center text-sm">
            <${Home} size=${18} className="mr-3 text-slate-400" /> ホーム
          </button>
          <button onClick=${() => { navigateTo('list'); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center text-sm">
            <${Search} size=${18} className="mr-3 text-slate-400" /> 武器を探す
          </button>
          <button onClick=${() => { navigateTo('admin'); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center text-sm">
            <${Menu} size=${18} className="mr-3 text-slate-400" /> コンテンツ管理
          </button>
          <button onClick=${() => { navigateTo('staff'); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center text-sm">
            <${Users} size=${18} className="mr-3 text-slate-400" /> スタッフ管理
          </button>
          <hr className="my-2 border-slate-100" />
          <button onClick=${() => { onShowSpreadsheet(); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 text-indigo-600 flex items-center text-sm">
            <${FileText} size=${18} className="mr-3" /> スプレッドシート出力
          </button>
          <button onClick=${() => { onShowSpreadsheetImport(); onClose(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-teal-50 text-teal-600 flex items-center text-sm">
            <${Download} size=${18} className="mr-3" /> スプレッドシート入力
          </button>
          <hr className="my-2 border-slate-100" />
          <button onClick=${onLogout} className="w-full text-left px-4 py-3 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center text-sm">
            <${LogOut} size=${18} className="mr-3" /> ログアウト
          </button>
        </nav>
      </div>
    </${Fragment}>
  `;
};

const SupervisorBadge = ({ supervisor }) => {
  if (!supervisor) return null;
  return html`
    <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">
        ${supervisor.name.charAt(0)}
      </div>
      <span className="text-xs text-slate-500">${supervisor.role}</span>
      <span className="text-sm font-bold text-slate-700">${supervisor.name}</span>
    </div>
  `;
};

const LikesBadge = ({ count, active, onClick }) => html`
  <button
    onClick=${(e) => { e.stopPropagation(); onClick && onClick(); }}
    className=${`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition ${active ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
  >
    <${Heart} size=${16} className=${active ? 'fill-current' : ''} />
    <span className="text-sm font-bold">${count}</span>
  </button>
`;

// ------------------------------------------------------------------
// メインアプリ
// ------------------------------------------------------------------
export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [weapons, setWeapons] = useState([...INITIAL_WEAPONS]);
  const [selectedWeaponId, setSelectedWeaponId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBusinessType, setSelectedBusinessType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [todoProgress, setTodoProgress] = useState({});
  const [likedWeapons, setLikedWeapons] = useState([]);
  const [favoritedWeapons, setFavoritedWeapons] = useState([]);
  const [understoodWeapons, setUnderstoodWeapons] = useState([]);
  const [practicingWeapons, setPracticingWeapons] = useState([]);
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [weaponThumbnails, setWeaponThumbnails] = useState({});
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [showWeaponForm, setShowWeaponForm] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState(null);
  const [userListModal, setUserListModal] = useState(null);
  const [isRoleplayModalOpen, setIsRoleplayModalOpen] = useState(false);
  const [showSpreadsheetExport, setShowSpreadsheetExport] = useState(false);
  const [showSpreadsheetImport, setShowSpreadsheetImport] = useState(false);

  useEffect(() => {
    const savedProgress = localStorage.getItem('sales_arsenal_todos');
    if (savedProgress) setTodoProgress(JSON.parse(savedProgress));
    const savedLikes = localStorage.getItem('sales_arsenal_likes');
    if (savedLikes) setLikedWeapons(JSON.parse(savedLikes));
    const savedFavorites = localStorage.getItem('sales_arsenal_favorites');
    if (savedFavorites) setFavoritedWeapons(JSON.parse(savedFavorites));
    const savedUnderstood = localStorage.getItem('sales_arsenal_understood');
    if (savedUnderstood) setUnderstoodWeapons(JSON.parse(savedUnderstood));
    const savedPracticing = localStorage.getItem('sales_arsenal_practicing');
    if (savedPracticing) setPracticingWeapons(JSON.parse(savedPracticing));
    const savedThumbnails = localStorage.getItem('sales_arsenal_thumbnails');
    if (savedThumbnails) setWeaponThumbnails(JSON.parse(savedThumbnails));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userData = await getUserDoc(firebaseUser.uid);
          if (!userData) {
            const defaultData = { email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email.split('@')[0], role: 'user' };
            await upsertUserDoc(firebaseUser.uid, defaultData);
            userData = defaultData;
          }
          setUser({ uid: firebaseUser.uid, ...userData });
          setCurrentView('home');
        } catch (err) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email.split('@')[0], role: 'user' });
          setCurrentView('home');
        }
      } else {
        setUser(null); setCurrentView('login'); setIsMenuOpen(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const thumbnailByTitle = Object.fromEntries(
      INITIAL_WEAPONS.filter(w => w.thumbnail).map(w => [w.title, w.thumbnail])
    );
    const unsubscribe = subscribeToWeapons((firestoreWeapons) => {
      if (firestoreWeapons.length > 0) {
        setWeapons(firestoreWeapons.map(w => ({
          ...w,
          thumbnail: w.thumbnail || thumbnailByTitle[w.title] || undefined,
        })));
      } else {
        seedWeaponsIfEmpty();
      }
    });
    return unsubscribe;
  }, [user]);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const toggleUnderstood = (weaponId) => {
    const today = new Date().toISOString().split('T')[0];
    let newList;
    if (understoodWeapons.includes(weaponId)) {
      newList = understoodWeapons.filter(id => id !== weaponId);
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, understood: (w.metrics?.understood ?? 0) - 1 }, understoodBy: (w.understoodBy || []).filter(u => u.id !== user.uid) } : w));
    } else {
      newList = [...understoodWeapons, weaponId];
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, understood: (w.metrics?.understood ?? 0) + 1 }, understoodBy: [...(w.understoodBy || []), { id: user.uid, name: user.name, date: today }] } : w));
    }
    setUnderstoodWeapons(newList);
    localStorage.setItem('sales_arsenal_understood', JSON.stringify(newList));
  };

  const togglePracticing = (weaponId) => {
    const today = new Date().toISOString().split('T')[0];
    let newList;
    if (practicingWeapons.includes(weaponId)) {
      newList = practicingWeapons.filter(id => id !== weaponId);
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, practicing: (w.metrics?.practicing ?? 0) - 1 }, practicingBy: (w.practicingBy || []).filter(u => u.id !== user.uid) } : w));
    } else {
      newList = [...practicingWeapons, weaponId];
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, practicing: (w.metrics?.practicing ?? 0) + 1 }, practicingBy: [...(w.practicingBy || []), { id: user.uid, name: user.name, date: today }] } : w));
    }
    setPracticingWeapons(newList);
    localStorage.setItem('sales_arsenal_practicing', JSON.stringify(newList));
  };

  const toggleFavorite = (weaponId) => {
    const today = new Date().toISOString().split('T')[0];
    let newFavorited;
    if (favoritedWeapons.includes(weaponId)) {
      newFavorited = favoritedWeapons.filter(id => id !== weaponId);
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, favorites: (w.metrics?.favorites ?? 0) - 1 }, favoritedBy: (w.favoritedBy || []).filter(u => u.id !== user.uid) } : w));
    } else {
      newFavorited = [...favoritedWeapons, weaponId];
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, metrics: { ...w.metrics, favorites: (w.metrics?.favorites ?? 0) + 1 }, favoritedBy: [...(w.favoritedBy || []), { id: user.uid, name: user.name, date: today }] } : w));
    }
    setFavoritedWeapons(newFavorited);
    localStorage.setItem('sales_arsenal_favorites', JSON.stringify(newFavorited));
  };

  const getWeaponThumbnail = (weapon) => weaponThumbnails[weapon.id] || weapon.thumbnail || null;

  const DRIVE_FOLDER_ID = '1oDQLLcRm5-qUAWsO_OVSHrxlsXMaOZcR';

  const uploadToDrive = async (file) => {
    let token = googleAccessToken;
    if (!token) {
      try {
        token = await refreshGoogleToken();
        if (token) setGoogleAccessToken(token);
      } catch (_) {}
    }
    if (!token) throw new Error('Googleログインが必要です。一度ログアウトして再ログインしてください');

    const buildForm = () => {
      const metadata = {
        name: `thumb_${Date.now()}_${file.name || 'image'}`,
        mimeType: file.type || 'image/jpeg',
        parents: [DRIVE_FOLDER_ID],
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      return form;
    };

    const doUpload = (t) => fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: buildForm() }
    );

    let res = await doUpload(token);
    if (res.status === 401) {
      try {
        token = await refreshGoogleToken();
        if (token) setGoogleAccessToken(token);
      } catch (_) {}
      if (!token) throw new Error('アクセストークンの更新に失敗しました');
      res = await doUpload(token);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`アップロード失敗 (${res.status}): ${body}`);
    }
    const { id: fileId } = await res.json();

    // 公開設定（失敗しても続行）
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
    } catch (_) {}

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  };

  const saveWeaponThumbnail = (weaponId, url) => {
    const next = { ...weaponThumbnails, [weaponId]: url };
    setWeaponThumbnails(next);
    localStorage.setItem('sales_arsenal_thumbnails', JSON.stringify(next));
  };

  const saveWeapon = async (weaponData) => {
    const { thumbnailUrl, ...weaponFields } = weaponData;
    let savedId;
    if (weaponFields.id) {
      savedId = weaponFields.id;
      const { id, ...fields } = weaponFields;
      await updateWeapon(savedId, { ...fields, updatedAt: new Date().toISOString().split('T')[0] });
    } else {
      const newWeapon = {
        ...weaponFields,
        createdBy: { id: user.uid, name: user.name },
        likes: 0,
        metrics: { favorites: 0, understood: 0, practicing: 0 },
        completedBy: [],
        timestamps: [],
        updatedAt: new Date().toISOString().split('T')[0],
        supervisor: { name: user.name, role: user.role === 'admin' ? '管理者' : 'スタッフ' },
      };
      const docRef = await addWeapon(newWeapon);
      savedId = docRef.id;
    }
    if (thumbnailUrl !== undefined) saveWeaponThumbnail(savedId, thumbnailUrl);
    setShowWeaponForm(false);
    setEditingWeapon(null);
    showToast(weaponFields.id ? '武器を更新しました' : '武器を登録しました！', 'success');
  };

  const toggleLike = (weaponId) => {
    const today = new Date().toISOString().split('T')[0];
    let newLiked;
    if (likedWeapons.includes(weaponId)) {
      newLiked = likedWeapons.filter(id => id !== weaponId);
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, likes: w.likes - 1, likedBy: (w.likedBy || []).filter(u => u.id !== user.uid) } : w));
    } else {
      newLiked = [...likedWeapons, weaponId];
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, likes: w.likes + 1, likedBy: [...(w.likedBy || []), { id: user.uid, name: user.name, date: today }] } : w));
    }
    setLikedWeapons(newLiked);
    localStorage.setItem('sales_arsenal_likes', JSON.stringify(newLiked));
  };

  const handleGoogleLogin = async () => {
    const token = await loginWithGoogle();
    if (token) setGoogleAccessToken(token);
  };
  const handleLogout = async () => { await logout(); };

  const navigateTo = (view, params = {}) => {
    if (params.weaponId) setSelectedWeaponId(params.weaponId);
    if (params.category) setSelectedCategory(params.category);
    if (view === 'home') {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedBusinessType('all');
      setSelectedEngagement(null);
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleBusinessTypeSelect = (type) => {
    setSelectedBusinessType(selectedBusinessType === type ? 'all' : type);
  };

  const handleQuizComplete = (weaponId, score) => {
    const weapon = weapons.find(w => w.id === weaponId);
    const alreadyCompleted = weapon.completedBy.some(u => u.name === user.name);
    if (!alreadyCompleted) {
      const today = new Date().toISOString().split('T')[0];
      const newCompletion = { id: `u_${Date.now()}`, name: user.name, date: today };
      setWeapons(weapons.map(w => w.id === weaponId ? { ...w, completedBy: [...w.completedBy, newCompletion], metrics: { ...w.metrics, understood: w.metrics.understood + 1 } } : w));
      showToast(`テスト完了！ ${score}点でした`, 'success');
    } else {
      showToast(`テスト完了！ ${score}点でした（記録済み）`, 'success');
    }
  };

  const handleRoleplayComplete = (weaponId) => {
    const today = new Date().toISOString().split('T')[0];
    const newRecord = { id: `rp_${Date.now()}`, name: user.name, date: today };
    setWeapons(weapons.map(w => {
      if (w.id !== weaponId) return w;
      const prevRoleplays = w.roleplay?.roleplays || [];
      return { ...w, roleplay: { ...w.roleplay, roleplays: [...prevRoleplays, newRecord] } };
    }));
    showToast('ロープレ完了！お疲れ様でした', 'success');
  };

  const handleSpreadsheetImport = async (adds, updates) => {
    const applyRow = (existing, row) => ({
      ...existing,
      title: row.title,
      businessType: row.businessType,
      categories: row.categories,
      tags: row.tags,
      overview: row.overview,
      summary: row.summary,
      transcript: row.transcript,
      videoUrl: row.videoUrl,
      videoTitle: row.videoTitle,
      todos: row.todos,
      timestamps: row.timestamps,
      quiz: row.quiz,
      templates: row.templates,
      downloads: row.downloads,
      roleplay: {
        ...(existing?.roleplay || {}),
        customerProfile: row.roleplay.customerProfile,
        situation: row.roleplay.situation,
        steps: row.roleplay.steps,
      },
      likes: row.likes,
      metrics: row.metrics,
      updatedAt: row.updatedAt,
      supervisor: row.supervisor,
    });

    // 更新：Firestoreに書き込む
    await Promise.all(updates.map(row => {
      const existing = weapons.find(w => String(w.id) === String(row.id)) || {};
      const { id, ...fields } = applyRow(existing, row);
      return updateWeapon(String(row.id), fields);
    }));

    // 追加：Firestoreに書き込む
    await Promise.all(adds.map(row => {
      const { id, ...fields } = applyRow({}, row);
      return addWeapon({ ...fields, completedBy: [] });
    }));

    // サムネイルURLを個別に保存
    const newThumbnails = { ...weaponThumbnails };
    [...adds, ...updates].forEach(row => {
      if (row.thumbnail) newThumbnails[row.id] = row.thumbnail;
    });
    setWeaponThumbnails(newThumbnails);
    localStorage.setItem('sales_arsenal_thumbnails', JSON.stringify(newThumbnails));

    showToast(`インポート完了：追加${adds.length}件・更新${updates.length}件`, 'success');
  };

  // ----------------------------------------------------------------
  // レイアウトコンポーネント
  // ----------------------------------------------------------------

  const CategoryFlow = () => {
    const phase0 = CATEGORIES.filter(c => c.group === 'phase0');
    const phase1 = CATEGORIES.filter(c => c.group === 'phase1');
    const phase2 = CATEGORIES.filter(c => c.group === 'phase2');
    const phase3 = CATEGORIES.filter(c => c.group === 'phase3');

    const renderCategoryButton = (cat) => html`
      <button
        key=${cat.id}
        onClick=${() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
        className=${`${cat.color} ${selectedCategory === cat.id ? 'ring-2 ring-offset-1 ring-indigo-500' : 'opacity-90 hover:opacity-100'} w-full p-2.5 rounded-md text-sm font-bold flex items-center justify-start transition active:scale-95 mb-2`}
      >
        <span className="bg-white/20 p-1 rounded mr-2"><${cat.iconComp} size=${14} /></span>
        <span className="truncate">${cat.name}</span>
      </button>
    `;

    return html`
      <div className="fixed top-0 left-0 bottom-0 w-64 bg-slate-50 border-r border-slate-200 z-50 overflow-hidden flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-2 text-indigo-700">
            <${Shield} size=${24} className="fill-indigo-600 text-indigo-600" />
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">営業の武器庫</h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">Sales Arsenal</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="mb-4">
            <p className="text-xs font-bold text-amber-600 mb-2 pl-1">来場前</p>
            ${phase0.map(renderCategoryButton)}
          </div>
          <div className="flex justify-center my-2"><${ArrowDown} className="text-slate-300" size=${16} /></div>
          <div className="mb-4">
            <p className="text-xs font-bold text-indigo-700 mb-2 pl-1">集客・初回接触</p>
            ${phase1.map(renderCategoryButton)}
          </div>
          <div className="flex justify-center my-2"><${ArrowDown} className="text-slate-300" size=${16} /></div>
          <div className="mb-4">
            <p className="text-xs font-bold text-teal-700 mb-2 pl-1">次回アポ取得</p>
            ${phase2.map(renderCategoryButton)}
          </div>
          <div className="flex justify-center my-2"><${ArrowDown} className="text-slate-300" size=${16} /></div>
          <div className="mb-4">
            <p className="text-xs font-bold text-rose-700 mb-2 pl-1">商談</p>
            ${phase3.map(renderCategoryButton)}
          </div>
        </div>
        <div className="p-2 border-t border-slate-200 bg-slate-100 text-xs text-center text-slate-400">
          v2.5.0 with Quiz
        </div>
      </div>
    `;
  };

  const ENGAGEMENT_FILTERS = [
    { id: 'liked',      label: 'いいね',      icon: Heart,     active: 'bg-pink-50 text-pink-600 border-pink-300',     inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50', list: likedWeapons },
    { id: 'favorited',  label: 'お気に入り',  icon: Star,      active: 'bg-yellow-50 text-yellow-600 border-yellow-300', inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50', list: favoritedWeapons },
    { id: 'understood', label: '理解した',    icon: Lightbulb, active: 'bg-emerald-50 text-emerald-600 border-emerald-300', inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50', list: understoodWeapons },
    { id: 'practicing', label: '実践している', icon: Zap,       active: 'bg-purple-50 text-purple-600 border-purple-300', inactive: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50', list: practicingWeapons },
  ];

  const Header = () => html`
    <div className="bg-white text-slate-800 px-4 py-2 shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">

        <!-- HOMEボタン -->
        <button
          onClick=${() => navigateTo('home')}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition border border-slate-200 hover:border-indigo-200 shrink-0"
        >
          <${Home} size=${13} />
          <span>HOME</span>
        </button>

        <div className="h-5 w-px bg-slate-200 shrink-0"></div>

        <!-- 業種タブ -->
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          ${BUSINESS_TYPES.map(type => html`
            <button
              key=${type}
              onClick=${() => handleBusinessTypeSelect(type)}
              className=${`px-3 py-1.5 text-sm font-bold rounded-md transition ${selectedBusinessType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              ${type}
            </button>
          `)}
        </div>

        <div className="h-5 w-px bg-slate-200 shrink-0"></div>

        <!-- エンゲージメントフィルター -->
        <${SlidersHorizontal} size=${14} className="text-slate-400 shrink-0" />
        <div className="flex items-center gap-1 shrink-0">
          ${ENGAGEMENT_FILTERS.map(({ id, label, icon: Icon, active, inactive, list }) => html`
            <button
              key=${id}
              onClick=${() => setSelectedEngagement(selectedEngagement === id ? null : id)}
              className=${`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition ${selectedEngagement === id ? active : inactive}`}
            >
              <${Icon} size=${11} className="fill-current" />
              ${label}
              ${list.length > 0 && html`
                <span className=${`px-1 rounded-full text-xs font-bold ${selectedEngagement === id ? 'bg-white/70' : 'bg-slate-100 text-slate-400'}`}>
                  ${list.length}
                </span>
              `}
            </button>
          `)}
        </div>

        <div className="h-5 w-px bg-slate-200 shrink-0"></div>

        <!-- キーワード検索 -->
        <div className="relative w-40 shrink-0">
          <input
            type="text"
            placeholder="キーワードで検索..."
            className="w-full py-1.5 pl-8 pr-3 rounded-full bg-slate-100 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition placeholder-slate-400 text-sm"
            value=${searchQuery}
            onChange=${(e) => setSearchQuery(e.target.value)}
            onKeyDown=${(e) => { if (e.key === 'Enter') navigateTo('list'); }}
          />
          <${Search} className="absolute left-2.5 top-2 text-slate-400" size=${13} />
        </div>

        <!-- 右端グループ: 武器登録 + ユーザーメニュー -->
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick=${() => { setEditingWeapon(null); setShowWeaponForm(true); }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
          >
            <${Plus} size=${14} /> 武器登録
          </button>
          <button
            onClick=${() => setIsMenuOpen(true)}
            className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition border border-transparent hover:border-slate-200"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700">${user?.name}</p>
              <p className="text-xs text-slate-500">${user?.role === 'admin' ? '管理者' : '一般ユーザー'}</p>
            </div>
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
              <${User} size=${16} />
            </div>
            <${Menu} size=${18} className="text-slate-400" />
          </button>
        </div>

      </div>
    </div>
  `;

  const BottomNav = () => html`
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-around items-center h-16">
        ${[{ id: 'home', iconComp: Home, label: 'ホーム' }, { id: 'list', iconComp: Search, label: '探す' }].map((item) => html`
          <button
            key=${item.id}
            onClick=${() => navigateTo(item.id)}
            className=${`flex flex-col items-center justify-center w-full h-full ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className=${currentView === item.id ? 'transform scale-110 transition' : ''}><${item.iconComp} size=${24} /></div>
            <span className="text-xs font-medium mt-1">${item.label}</span>
          </button>
        `)}
        <button onClick=${() => navigateTo('admin')} className=${`flex flex-col items-center justify-center w-full h-full ${currentView === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <${Menu} size=${24} />
          <span className="text-xs font-medium mt-1">管理</span>
        </button>
        <button onClick=${() => navigateTo('staff')} className=${`flex flex-col items-center justify-center w-full h-full ${currentView === 'staff' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <${Users} size=${24} />
          <span className="text-xs font-medium mt-1">スタッフ</span>
        </button>
      </div>
    </div>
  `;

  // ----------------------------------------------------------------
  // ビュー
  // ----------------------------------------------------------------

  const LoginView = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleClick = async () => {
      setError(''); setLoading(true);
      try { await handleGoogleLogin(); }
      catch (err) { if (err.code !== 'auth/popup-closed-by-user') setError('ログインに失敗しました。もう一度お試しください'); }
      finally { setLoading(false); }
    };
    return html`
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <${Sword} className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">営業の武器庫</h1>
            <p className="text-sm text-gray-500 mt-1">スキルを武器にする営業プラットフォーム</p>
          </div>
          ${error && html`<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">${error}</p>`}
          <button
            onClick=${handleClick}
            disabled=${loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            ${loading ? html`
              <${Fragment}><${Loader2} className="w-4 h-4 animate-spin" /> ログイン中...</${Fragment}>
            ` : html`
              <${Fragment}>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path style=${{ fill: '#4285F4' }} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path style=${{ fill: '#34A853' }} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path style=${{ fill: '#FBBC05' }} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path style=${{ fill: '#EA4335' }} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </${Fragment}>
            `}
          </button>
          <p className="text-xs text-center text-gray-400 mt-6">会社のGoogleアカウントでログインしてください</p>
        </div>
      </div>
    `;
  };

  const HomeView = () => {
    const filteredWeapons = weapons.filter(w => {
      const matchesCategory = selectedCategory === 'all' || (w.categories && w.categories.includes(selectedCategory));
      const matchesSearch = w.title.includes(searchQuery) || w.tags.some(t => t.includes(searchQuery));
      const matchesBusinessType = selectedBusinessType === 'all' ||
        (Array.isArray(w.businessType) ? w.businessType.includes(selectedBusinessType) : w.businessType === selectedBusinessType);
      const matchesEngagement =
        !selectedEngagement ||
        (selectedEngagement === 'liked' && likedWeapons.includes(w.id)) ||
        (selectedEngagement === 'favorited' && favoritedWeapons.includes(w.id)) ||
        (selectedEngagement === 'understood' && understoodWeapons.includes(w.id)) ||
        (selectedEngagement === 'practicing' && practicingWeapons.includes(w.id));
      return matchesCategory && matchesSearch && matchesBusinessType && matchesEngagement;
    });
    const displayWeapons = filteredWeapons.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return html`
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700 flex items-center text-lg">
            <${Bell} size=${20} className="mr-2 text-indigo-600" />
            ${selectedCategory === 'all' ? '最新の武器' : `${selectedCategory} の武器`}
          </h3>
          <span className="text-sm font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">${displayWeapons.length}件</span>
        </div>
        ${displayWeapons.length === 0 ? html`
          <div className="text-center text-slate-500 mt-10 bg-white p-10 rounded-2xl border border-dashed border-slate-300">
            <${Search} size=${48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg">該当する武器が見つかりません</p>
            <p className="text-sm mt-2 mb-4">条件を変更して再度お試しください</p>
            <button onClick=${() => { setSearchQuery(''); setSelectedBusinessType('all'); setSelectedCategory('all'); }} className="text-indigo-600 font-bold hover:underline mt-4">
              条件をクリアする
            </button>
          </div>
        ` : html`
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            ${displayWeapons.map((weapon) => html`
              <div
                key=${weapon.id}
                onClick=${() => navigateTo('detail', { weaponId: weapon.id })}
                className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition group overflow-hidden"
              >
                <!-- メインコンテンツ -->
                <div className="flex-1 flex flex-col min-w-0 p-4">
                  <div className="mb-2 flex flex-wrap gap-1">
                    ${(Array.isArray(weapon.businessType) ? weapon.businessType : [weapon.businessType]).map(bt => html`
                      <span key=${bt} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">${bt}</span>
                    `)}
                    ${weapon.categories && weapon.categories.slice(0, 2).map(cat => html`
                      <span key=${cat} className="text-xs font-bold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded">${cat}</span>
                    `)}
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mb-2 line-clamp-2 group-hover:text-indigo-700 transition">${weapon.title}</h4>
                  ${getWeaponThumbnail(weapon) && html`
                    <img src=${getWeaponThumbnail(weapon)} alt=${weapon.title} className="w-full h-36 object-cover rounded-lg mb-2" />
                  `}
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">${weapon.overview}</p>
                  <div className="mt-auto pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <${SupervisorBadge} supervisor=${weapon.supervisor} />
                      <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <${Calendar} size=${11} />
                        ${weapon.updatedAt}
                      </span>
                    </div>
                  </div>
                </div>
                <!-- 下: 横並びボタン -->
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-4 flex-wrap">
                  <button
                    onClick=${(e) => { e.stopPropagation(); toggleLike(weapon.id); }}
                    className=${`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-xs ${likedWeapons.includes(weapon.id) ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <${Heart} size=${12} className=${`fill-current ${likedWeapons.includes(weapon.id) ? 'text-pink-500' : 'text-pink-200'}`} />
                    <span className="font-bold">${weapon.likes}</span>
                  </button>
                  <button
                    onClick=${(e) => { e.stopPropagation(); toggleFavorite(weapon.id); }}
                    className=${`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-xs ${favoritedWeapons.includes(weapon.id) ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <${Star} size=${12} className=${`fill-current ${favoritedWeapons.includes(weapon.id) ? 'text-yellow-500' : 'text-yellow-300'}`} />
                    <span className="font-bold">${weapon.metrics?.favorites ?? 0}</span>
                  </button>
                  <button
                    onClick=${(e) => { e.stopPropagation(); toggleUnderstood(weapon.id); }}
                    className=${`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-xs ${understoodWeapons.includes(weapon.id) ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <${Lightbulb} size=${12} className=${`fill-current ${understoodWeapons.includes(weapon.id) ? 'text-emerald-500' : 'text-emerald-300'}`} />
                    <span className="font-bold">${weapon.metrics?.understood ?? 0}</span>
                  </button>
                  <button
                    onClick=${(e) => { e.stopPropagation(); togglePracticing(weapon.id); }}
                    className=${`flex items-center gap-1 px-2 py-1 rounded-lg border transition text-xs ${practicingWeapons.includes(weapon.id) ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <${Zap} size=${12} className=${`fill-current ${practicingWeapons.includes(weapon.id) ? 'text-purple-500' : 'text-purple-300'}`} />
                    <span className="font-bold">${weapon.metrics?.practicing ?? 0}</span>
                  </button>
                  <span className="flex items-center gap-1 ml-auto bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
                    詳細 <${ChevronRight} size=${13} />
                  </span>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    `;
  };

  const DetailView = () => {
    const weapon = weapons.find(w => w.id === selectedWeaponId);
    if (!weapon) return html`<div>武器が見つかりません</div>`;

    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [activeVideoUrl, setActiveVideoUrl] = useState(weapon.videoUrl);

    useEffect(() => { setIsVideoPlaying(false); setActiveVideoUrl(weapon.videoUrl); }, [weapon.id, weapon.videoUrl]);

    const playVideo = (startTime = 0) => {
      const separator = weapon.videoUrl.includes('?') ? '&' : '?';
      setActiveVideoUrl(`${weapon.videoUrl}${separator}start=${startTime}&autoplay=1`);
      setIsVideoPlaying(true);
    };

    const toggleTodo = (todoIndex) => {
      const key = `weapon_${weapon.id}`;
      const currentTodos = todoProgress[key] || [];
      const newTodos = currentTodos.includes(todoIndex) ? currentTodos.filter(i => i !== todoIndex) : [...currentTodos, todoIndex];
      const newProgress = { ...todoProgress, [key]: newTodos };
      setTodoProgress(newProgress);
      localStorage.setItem('sales_arsenal_todos', JSON.stringify(newProgress));
    };

    const isTodoChecked = (index) => (todoProgress[`weapon_${weapon.id}`] || []).includes(index);

    const currentThumbnail = getWeaponThumbnail(weapon);

    const handleCopy = (text) => {
      navigator.clipboard.writeText(text);
      showToast('クリップボードにコピーしました！', 'success');
    };

    return html`
      <div className="pb-24 md:pb-0">
        <${UserListModal}
          isOpen=${userListModal !== null}
          onClose=${() => setUserListModal(null)}
          title=${userListModal?.title || ''}
          users=${userListModal?.users || []}
          color=${userListModal?.color || 'text-indigo-500'}
        />
        <${QuizModal}
          isOpen=${isQuizModalOpen}
          onClose=${() => setIsQuizModalOpen(false)}
          weapon=${weapon}
          onComplete=${handleQuizComplete}
          currentUser=${user}
        />
        <${RoleplayModal}
          isOpen=${isRoleplayModalOpen}
          onClose=${() => setIsRoleplayModalOpen(false)}
          weapon=${weapon}
          user=${user}
          onComplete=${handleRoleplayComplete}
        />
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            ${(Array.isArray(weapon.businessType) ? weapon.businessType : [weapon.businessType]).map(bt => html`
              <span key=${bt} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">${bt}</span>
            `)}
            ${weapon.categories && weapon.categories.map(cat => html`
              <span key=${cat} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${cat}</span>
            `)}
          </div>
          <div className="flex items-start gap-4">
            <h2 className="font-bold text-2xl text-slate-800 flex-1">${weapon.title}</h2>
            <div className="flex flex-row gap-2 shrink-0 flex-wrap justify-end">
              <button
                onClick=${() => toggleLike(weapon.id)}
                className=${`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition min-w-[64px] ${likedWeapons.includes(weapon.id) ? 'bg-pink-50 text-pink-600 border-pink-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <${Heart} size=${22} className=${`fill-current ${likedWeapons.includes(weapon.id) ? 'text-pink-500' : 'text-pink-200'}`} />
                <div className="text-xs font-bold leading-none">いいね</div>
                <div
                  className="text-xs text-slate-400 hover:text-pink-500 hover:underline cursor-pointer"
                  onClick=${(e) => { e.stopPropagation(); setUserListModal({ title: 'いいね した人', users: weapon.likedBy || [], color: 'text-pink-500' }); }}
                >${weapon.likes}</div>
              </button>
              <button
                onClick=${() => toggleFavorite(weapon.id)}
                className=${`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition min-w-[64px] ${favoritedWeapons.includes(weapon.id) ? 'bg-yellow-50 text-yellow-600 border-yellow-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <${Star} size=${22} className=${`fill-current ${favoritedWeapons.includes(weapon.id) ? 'text-yellow-500' : 'text-yellow-300'}`} />
                <div className="text-xs font-bold leading-none">お気に入り</div>
                <div
                  className="text-xs text-slate-400 hover:text-yellow-500 hover:underline cursor-pointer"
                  onClick=${(e) => { e.stopPropagation(); setUserListModal({ title: 'お気に入り した人', users: weapon.favoritedBy || [], color: 'text-yellow-500' }); }}
                >${weapon.metrics?.favorites ?? 0}</div>
              </button>
              <button
                onClick=${() => toggleUnderstood(weapon.id)}
                className=${`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition min-w-[64px] ${understoodWeapons.includes(weapon.id) ? 'bg-emerald-50 text-emerald-600 border-emerald-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <${Lightbulb} size=${22} className=${`fill-current ${understoodWeapons.includes(weapon.id) ? 'text-emerald-500' : 'text-emerald-300'}`} />
                <div className="text-xs font-bold leading-none">理解した</div>
                <div
                  className="text-xs text-slate-400 hover:text-emerald-500 hover:underline cursor-pointer"
                  onClick=${(e) => { e.stopPropagation(); setUserListModal({ title: '理解した 人', users: weapon.understoodBy || [], color: 'text-emerald-500' }); }}
                >${weapon.metrics?.understood ?? 0}</div>
              </button>
              <button
                onClick=${() => togglePracticing(weapon.id)}
                className=${`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition min-w-[64px] ${practicingWeapons.includes(weapon.id) ? 'bg-purple-50 text-purple-600 border-purple-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                <${Zap} size=${22} className=${`fill-current ${practicingWeapons.includes(weapon.id) ? 'text-purple-500' : 'text-purple-300'}`} />
                <div className="text-xs font-bold leading-none">実践している</div>
                <div
                  className="text-xs text-slate-400 hover:text-purple-500 hover:underline cursor-pointer"
                  onClick=${(e) => { e.stopPropagation(); setUserListModal({ title: '実践している 人', users: weapon.practicingBy || [], color: 'text-purple-500' }); }}
                >${weapon.metrics?.practicing ?? 0}</div>
              </button>
              ${(weapon.createdBy?.id === user?.uid || user?.role === 'admin') && html`
                <button
                  onClick=${() => { setEditingWeapon(weapon); setShowWeaponForm(true); }}
                  className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition min-w-[64px]"
                >
                  <${PenTool} size=${22} />
                  <div className="text-xs font-bold leading-none">編集</div>
                </button>
              `}
            </div>
          </div>
        </div>

        <!-- サムネイル -->
        ${currentThumbnail && html`
          <div className="mb-6">
            <img src=${currentThumbnail} alt=${weapon.title} className="w-full h-48 object-cover rounded-xl border border-slate-200" />
          </div>
        `}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 border-t-4 border-t-indigo-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-slate-800 flex items-center">
                  <${Shield} className="text-indigo-600 mr-2" size=${24} /> 概要
                </h3>
                <div className="flex items-center gap-2">
                  <${SupervisorBadge} supervisor=${weapon.supervisor} />
                </div>
              </div>
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">${weapon.overview}</p>
            </section>

            ${weapon.transcript && html`
              <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 border-t-4 border-t-violet-500">
                <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center">
                  <${FileText} className="text-violet-600 mr-2" size=${24} /> トークスクリプト
                </h3>
                <div
                  className="text-sm text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML=${{ __html: weapon.transcript }}
                />
              </section>
            `}

            <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 border-t-4 border-t-blue-500">
              <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center">
                <${PlayCircle} className="text-blue-500 mr-2" size=${24} /> トーク動画
              </h3>
              ${weapon.videoUrl ? html`
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center shadow-lg">
                    ${isVideoPlaying ? html`
                      <iframe
                        src=${activeVideoUrl}
                        title=${weapon.videoTitle}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen=${true}
                      />
                    ` : html`
                      <div onClick=${() => playVideo(0)} className="w-full h-full flex items-center justify-center group cursor-pointer relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
                        <${PlayCircle} size=${64} className="text-white opacity-80 group-hover:opacity-100 transition duration-300 transform group-hover:scale-110 z-10" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10">
                          <p className="text-white text-lg font-bold">${weapon.videoTitle}</p>
                          <p className="text-slate-300 text-sm">クリックして再生</p>
                        </div>
                      </div>
                    `}
                  </div>
                  <div className="space-y-4">
                    ${weapon.summary && html`
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 mb-2 flex items-center">
                          <${FileText} size=${16} className="mr-2" /> 動画の要約
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">${weapon.summary}</p>
                      </div>
                    `}
                  </div>
                  ${weapon.timestamps && weapon.timestamps.length > 0 && html`
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-500 mb-2 flex items-center">
                        <${Clock} size=${14} className="mr-1" /> チャプター（クリックで移動）
                      </h4>
                      <div className="space-y-1">
                        ${weapon.timestamps.map((ts, idx) => html`
                          <button
                            key=${idx}
                            onClick=${() => playVideo(ts.time)}
                            className="w-full text-left flex items-center p-2 hover:bg-slate-50 rounded-lg transition text-sm group"
                          >
                            <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-bold mr-3 group-hover:text-indigo-700">
                              ${formatTime(ts.time)}
                            </span>
                            <span className="text-slate-700 group-hover:text-indigo-900">${ts.label}</span>
                            <${PlayCircle} size=${14} className="ml-auto text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        `)}
                      </div>
                    </div>
                  `}
                </div>
              ` : html`
                <div className="p-8 bg-slate-50 rounded-xl text-center text-slate-500 border border-dashed border-slate-300">
                  動画コンテンツはありません
                </div>
              `}
            </section>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <${HelpCircle} className="mr-2" /> 理解度チェックテスト
                  </h3>
                  <p className="text-indigo-100 text-sm mb-3">この武器の内容を理解したか確認しましょう。全5問のテストです。</p>
                  <${CompletedUsersTooltip} users=${weapon.completedBy || []} />
                </div>
                <button
                  onClick=${() => setIsQuizModalOpen(true)}
                  className="bg-white text-indigo-700 font-bold py-3 px-6 rounded-xl hover:bg-indigo-50 transition shadow-lg whitespace-nowrap"
                >
                  テストを実施する
                </button>
              </div>
            </section>

            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-md text-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <${Swords} className="mr-2" size=${20} /> ロープレコンテスト
                  </h3>
                  <p className="text-emerald-100 text-sm mb-3">
                    ${weapon.roleplay ? `顧客像: ${weapon.roleplay.customerProfile}` : 'トークスクリプトに沿ってロープレを実施しましょう。'}
                  </p>
                  <${CompletedUsersTooltip} users=${weapon.roleplay?.roleplays || []} />
                </div>
                <button
                  onClick=${() => setIsRoleplayModalOpen(true)}
                  disabled=${!weapon.roleplay?.steps?.length}
                  className=${`whitespace-nowrap font-bold py-3 px-6 rounded-xl transition shadow-lg ${weapon.roleplay?.steps?.length ? 'bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-white/30 text-white/60 cursor-not-allowed'}`}
                >
                  ${weapon.roleplay?.steps?.length ? 'ロープレを実施する' : 'シナリオ未設定'}
                </button>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 border-t-4 border-t-teal-500">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                <${CheckSquare} className="text-teal-600 mr-2" size=${20} /> 即効TODO
              </h3>
              <ul className="space-y-3">
                ${weapon.todos.map((todo, idx) => html`
                  <li key=${idx} className="flex items-start p-2 hover:bg-slate-50 rounded-lg transition">
                    <button
                      onClick=${() => toggleTodo(idx)}
                      className=${`flex-shrink-0 mt-0.5 mr-3 w-6 h-6 rounded border-2 flex items-center justify-center transition ${isTodoChecked(idx) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}
                    >
                      ${isTodoChecked(idx) && html`<${CheckSquare} size=${16} className="text-white" />`}
                    </button>
                    <span
                      onClick=${() => toggleTodo(idx)}
                      className=${`text-sm cursor-pointer select-none ${isTodoChecked(idx) ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}
                    >
                      ${todo}
                    </span>
                  </li>
                `)}
              </ul>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 border-t-4 border-t-amber-500">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                <${Copy} className="text-emerald-500 mr-2" size=${20} /> テンプレート・ツール
              </h3>
              ${weapon.downloads && weapon.downloads.length > 0 && html`
                <div className="mb-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ダウンロード・リンク</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${weapon.downloads.map((file, idx) => html`
                      <a
                        key=${idx}
                        href=${file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition group"
                      >
                        <div className="h-24 bg-slate-200 w-full relative overflow-hidden">
                          ${file.thumbnail ? html`
                            <img src=${file.thumbnail} alt=${file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                          ` : html`
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <${File} size=${32} />
                            </div>
                          `}
                          <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded text-xs font-bold text-slate-600 shadow-sm">
                            ${file.type}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-slate-700 line-clamp-2 group-hover:text-indigo-600 transition">${file.name}</p>
                          <div className="flex items-center text-xs text-slate-400 mt-1">
                            ${file.type === 'Link' ? html`<${LinkIcon} size=${10} className="mr-1" />` : html`<${Download} size=${10} className="mr-1" />`}
                            ${file.type === 'Link' ? '外部リンクを開く' : 'ダウンロード'}
                          </div>
                        </div>
                      </a>
                    `)}
                  </div>
                </div>
              `}
              ${weapon.templates.map((tmpl, idx) => html`
                <div key=${idx} className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">${tmpl.label}</span>
                    <button
                      onClick=${() => handleCopy(tmpl.content)}
                      className="text-indigo-600 text-xs font-bold flex items-center hover:bg-indigo-50 px-3 py-1.5 rounded-full transition"
                    >
                      <${Copy} size=${14} className="mr-1" /> コピー
                    </button>
                  </div>
                  <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    ${tmpl.content}
                  </div>
                </div>
              `)}
            </section>
          </div>
        </div>
      </div>
    `;
  };

  const WeaponForm = () => {
    const initial = editingWeapon || {};
    const [formData, setFormData] = useState({
      title: initial.title || '',
      businessType: initial.businessType ? (Array.isArray(initial.businessType) ? initial.businessType : [initial.businessType]) : [],
      categories: initial.categories || [],
      tags: initial.tags ? initial.tags.join(', ') : '',
      overview: initial.overview || '',
      summary: initial.summary || '',
      todos: initial.todos && initial.todos.length > 0 ? initial.todos : [''],
      thumbnailUrl: editingWeapon ? (weaponThumbnails[editingWeapon.id] || editingWeapon.thumbnail || '') : '',
      videoUrl: initial.videoUrl || '',
      videoTitle: initial.videoTitle || '',
      quizQuestions: initial.quiz?.questions && initial.quiz.questions.length > 0
        ? initial.quiz.questions.map(q => ({ text: q.text, options: [...q.options], correctAnswer: q.correctAnswer }))
        : [],
      templates: initial.templates && initial.templates.length > 0
        ? initial.templates.map(t => ({ label: t.label, content: t.content }))
        : [],
      downloads: initial.downloads && initial.downloads.length > 0
        ? initial.downloads.map(d => ({ name: d.name, url: d.url, type: d.type || 'Link' }))
        : [],
    });
    const [thumbDragOver, setThumbDragOver] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [thumbUrlInput, setThumbUrlInput] = useState('');
    const thumbFileRef = useRef(null);
    const transcriptRef = useRef(null);

    useEffect(() => {
      if (transcriptRef.current && initial.transcript) {
        transcriptRef.current.innerHTML = initial.transcript;
      }
    }, []);

    const execCmd = (cmd, val = null) => {
      transcriptRef.current?.focus();
      document.execCommand(cmd, false, val);
    };

    const handleThumbUpload = async (file) => {
      if (!file || !file.type.startsWith('image/')) { showToast('画像ファイルを選択してください', 'error'); return; }
      setUploadingThumb(true);
      try {
        const url = await uploadToDrive(file);
        updateField('thumbnailUrl', url);
        showToast('サムネイルをアップロードしました', 'success');
      } catch (err) {
        showToast(err.message || 'アップロードに失敗しました', 'error');
      } finally { setUploadingThumb(false); }
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const toggleCategory = (catId) => {
      const cats = formData.categories.includes(catId)
        ? formData.categories.filter(c => c !== catId)
        : [...formData.categories, catId];
      updateField('categories', cats);
    };

    const updateTodo = (idx, value) => {
      const todos = [...formData.todos]; todos[idx] = value; updateField('todos', todos);
    };
    const addTodo = () => updateField('todos', [...formData.todos, '']);
    const removeTodo = (idx) => updateField('todos', formData.todos.filter((_, i) => i !== idx));

    const addQuestion = () => updateField('quizQuestions', [...formData.quizQuestions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    const removeQuestion = (idx) => updateField('quizQuestions', formData.quizQuestions.filter((_, i) => i !== idx));
    const updateQuestion = (idx, field, value) => {
      const qs = formData.quizQuestions.map((q, i) => i === idx ? { ...q, [field]: value } : q);
      updateField('quizQuestions', qs);
    };
    const updateOption = (qIdx, oIdx, value) => {
      const qs = formData.quizQuestions.map((q, i) => {
        if (i !== qIdx) return q;
        const opts = [...q.options]; opts[oIdx] = value;
        return { ...q, options: opts };
      });
      updateField('quizQuestions', qs);
    };

    const addTemplate = () => updateField('templates', [...formData.templates, { label: '', content: '' }]);
    const removeTemplate = (idx) => updateField('templates', formData.templates.filter((_, i) => i !== idx));
    const updateTemplate = (idx, field, value) => {
      const ts = formData.templates.map((t, i) => i === idx ? { ...t, [field]: value } : t);
      updateField('templates', ts);
    };

    const addDownload = () => updateField('downloads', [...formData.downloads, { name: '', url: '', type: 'Link' }]);
    const removeDownload = (idx) => updateField('downloads', formData.downloads.filter((_, i) => i !== idx));
    const updateDownload = (idx, field, value) => {
      const ds = formData.downloads.map((d, i) => i === idx ? { ...d, [field]: value } : d);
      updateField('downloads', ds);
    };

    const handleSubmit = () => {
      if (!formData.title.trim()) { showToast('タイトルを入力してください', 'error'); return; }
      if (!formData.businessType.length) { showToast('業種を選択してください', 'error'); return; }
      saveWeapon({
        ...(editingWeapon?.id ? { id: editingWeapon.id } : {}),
        title: formData.title.trim(),
        businessType: formData.businessType,
        categories: formData.categories,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        overview: formData.overview.trim(),
        summary: formData.summary.trim(),
        todos: formData.todos.filter(t => t.trim()),
        thumbnailUrl: formData.thumbnailUrl,
        transcript: transcriptRef.current?.innerHTML || '',
        videoUrl: formData.videoUrl.trim(),
        videoTitle: formData.videoTitle.trim(),
        quiz: { questions: formData.quizQuestions.filter(q => q.text.trim()).map((q, i) => ({ id: i + 1, ...q })) },
        templates: formData.templates.filter(t => t.label.trim() || t.content.trim()),
        downloads: formData.downloads.filter(d => d.name.trim() && d.url.trim()),
      });
    };

    const sectionClass = "bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3";
    const sectionTitle = (icon, label) => html`
      <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
        <${icon} size=${16} className="text-indigo-500" /> ${label}
      </h4>
    `;
    const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white";

    return html`
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-xl text-slate-800 flex items-center">
              <${Plus} className="mr-2 text-indigo-600" size=${22} />
              ${editingWeapon ? '武器を編集' : '武器を登録'}
            </h3>
            <button
              onClick=${() => { setShowWeaponForm(false); setEditingWeapon(null); }}
              className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500"
            ><${X} size=${20} /></button>
          </div>
          <div className="overflow-y-auto p-6 space-y-5">

            <!-- 基本情報 -->
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">タイトル <span className="text-rose-500">*</span></label>
              <input type="text" value=${formData.title} onChange=${(e) => updateField('title', e.target.value)}
                placeholder="例: 土地なし客への初回アプローチ" className=${inputClass} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">業種 <span className="text-rose-500">*</span><span className="text-xs font-normal text-slate-400 ml-1">（複数選択可）</span></label>
              <div className="flex flex-wrap gap-2">
                ${BUSINESS_TYPES.map(type => html`
                  <button key=${type} type="button" onClick=${() => {
                    const next = formData.businessType.includes(type)
                      ? formData.businessType.filter(t => t !== type)
                      : [...formData.businessType, type];
                    updateField('businessType', next);
                  }}
                    className=${`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${formData.businessType.includes(type) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                  >${type}</button>
                `)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">カテゴリー</label>
              <div className="flex flex-wrap gap-1.5">
                ${CATEGORIES.map(cat => html`
                  <button key=${cat.id} type="button" onClick=${() => toggleCategory(cat.id)}
                    className=${`px-2.5 py-1 rounded-md text-xs font-bold border transition ${formData.categories.includes(cat.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                  >${cat.name}</button>
                `)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">タグ（カンマ区切り）</label>
              <input type="text" value=${formData.tags} onChange=${(e) => updateField('tags', e.target.value)}
                placeholder="例: 新人向け, 基本, テレアポ" className=${inputClass} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">概要</label>
              <textarea value=${formData.overview} onChange=${(e) => updateField('overview', e.target.value)}
                placeholder="この武器の目的と効果を簡潔に説明してください" rows=${3} className=${`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">要約・詳細説明</label>
              <textarea value=${formData.summary} onChange=${(e) => updateField('summary', e.target.value)}
                placeholder="より詳しい解説を入力してください" rows=${4} className=${`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">即効TODO</label>
              <div className="space-y-2">
                ${formData.todos.map((todo, idx) => html`
                  <div key=${idx} className="flex gap-2">
                    <input type="text" value=${todo} onChange=${(e) => updateTodo(idx, e.target.value)}
                      placeholder=${`TODO ${idx + 1}`} className=${inputClass} />
                    ${formData.todos.length > 1 && html`
                      <button type="button" onClick=${() => removeTodo(idx)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      ><${X} size=${16} /></button>
                    `}
                  </div>
                `)}
                <button type="button" onClick=${addTodo}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition"
                ><${Plus} size=${16} /> TODOを追加</button>
              </div>
            </div>

            <!-- サムネイル -->
            <div className=${sectionClass}>
              ${sectionTitle(FileImage, 'サムネイル画像')}
              <input
                type="file"
                accept="image/*"
                ref=${thumbFileRef}
                style=${{ display: 'none' }}
                onChange=${(e) => handleThumbUpload(e.target.files[0])}
              />
              ${uploadingThumb ? html`
                <div className="w-full h-28 bg-white rounded-xl border border-slate-200 flex items-center justify-center gap-3 text-slate-500">
                  <${Loader2} size=${18} className="animate-spin" />
                  <span className="text-sm">Googleドライブにアップロード中...</span>
                </div>
              ` : formData.thumbnailUrl ? html`
                <div className="relative group/ft">
                  <img src=${formData.thumbnailUrl} alt="サムネイル" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/ft:opacity-100 transition">
                    <button type="button"
                      onClick=${() => { thumbFileRef.current?.click(); }}
                      className="bg-white/90 hover:bg-white text-slate-600 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1"
                    ><${PenTool} size=${12} /> 変更</button>
                    <button type="button"
                      onClick=${() => updateField('thumbnailUrl', '')}
                      className="bg-white/90 hover:bg-rose-50 text-rose-500 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow"
                    >削除</button>
                  </div>
                </div>
              ` : html`
                <div
                  onDragOver=${(e) => { e.preventDefault(); setThumbDragOver(true); }}
                  onDragLeave=${() => setThumbDragOver(false)}
                  onDrop=${(e) => { e.preventDefault(); setThumbDragOver(false); handleThumbUpload(e.dataTransfer.files[0]); }}
                  onClick=${() => thumbFileRef.current?.click()}
                  className=${`w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition ${thumbDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                >
                  <${FileImage} size=${24} className=${thumbDragOver ? 'text-indigo-500' : 'text-slate-400'} />
                  <p className="text-sm font-bold text-slate-600">ドラッグ&ドロップ または クリックして選択</p>
                  <p className="text-xs text-slate-400">Googleドライブに自動保存されます</p>
                </div>
              `}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="画像URLを直接入力..."
                  value=${thumbUrlInput}
                  onChange=${(e) => setThumbUrlInput(e.target.value)}
                  onKeyDown=${(e) => { if (e.key === 'Enter' && thumbUrlInput) { updateField('thumbnailUrl', thumbUrlInput); setThumbUrlInput(''); } }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick=${() => { if (thumbUrlInput) { updateField('thumbnailUrl', thumbUrlInput); setThumbUrlInput(''); } }}
                  disabled=${!thumbUrlInput}
                  className=${`text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 ${thumbUrlInput ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >URL登録</button>
              </div>
            </div>

            <!-- YouTube動画 -->
            <div className=${sectionClass}>
              ${sectionTitle(PlayCircle, 'トーク動画（YouTube）')}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">動画URL</label>
                <input type="url" value=${formData.videoUrl} onChange=${(e) => updateField('videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/embed/xxxxx"
                  className=${inputClass} />
                <p className="text-xs text-slate-400 mt-1">YouTubeの埋め込みURL（/embed/動画ID）を入力してください</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">動画タイトル</label>
                <input type="text" value=${formData.videoTitle} onChange=${(e) => updateField('videoTitle', e.target.value)}
                  placeholder="例: トップセールスの初回トーク実演"
                  className=${inputClass} />
              </div>
            </div>

            <!-- トークスクリプト -->
            <div className=${sectionClass}>
              ${sectionTitle(FileText, 'トークスクリプト')}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-white rounded-lg border border-slate-200">
                <button type="button" onMouseDown=${(e) => { e.preventDefault(); execCmd('bold'); }}
                  className="px-2.5 py-1 rounded text-sm font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                >B</button>
                <button type="button" onMouseDown=${(e) => { e.preventDefault(); execCmd('italic'); }}
                  className="px-2.5 py-1 rounded text-sm italic text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                >I</button>
                <button type="button" onMouseDown=${(e) => { e.preventDefault(); execCmd('underline'); }}
                  className="px-2.5 py-1 rounded text-sm underline text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                >U</button>
                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                  文字色
                  <input type="color" defaultValue="#ef4444"
                    onChange=${(e) => execCmd('foreColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                  背景
                  <input type="color" defaultValue="#fef08a"
                    onChange=${(e) => execCmd('backColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                </label>
                <div className="w-px h-5 bg-slate-200 mx-0.5"></div>
                <button type="button" onMouseDown=${(e) => { e.preventDefault(); execCmd('removeFormat'); }}
                  className="px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 border border-slate-200 transition"
                >リセット</button>
              </div>
              <div
                ref=${transcriptRef}
                contentEditable=${true}
                className="min-h-36 p-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400">テキストを選択してからB・I・U・文字色を適用できます</p>
            </div>

            <!-- 理解度チェック -->
            <div className=${sectionClass}>
              ${sectionTitle(HelpCircle, '理解度チェック（クイズ）')}
              ${formData.quizQuestions.length === 0 && html`
                <p className="text-xs text-slate-400 text-center py-2">問題がまだありません</p>
              `}
              ${formData.quizQuestions.map((q, qIdx) => html`
                <div key=${qIdx} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600">Q${qIdx + 1}</span>
                    <button type="button" onClick=${() => removeQuestion(qIdx)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition"
                    ><${X} size=${14} /></button>
                  </div>
                  <input type="text" value=${q.text} onChange=${(e) => updateQuestion(qIdx, 'text', e.target.value)}
                    placeholder="問題文を入力してください"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                  <div className="space-y-1.5">
                    ${q.options.map((opt, oIdx) => html`
                      <div key=${oIdx} className="flex items-center gap-2">
                        <button type="button" onClick=${() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                          className=${`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition text-xs font-bold ${q.correctAnswer === oIdx ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 text-slate-400 hover:border-teal-400'}`}
                        >${['A','B','C','D'][oIdx]}</button>
                        <input type="text" value=${opt} onChange=${(e) => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder=${`選択肢${['A','B','C','D'][oIdx]}`}
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                      </div>
                    `)}
                  </div>
                  <p className="text-xs text-teal-600 font-bold">◎ 色付きのボタンが正解の選択肢です</p>
                </div>
              `)}
              <button type="button" onClick=${addQuestion}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition"
              ><${Plus} size=${16} /> 問題を追加</button>
            </div>

            <!-- ツール・テンプレート -->
            <div className=${sectionClass}>
              ${sectionTitle(Copy, 'ツール・テンプレート')}

              <!-- テンプレート -->
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">メッセージテンプレート</p>
                ${formData.templates.length === 0 && html`
                  <p className="text-xs text-slate-400 text-center py-1">テンプレートがまだありません</p>
                `}
                ${formData.templates.map((t, idx) => html`
                  <div key=${idx} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 mb-2">
                    <div className="flex gap-2">
                      <input type="text" value=${t.label} onChange=${(e) => updateTemplate(idx, 'label', e.target.value)}
                        placeholder="ラベル（例: お礼LINE）"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                      <button type="button" onClick=${() => removeTemplate(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      ><${X} size=${14} /></button>
                    </div>
                    <textarea value=${t.content} onChange=${(e) => updateTemplate(idx, 'content', e.target.value)}
                      placeholder="テンプレートの本文を入力..." rows=${3}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none bg-white" />
                  </div>
                `)}
                <button type="button" onClick=${addTemplate}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-800 transition"
                ><${Plus} size=${14} /> テンプレートを追加</button>
              </div>

              <!-- ダウンロード・リンク -->
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-2">ダウンロード・リンク</p>
                ${formData.downloads.length === 0 && html`
                  <p className="text-xs text-slate-400 text-center py-1">リンクがまだありません</p>
                `}
                ${formData.downloads.map((d, idx) => html`
                  <div key=${idx} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 mb-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1.5">
                        <input type="text" value=${d.name} onChange=${(e) => updateDownload(idx, 'name', e.target.value)}
                          placeholder="ファイル名・リンク名"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                        <input type="url" value=${d.url} onChange=${(e) => updateDownload(idx, 'url', e.target.value)}
                          placeholder="URL（https://...）"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                        <select value=${d.type} onChange=${(e) => updateDownload(idx, 'type', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                        >
                          ${['Link', 'PDF', 'Excel', 'PPT', 'Word', 'その他'].map(t => html`
                            <option key=${t} value=${t}>${t}</option>
                          `)}
                        </select>
                      </div>
                      <button type="button" onClick=${() => removeDownload(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition mt-0.5"
                      ><${X} size=${14} /></button>
                    </div>
                  </div>
                `)}
                <button type="button" onClick=${addDownload}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-800 transition"
                ><${Plus} size=${14} /> リンクを追加</button>
              </div>
            </div>

          </div>
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button
              onClick=${() => { setShowWeaponForm(false); setEditingWeapon(null); }}
              className="px-4 py-2 rounded-lg text-slate-600 border border-slate-200 hover:bg-slate-100 font-bold text-sm transition"
            >キャンセル</button>
            <button
              onClick=${handleSubmit}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm transition shadow-md shadow-indigo-200"
            >${editingWeapon ? '更新する' : '登録する'}</button>
          </div>
        </div>
      </div>
    `;
  };

  const AdminPanel = () => html`<${AdminPanelView} weapons=${weapons} onBack=${() => navigateTo('home')} onShowToast=${showToast} />`;
  const StaffPanel = () => html`<${StaffPanelView} onBack=${() => navigateTo('home')} onShowToast=${showToast} />`;

  // ----------------------------------------------------------------
  // メインレンダー
  // ----------------------------------------------------------------

  if (authLoading) {
    return html`
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <${Loader2} className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    `;
  }

  const showSidebar = currentView === 'home' || currentView === 'list';

  return html`
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen relative selection:bg-indigo-100 selection:text-indigo-900">
      ${toast && html`<${Toast} message=${toast.message} type=${toast.type} onClose=${() => setToast(null)} />`}
      ${showWeaponForm && html`<${WeaponForm} />`}
      <${HeaderMenu}
        isOpen=${isMenuOpen}
        onClose=${() => setIsMenuOpen(false)}
        user=${user}
        onLogout=${handleLogout}
        navigateTo=${navigateTo}
        onShowSpreadsheet=${() => setShowSpreadsheetExport(true)}
        onShowSpreadsheetImport=${() => setShowSpreadsheetImport(true)}
      />
      <${SpreadsheetExportModal}
        isOpen=${showSpreadsheetExport}
        onClose=${() => setShowSpreadsheetExport(false)}
        weapons=${weapons}
        weaponThumbnails=${weaponThumbnails}
      />
      <${SpreadsheetImportModal}
        isOpen=${showSpreadsheetImport}
        onClose=${() => setShowSpreadsheetImport(false)}
        weapons=${weapons}
        onImport=${handleSpreadsheetImport}
      />
      ${currentView === 'login' ? html`<${LoginView} />` : html`
        <${Fragment}>
          ${showSidebar && html`<${CategoryFlow} />`}
          <div className=${`transition-all duration-200 ${showSidebar ? 'md:pl-64' : ''}`}>
            <${Header} />
            <main className="max-w-7xl mx-auto min-h-screen p-4 md:p-8">
              ${currentView === 'detail' ? html`<${DetailView} />` : currentView === 'admin' ? html`<${AdminPanel} />` : currentView === 'staff' ? html`<${StaffPanel} />` : html`<${HomeView} />`}
            </main>
          </div>
          <${BottomNav} />
        </${Fragment}>
      `}
    </div>
  `;
}
