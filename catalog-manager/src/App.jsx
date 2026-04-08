import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './components/Icon';
import FileUpload from './components/FileUpload';
import { db, storage, GENRES, GENRE_COLORS, GROUPS } from './config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { makeDemoImage } from './demoImage';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ─── PDF見積り解析 ───
const extractFromPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }

  const result = {};

  // 日付抽出: yyyy/mm/dd, yyyy-mm-dd, yyyy年mm月dd日, 令和X年
  const datePatterns = [
    /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/,
    /令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/,
  ];
  for (const pat of datePatterns) {
    const m = fullText.match(pat);
    if (m) {
      if (pat.source.includes('令和')) {
        const y = 2018 + Number(m[1]);
        result.reprint_date = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      } else {
        result.reprint_date = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      }
      break;
    }
  }

  // 金額抽出: 合計, 見積金額, 税込, 小計 の近くの金額
  const costPatterns = [
    /(?:合計|見積[り金]額|税込[み合計額]*|総額|御見積金額)[^\d]{0,10}[¥￥]?\s*([\d,]+)/,
    /[¥￥]\s*([\d,]+)/,
  ];
  for (const pat of costPatterns) {
    const m = fullText.match(pat);
    if (m) {
      result.cost = m[1].replace(/,/g, '');
      break;
    }
  }

  // 部数抽出: XXX部, 数量 XXX
  const qtyPatterns = [
    /([\d,]+)\s*部/,
    /(?:数量|部数|印刷部数)[^\d]{0,10}([\d,]+)/,
  ];
  for (const pat of qtyPatterns) {
    const m = fullText.match(pat);
    if (m) {
      result.quantity = m[1].replace(/,/g, '');
      break;
    }
  }

  // 紙の種類抽出
  const paperKeywords = ['コート紙', 'マットコート紙', '上質紙', 'アート紙', 'ケント紙', 'クラフト紙', '再生紙', '特殊紙'];
  for (const kw of paperKeywords) {
    if (fullText.includes(kw)) {
      result.paper_type = kw;
      break;
    }
  }

  // サイズ抽出
  const sizeKeywords = ['A3', 'A4', 'A5', 'A6', 'B4', 'B5', 'B6'];
  for (const kw of sizeKeywords) {
    if (fullText.includes(kw)) {
      result.size = kw;
      break;
    }
  }

  // 印刷会社（会社名）: 見積書冒頭の「御見積書」前後、または「株式会社」を含む行
  const companyMatch = fullText.match(/((?:株式会社|有限会社)[^\s\n]{1,20})/);
  if (companyMatch) {
    result.supplier = companyMatch[1];
  }

  return result;
};

// ─── ユーティリティ ───
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ja-JP') : '—';
const formatYearMonth = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${String(dt.getMonth() + 1).padStart(2, '0')}月`;
};
const formatCost = (n) => n ? `¥${Number(n).toLocaleString()}` : '—';
const daysUntil = (d) => {
  if (!d) return Infinity;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
};
const alertLevel = (stock, lastQty) => {
  if (!stock && stock !== 0) return 'none';
  if (!lastQty) return 'none';
  const ratio = stock / lastQty;
  if (ratio <= 0.1) return 'critical';
  if (ratio <= 0.2) return 'warning';
  return 'none';
};

const EMPTY_ITEM = {
  name: '', genre: '新築', group: 'パンフレット', active: true, stock: '', next_reprint_date: '',
  last_reprint_qty: '', last_reprint_cost: '', last_reprint_date: '',
  data_url: '', delivery_to: '', notes: '', image_url: '',
  size: '', paper_type: '', supplier: '',
};
const SIZES = ['A3', 'A4', 'A5', 'A6', 'B4', 'B5', 'B6', '長3封筒', '角2封筒', '名刺サイズ', 'ハガキ', 'その他'];
const PAPER_TYPES = ['コート紙', 'マットコート紙', '上質紙', 'アート紙', 'ケント紙', 'クラフト紙', '再生紙', '特殊紙', 'その他'];
const EMPTY_REPRINT = { reprint_date: '', cost: '', quantity: '', file_url: '', file_name: '', notes: '', delivery_to: '', supplier: '', designer: '' };
const LOCATIONS = ['本社', '吉田スタジオ', '長野支店', '松本支店', '上田支店(グランミュゼ)', '伊那支店(グラン・メティス)', 'グラン・ニュクス', 'グラン・シフ', '紬', '飯田支店'];
const GROUP_ICONS = { 'パンフレット': '📖', 'カタログ': '📚', 'チラシ': '📄', '封筒': '✉️', 'ファイル': '📁', '紙類': '📃' };
const SETUP_STATUS = { pending: '未着手', quoting: '見積中', ordered: '発注済', delivered: '納品済' };
const SETUP_STATUS_COLORS = { pending: 'bg-slate-100 text-slate-600', quoting: 'bg-amber-100 text-amber-700', ordered: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700' };
const EMPTY_SETUP_ITEM = { status: 'pending', quantity: '', supplier: '', designer: '', cost: '', delivery_date: '', notes: '', completed: false };

export default function App() {
  // ─── 認証 ───
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('catalog_authed') === '1');
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');

  // ─── データ ───
  const [items, setItems] = useState([]);
  const [reprints, setReprints] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // ─── UI ───
  const [filterGenre, setFilterGenre] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('gallery'); // 'table' | 'gallery'
  const [sortKey, setSortKey] = useState(''); // 'name' | 'last_reprint_date' | 'last_reprint_cost' | 'stock'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [showItemModal, setShowItemModal] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingReprintId, setEditingReprintId] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [reprintForm, setReprintForm] = useState(EMPTY_REPRINT);
  const [reprintTargetItemId, setReprintTargetItemId] = useState(null);
  const [toast, setToast] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewOpenModal, setShowNewOpenModal] = useState(false);
  const [newOpenItemIds, setNewOpenItemIds] = useState([]);
  const [newOpenFilterGenre, setNewOpenFilterGenre] = useState('');
  const [newOpenEditMode, setNewOpenEditMode] = useState(false);
  const [showStoreSetupModal, setShowStoreSetupModal] = useState(false);
  const [storeSetupData, setStoreSetupData] = useState({ id: null, storeName: '', openDate: '', items: [] });
  const [storeSetups, setStoreSetups] = useState([]);
  const imageInputRef = useRef(null);

  const [detailItem, setDetailItem] = useState(null);
  const [selectedSummaryGenre, setSelectedSummaryGenre] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showInlineReprintForm, setShowInlineReprintForm] = useState(false);
  const [inlineReprintForm, setInlineReprintForm] = useState(EMPTY_REPRINT);
  const [inlineReprintEditId, setInlineReprintEditId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const toggleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const SORT_OPTIONS = [
    { key: 'created_at', label: '登録順' },
    { key: 'name', label: 'アイテム名' },
    { key: 'last_reprint_date', label: '増刷年月' },
    { key: 'last_reprint_cost', label: '増刷金額' },
    { key: 'stock', label: '在庫数' },
  ];

  // ─── 認証処理 ───
  const handleLogin = async (e) => {
    e.preventDefault();
    setPwError('');
    const DEFAULT_PASSWORD = 'catalog1234';
    let password = DEFAULT_PASSWORD;
    try {
      const snap = await getDoc(doc(db, 'catalog_settings', 'app_password'));
      if (snap.exists()) password = snap.data().value;
    } catch (_) {}
    if (pw === password) {
      sessionStorage.setItem('catalog_authed', '1');
      setAuthed(true);
    } else {
      setPwError('パスワードが正しくありません');
    }
  };

  // ─── データ読み込み ───
  const loadSettings = async () => {
    try {
      const snap = await getDocs(collection(db, 'catalog_settings'));
      const obj = {};
      snap.forEach(d => { obj[d.id] = d.data().value; });
      setSettings(obj);
      if (Array.isArray(obj.new_open_items)) {
        setNewOpenItemIds(obj.new_open_items);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    loadSettings();

    const unsubItems = onSnapshot(
      query(collection(db, 'catalog_items'), orderBy('created_at', 'desc')),
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const unsubReprints = onSnapshot(
      query(collection(db, 'catalog_reprints'), orderBy('reprint_date', 'desc')),
      (snap) => {
        setReprints(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubSetups = onSnapshot(
      query(collection(db, 'catalog_store_setups'), orderBy('created_at', 'desc')),
      (snap) => {
        setStoreSetups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    return () => { unsubItems(); unsubReprints(); unsubSetups(); };
  }, [authed]);

  // ─── フィルタ ───
  const filteredItems = useMemo(() => {
    let list = items;
    if (filterGenre) list = list.filter(i => i.genre === filterGenre);
    if (filterGroup) list = list.filter(i => i.group === filterGroup);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q) ||
        (i.delivery_to || '').toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let va, vb;
        if (sortKey === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
        else if (sortKey === 'name') { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); }
        else if (sortKey === 'last_reprint_date') { va = a.last_reprint_date || ''; vb = b.last_reprint_date || ''; }
        else if (sortKey === 'last_reprint_cost') { va = Number(a.last_reprint_cost) || 0; vb = Number(b.last_reprint_cost) || 0; }
        else if (sortKey === 'stock') { va = Number(a.stock) ?? 0; vb = Number(b.stock) ?? 0; }
        else { return 0; }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [items, filterGenre, filterGroup, search, sortKey, sortDir]);

  const getReprints = (itemId) => reprints.filter(r => r.catalog_item_id === itemId).sort((a, b) => (b.reprint_date || '').localeCompare(a.reprint_date || ''));

  // ─── 期の計算（9月始まり8月終わり）───
  const getKi = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return m >= 9 ? (y + 1) % 100 : y % 100;
  };
  const getKiLabel = (ki) => ki ? `${ki}S` : '';
  const getKiRange = (ki) => ki ? `${2000 + ki - 1}年9月～${2000 + ki}年8月` : '';

  // ─── 事業部サマリー ───
  const genreSummary = useMemo(() => {
    return GENRES.map(g => {
      const genreItems = items.filter(i => i.genre === g);
      return { genre: g, count: genreItems.length };
    });
  }, [items]);

  // ─── 選択事業部の期別増刷金額 ───
  const genreKiCosts = useMemo(() => {
    if (!selectedSummaryGenre) return [];
    const genreReprints = reprints.filter(r => {
      const item = items.find(i => i.id === r.catalog_item_id);
      return item && item.genre === selectedSummaryGenre;
    });
    const kiMap = {};
    genreReprints.forEach(r => {
      const ki = getKi(r.reprint_date);
      if (ki) {
        kiMap[ki] = (kiMap[ki] || 0) + (Number(r.cost) || 0);
      }
    });
    return Object.entries(kiMap)
      .map(([ki, total]) => ({ ki: Number(ki), label: getKiLabel(Number(ki)), range: getKiRange(Number(ki)), total }))
      .sort((a, b) => b.ki - a.ki);
  }, [selectedSummaryGenre, reprints, items]);

  // ─── 在庫±操作 ───
  const updateStock = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, (Number(item.stock) || 0) + delta);
    try { await updateDoc(doc(db, 'catalog_items', id), { stock: newStock, updated_at: new Date().toISOString() }); } catch (_) {}
    setItems(prev => prev.map(i => i.id === id ? { ...i, stock: newStock } : i));
  };

  // ─── 画像アップロード ───
  const handleImageUpload = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { alert('画像ファイル（JPG, PNG, GIF, WebP）のみ'); return; }
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `catalog-files/thumbnails/${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setItemForm(f => ({ ...f, image_url: url }));
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (ev) => setItemForm(f => ({ ...f, image_url: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  // ─── デモデータ一括登録 ───
  const loadDemoData = () => {
    const colors = { '新築': ['#eef2ff','#6366f1'], 'リフォーム': ['#ecfdf5','#10b981'], '不動産': ['#fff7ed','#f97316'], 'ソリューション': ['#fef2f2','#ef4444'], '共通': ['#f1f5f9','#64748b'] };
    const demo = [
      { name: '総合カタログ2025', genre: '新築', group: 'パンフレット', stock: 250, last_reprint_date: '2025-04-01', last_reprint_qty: 1000, last_reprint_cost: 150000, delivery_to: '吉田スタジオ', next_reprint_date: '2025-10-01', notes: '年1回更新', data_url: '', size: 'A4', paper_type: 'コート紙' },
      { name: '新築施工事例集', genre: '新築', group: 'カタログ', stock: 180, last_reprint_date: '2025-02-15', last_reprint_qty: 500, last_reprint_cost: 220000, delivery_to: '吉田スタジオ', next_reprint_date: '2025-08-15', notes: '写真差替え予定', data_url: '', size: 'A4', paper_type: 'マットコート紙' },
      { name: '新築見積用封筒', genre: '新築', group: '封筒', stock: 800, last_reprint_date: '2025-01-10', last_reprint_qty: 3000, last_reprint_cost: 35000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: '', data_url: '', size: '長3封筒', paper_type: 'ケント紙' },
      { name: 'リフォーム案内チラシ', genre: 'リフォーム', group: 'チラシ', stock: 500, last_reprint_date: '2025-09-01', last_reprint_qty: 3000, last_reprint_cost: 45000, delivery_to: '吉田スタジオ', next_reprint_date: '2026-03-01', notes: '折込用A4', data_url: '', size: 'A4', paper_type: 'コート紙' },
      { name: 'リフォームパンフレット', genre: 'リフォーム', group: 'パンフレット', stock: 120, last_reprint_date: '2025-06-01', last_reprint_qty: 500, last_reprint_cost: 180000, delivery_to: '吉田スタジオ', next_reprint_date: '2025-12-01', notes: '', data_url: '', size: 'A4', paper_type: 'マットコート紙' },
      { name: 'リフォーム契約書一式', genre: 'リフォーム', group: 'ファイル', stock: 90, last_reprint_date: '2025-03-01', last_reprint_qty: 200, last_reprint_cost: 60000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: '法務確認済', data_url: '', size: 'A4', paper_type: '上質紙' },
      { name: '不動産売買契約書ファイル', genre: '不動産', group: 'ファイル', stock: 50, last_reprint_date: '2026-01-15', last_reprint_qty: 200, last_reprint_cost: 80000, delivery_to: '吉田スタジオ', next_reprint_date: '2026-07-01', notes: '', data_url: '', size: 'A4', paper_type: '上質紙' },
      { name: '物件案内チラシ', genre: '不動産', group: 'チラシ', stock: 1200, last_reprint_date: '2026-02-01', last_reprint_qty: 5000, last_reprint_cost: 55000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: 'B4両面カラー', data_url: '', size: 'B4', paper_type: 'コート紙' },
      { name: '不動産会社案内', genre: '不動産', group: 'パンフレット', stock: 300, last_reprint_date: '2025-11-01', last_reprint_qty: 1000, last_reprint_cost: 120000, delivery_to: '吉田スタジオ', next_reprint_date: '2026-05-01', notes: '代表挨拶更新', data_url: '', size: 'A4', paper_type: 'アート紙' },
      { name: 'ソリューション提案書テンプレ', genre: 'ソリューション', group: 'ファイル', stock: 75, last_reprint_date: '2025-07-01', last_reprint_qty: 200, last_reprint_cost: 90000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: '', data_url: '', size: 'A4', paper_type: 'マットコート紙' },
      { name: 'IoT住宅カタログ', genre: 'ソリューション', group: 'カタログ', stock: 200, last_reprint_date: '2025-05-15', last_reprint_qty: 500, last_reprint_cost: 250000, delivery_to: '吉田スタジオ', next_reprint_date: '2025-11-15', notes: '2025年版', data_url: '', size: 'A4', paper_type: 'コート紙' },
      { name: 'ZEH説明チラシ', genre: 'ソリューション', group: 'チラシ', stock: 600, last_reprint_date: '2025-08-01', last_reprint_qty: 2000, last_reprint_cost: 40000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: '', data_url: '', size: 'A4', paper_type: 'コート紙' },
      { name: '会社案内パンフレット', genre: '共通', group: 'パンフレット', stock: 400, last_reprint_date: '2025-04-01', last_reprint_qty: 2000, last_reprint_cost: 300000, delivery_to: '吉田スタジオ', next_reprint_date: '2025-10-01', notes: '全事業部共通', data_url: '', size: 'A4', paper_type: 'マットコート紙' },
      { name: '社用封筒（角2）', genre: '共通', group: '封筒', stock: 2000, last_reprint_date: '2025-06-01', last_reprint_qty: 5000, last_reprint_cost: 45000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: 'ロゴ入り', data_url: '', size: '角2封筒', paper_type: 'ケント紙' },
      { name: '名刺用紙', genre: '共通', group: '紙類', stock: 1500, last_reprint_date: '2025-09-01', last_reprint_qty: 5000, last_reprint_cost: 25000, delivery_to: '吉田スタジオ', next_reprint_date: null, notes: '各部署共通デザイン', data_url: '', size: '名刺サイズ', paper_type: '特殊紙' },
    ].map(d => ({ ...d, image_url: makeDemoImage(d.name, d.genre, d.group, colors[d.genre][0], colors[d.genre][1]) }));
    const newItems = demo.map(d => ({ ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    setItems(newItems);
    showToast(`${newItems.length}件のデモデータを登録しました`);
  };

  // ─── カタログCRUD ───
  const openNewItem = () => { setEditingItemId(null); setItemForm(EMPTY_ITEM); setShowItemModal(true); };
  const openEditItem = (item) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name, genre: item.genre, group: item.group || 'パンフレット',
      active: item.active !== false,
      stock: item.stock ?? '', next_reprint_date: item.next_reprint_date || '',
      last_reprint_qty: item.last_reprint_qty ?? '', last_reprint_cost: item.last_reprint_cost ?? '',
      last_reprint_date: item.last_reprint_date || '',
      data_url: item.data_url || '', delivery_to: item.delivery_to || '',
      notes: item.notes || '', image_url: item.image_url || '',
      size: item.size || '', paper_type: item.paper_type || '', supplier: item.supplier || '',
    });
    setShowItemModal(true);
  };
  const saveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;
    const payload = {
      ...itemForm,
      stock: itemForm.stock === '' ? null : Number(itemForm.stock),
      last_reprint_qty: itemForm.last_reprint_qty === '' ? null : Number(itemForm.last_reprint_qty),
      last_reprint_cost: itemForm.last_reprint_cost === '' ? null : Number(itemForm.last_reprint_cost),
      next_reprint_date: itemForm.next_reprint_date || null,
      last_reprint_date: itemForm.last_reprint_date || null,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingItemId) {
        await updateDoc(doc(db, 'catalog_items', editingItemId), payload);
        showToast('更新しました');
      } else {
        payload.created_at = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'catalog_items'), payload);
        // 前回増刷情報があれば増刷履歴に自動登録
        if (itemForm.last_reprint_date) {
          const reprintPayload = {
            catalog_item_id: docRef.id,
            reprint_date: itemForm.last_reprint_date,
            cost: Number(itemForm.last_reprint_cost) || 0,
            quantity: Number(itemForm.last_reprint_qty) || 0,
            file_url: '', file_name: '', notes: '', delivery_to: '',
            created_at: new Date().toISOString(),
          };
          await addDoc(collection(db, 'catalog_reprints'), reprintPayload);
        }
        showToast('登録しました');
      }
    } catch (err) {
      console.error(err);
      showToast('保存に失敗しました');
    }
    setShowItemModal(false);
  };
  const deleteItem = async (id) => {
    if (!confirm('このカタログを削除しますか？')) return;
    try { await deleteDoc(doc(db, 'catalog_items', id)); } catch (_) {}
    if (expandedId === id) setExpandedId(null);
    showToast('削除しました');
  };

  // ─── 増刷CRUD ───
  const openNewReprint = (itemId) => { setReprintTargetItemId(itemId); setEditingReprintId(null); setReprintForm(EMPTY_REPRINT); setShowReprintModal(true); };
  const openEditReprint = (reprint) => {
    setReprintTargetItemId(reprint.catalog_item_id);
    setEditingReprintId(reprint.id);
    setReprintForm({ reprint_date: reprint.reprint_date || '', cost: reprint.cost || '', quantity: reprint.quantity || '', file_url: reprint.file_url || '', file_name: reprint.file_name || '', notes: reprint.notes || '', designer: reprint.designer || '' });
    setShowReprintModal(true);
  };
  const saveReprint = async (e) => {
    e.preventDefault();
    if (!reprintForm.reprint_date) return;
    const payload = { catalog_item_id: reprintTargetItemId, reprint_date: reprintForm.reprint_date, cost: Number(reprintForm.cost) || 0, quantity: Number(reprintForm.quantity) || 0, file_url: reprintForm.file_url, file_name: reprintForm.file_name, notes: reprintForm.notes, designer: reprintForm.designer || '' };
    try {
      if (editingReprintId) {
        await updateDoc(doc(db, 'catalog_reprints', editingReprintId), payload);
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, 'catalog_reprints'), payload);
      }
    } catch (_) {}
    showToast(editingReprintId ? '増刷記録を更新しました' : '増刷記録を追加しました');
    setShowReprintModal(false);
  };
  const deleteReprint = async (id) => {
    if (!confirm('この増刷記録を削除しますか？')) return;
    try { await deleteDoc(doc(db, 'catalog_reprints', id)); } catch (_) {}
    showToast('削除しました');
  };

  // ─── 設定保存 ───
  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      if (newPassword.trim()) {
        await setDoc(doc(db, 'catalog_settings', 'app_password'), { value: newPassword.trim(), updated_at: new Date().toISOString() });
        setNewPassword('');
      }
    } catch (_) {}
    showToast('パスワードを変更しました');
    setShowSettings(false);
  };

  const saveNewOpenItems = async () => {
    try {
      await setDoc(doc(db, 'catalog_settings', 'new_open_items'), { value: newOpenItemIds, updated_at: new Date().toISOString() });
      showToast('新規オープンリストを保存しました');
    } catch (_) {
      showToast('保存に失敗しました');
    }
  };

  // ─── 店舗準備 ───
  const openNewStoreSetup = () => {
    const setupItems = newOpenItemIds.map(id => {
      const latestReprint = reprints.find(r => r.catalog_item_id === id);
      return {
        item_id: id,
        ...EMPTY_SETUP_ITEM,
        supplier: latestReprint?.supplier || '',
        designer: latestReprint?.designer || '',
      };
    });
    setStoreSetupData({ id: null, storeName: '', openDate: '', items: setupItems });
    setShowNewOpenModal(false);
    setShowStoreSetupModal(true);
  };

  const openExistingStoreSetup = (setup) => {
    setStoreSetupData({ id: setup.id, storeName: setup.store_name, openDate: setup.open_date || '', items: setup.items || [] });
    setShowNewOpenModal(false);
    setShowStoreSetupModal(true);
  };

  const updateSetupItem = (idx, field, value) => {
    setStoreSetupData(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
    }));
  };

  const saveStoreSetup = async () => {
    if (!storeSetupData.storeName.trim()) { showToast('店舗名を入力してください'); return; }
    const payload = {
      store_name: storeSetupData.storeName,
      open_date: storeSetupData.openDate,
      items: storeSetupData.items,
      updated_at: new Date().toISOString(),
    };
    try {
      if (storeSetupData.id) {
        await updateDoc(doc(db, 'catalog_store_setups', storeSetupData.id), payload);
      } else {
        payload.created_at = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'catalog_store_setups'), payload);
        setStoreSetupData(prev => ({ ...prev, id: docRef.id }));
      }
      showToast('店舗準備データを保存しました');
      setShowStoreSetupModal(false);
    } catch (_) {
      showToast('保存に失敗しました');
    }
  };

  const deleteStoreSetup = async (id) => {
    if (!confirm('この店舗準備データを削除しますか？')) return;
    try { await deleteDoc(doc(db, 'catalog_store_setups', id)); } catch (_) {}
    showToast('削除しました');
  };

  // ─── ログイン画面 ───
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
        <form onSubmit={handleLogin} className="glass-strong rounded-2xl p-8 w-full max-w-sm animate-modal">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Icon name="book-open" size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">販促ナビ</h1>
            <p className="text-sm text-slate-400 mt-1">印刷物在庫・増刷管理システム</p>
          </div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="パスワード" className="glass-input w-full rounded-xl px-4 py-3 mb-3" autoFocus />
          {pwError && <p className="text-red-500 text-sm mb-3">{pwError}</p>}
          <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition shadow-lg">ログイン</button>
        </form>
      </div>
    );
  }

  // ─── メイン画面 ───
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg animate-enter text-sm font-bold">{toast}</div>}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Icon name="book-open" size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-800">販促ナビ</h1>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{filteredItems.length}件</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowManual(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="使い方">
                <Icon name="book-open" size={14} /> 使い方
              </button>
              <button onClick={() => setShowFaq(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="FAQ">
                <Icon name="help-circle" size={14} /> FAQ
              </button>
              <button onClick={() => setShowNewOpenModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="新規オープン">
                <Icon name="store" size={14} /> 新規オープン
              </button>
              <button onClick={openNewItem} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition flex items-center gap-1.5 shadow-md">
                <Icon name="plus" size={16} /> 新規登録
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterGenre('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${!filterGenre ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>すべて</button>
            {GENRES.map(g => {
              const c = GENRE_COLORS[g];
              return <button key={g} onClick={() => setFilterGenre(filterGenre === g ? '' : g)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterGenre === g ? `${c.bg} ${c.text}` : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>{g}</button>;
            })}
            <span className="text-slate-200 mx-1">|</span>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="glass-input rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer">
              <option value="">すべてのグループ</option>
              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className="text-slate-200 mx-1">|</span>
            <div className="flex items-center gap-1">
              <Icon name="arrow-up-down" size={12} className="text-slate-400" />
              {SORT_OPTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => toggleSort(key)} className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-0.5 ${sortKey === key ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                  {label}
                  {sortKey === key && (sortDir === 'asc' ? <Icon name="arrow-up" size={10} /> : <Icon name="arrow-down" size={10} />)}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode('gallery')} className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 text-xs font-bold ${viewMode === 'gallery' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="ギャラリー表示">
                  <Icon name="image" size={14} /> ギャラリー
                </button>
                <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 text-xs font-bold ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="テーブル表示">
                  <Icon name="list" size={14} /> リスト
                </button>
              </div>
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="商品名や納品先で検索..." className="glass-input pl-9 pr-4 py-1.5 rounded-lg text-sm w-56" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 事業部サマリーカード */}
        {[['新築', 'リフォーム', '不動産', 'ソリューション'], ['リゾート', '工事部', '共通', 'ノベルティ']].map((row, ri) => (
          <div key={ri} className={`grid gap-3 ${ri === 0 ? 'mb-3 grid-cols-2 md:grid-cols-4' : 'mb-4 grid-cols-2 md:grid-cols-4'}`}>
            {row.map(genre => {
              const s = genreSummary.find(g => g.genre === genre) || { genre, count: 0 };
              const c = GENRE_COLORS[genre];
              return (
                <div key={genre} className="bg-white rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition border border-slate-100" onClick={() => setSelectedSummaryGenre(selectedSummaryGenre === genre ? '' : genre)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      <span className="text-sm font-bold text-slate-700">{genre}</span>
                    </div>
                    <span className="flex items-center gap-1"><span className="text-[10px] text-slate-400">アイテム数</span><span className="text-lg font-bold text-slate-800">{s.count}<span className="text-xs text-slate-400 ml-0.5">件</span></span></span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 期別増刷金額ポップアップ */}
        {selectedSummaryGenre && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSummaryGenre('')}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 animate-modal max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${GENRE_COLORS[selectedSummaryGenre]?.dot}`} />
                  {selectedSummaryGenre} — 期別増刷金額
                </h2>
                <button onClick={() => setSelectedSummaryGenre('')} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
              </div>
              {genreKiCosts.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">増刷履歴がありません</p>
              ) : (
                <div className="space-y-2">
                  {genreKiCosts.map(({ ki, label, range, total }) => (
                    <div key={ki} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-bold text-slate-800">{label}</span>
                        <span className="text-xs text-slate-400 ml-2">{range}</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{formatCost(total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <hr className="border-slate-200 mb-6" />

        {/* テーブル */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse">読み込み中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Icon name="book-open" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">{items.length === 0 ? 'カタログが登録されていません' : '条件に一致するカタログがありません'}</p>
            {items.length === 0 && (
              <div className="flex gap-3 mt-4 justify-center">
                <button onClick={openNewItem} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 shadow-md">最初のカタログを登録</button>
                <button onClick={loadDemoData} className="border border-slate-300 text-slate-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition">デモデータを登録</button>
              </div>
            )}
          </div>
        ) : viewMode === 'gallery' ? (
          /* ━━━ ギャラリー（ビジュアル画像）表示 ━━━ */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map(item => {
              const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
              const inactive = item.active === false;
              return (
                <div key={item.id} className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm hover:shadow-lg transition group cursor-pointer ${gc.border} ${inactive ? 'opacity-40 grayscale' : ''}`} onClick={() => setDetailItem(item)}>
                  {/* サムネイル */}
                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <Icon name="image" size={40} className="mb-2 opacity-40" />
                        <span className="text-[10px]">No Image</span>
                      </div>
                    )}
                    {/* 事業部バッジ */}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold ${gc.bg} ${gc.text} shadow-sm`}>{item.genre}</span>
                  </div>
                  {/* 情報 */}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-slate-800 truncate mb-1.5">{item.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {item.group && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.group}</span>}
                      {item.size && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.size}</span>}
                      {item.paper_type && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.paper_type}</span>}
                    </div>
                    <div className="flex items-baseline justify-end">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] text-slate-400 leading-none">前回増刷</span>
                        <span className="text-sm font-bold text-slate-600 leading-none">{item.last_reprint_date ? formatYearMonth(item.last_reprint_date) : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ━━━ リスト（テーブル）表示 ━━━ */
          <div className="bg-white rounded-xl overflow-x-auto border border-slate-100 shadow-sm">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="w-12 px-1 py-2 text-center">画像</th>
                  <th className="text-center px-1 py-2">商品名</th>
                  <th className="text-center px-1 py-2 w-20">事業部</th>
                  <th className="text-center px-1 py-2 w-20">グループ</th>
                  <th className="text-center px-1 py-2 w-10">サイズ</th>
                  <th className="text-center px-1 py-2 w-16">紙種</th>
                  <th className="text-center px-1 py-2 w-20">前回増刷</th>
                  <th className="text-center px-1 py-2 w-24">次回増刷予定</th>
                </tr>
              </thead>
              <tbody>
            {filteredItems.map(item => {
              const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
              const inactive = item.active === false;

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={`animate-enter cursor-pointer transition border-b border-slate-100 hover:bg-slate-50 ${inactive ? 'opacity-40 grayscale' : ''}`}
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-1 py-2 text-center">
                      <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 flex items-center justify-center mx-auto">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="image" size={14} className="text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2 font-bold text-slate-800 text-sm">{item.name}</td>
                    <td className="px-1 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${gc.bg} ${gc.text}`}>{item.genre}</span></td>
                    <td className="px-1 py-2 text-center text-[11px] text-slate-500 whitespace-nowrap">{GROUP_ICONS[item.group] || '📋'} {item.group || '—'}</td>
                    <td className="px-1 py-2 text-center text-[11px] text-slate-500 whitespace-nowrap">{item.size || '—'}</td>
                    <td className="px-1 py-2 text-center text-[11px] text-slate-500 whitespace-nowrap">{item.paper_type || '—'}</td>
                    <td className="px-1 py-2 text-center text-[11px] text-slate-500 whitespace-nowrap">{formatYearMonth(item.last_reprint_date)}</td>
                    <td className="px-1 py-2 text-center whitespace-nowrap">
                      {item.next_reprint_date ? (
                        <span className="text-[11px] font-bold text-slate-600">
                          {formatYearMonth(item.next_reprint_date)}
                        </span>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowItemModal(false)}>
          <form onSubmit={saveItem} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 animate-modal max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editingItemId ? '販促物編集' : '販促物新規登録'}</h2>

            {/* 基本情報セクション */}
            <div className="border border-slate-200 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-1.5"><Icon name="info" size={14} /> 基本情報</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">ビジュアル画像</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition"
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files[0]); }}
                  >
                    {itemForm.image_url ? (
                      <img src={itemForm.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="camera" size={24} className="text-slate-300" />
                    )}
                  </div>
                  <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} />
                  <div className="text-xs text-slate-400">
                    <p>クリックまたはドラッグ&ドロップ</p>
                    <p>JPG, PNG, GIF, WebP</p>
                    {itemForm.image_url && <button type="button" onClick={() => setItemForm(f => ({ ...f, image_url: '' }))} className="text-red-500 hover:text-red-600 mt-1">画像を削除</button>}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">商品名 *</label>
                <input type="text" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" required autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-2">使用状況</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setItemForm(f => ({ ...f, active: true }))} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${itemForm.active !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}>使用中</button>
                    <button type="button" onClick={() => setItemForm(f => ({ ...f, active: false }))} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${itemForm.active === false ? 'bg-slate-200 text-slate-700 border-slate-400' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}>使用していない</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-2">グループ</label>
                  <select value={itemForm.group} onChange={e => setItemForm(f => ({ ...f, group: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5">
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">事業部 *</label>
                <div className="flex gap-1 flex-wrap">
                  {GENRES.map(g => {
                    const c = GENRE_COLORS[g];
                    return (
                      <button key={g} type="button" onClick={() => setItemForm(f => ({ ...f, genre: g }))} className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition whitespace-nowrap ${itemForm.genre === g ? `${c.bg} ${c.text} ${c.border}` : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>{g}</button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">サイズ</label>
                  <select value={itemForm.size} onChange={e => setItemForm(f => ({ ...f, size: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5">
                    <option value="">選択してください</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 flex items-center justify-between mb-1">
                    <span>紙の種類</span>
                    <button type="button" onClick={() => setItemForm(f => ({ ...f, paper_type: '', _paperCustom: !f._paperCustom }))} className="text-[10px] text-indigo-500 hover:text-indigo-700">
                      {itemForm._paperCustom ? '← リストから選択' : '自由入力 →'}
                    </button>
                  </label>
                  {itemForm._paperCustom ? (
                    <input type="text" value={itemForm.paper_type} onChange={e => setItemForm(f => ({ ...f, paper_type: e.target.value }))} placeholder="紙の種類を入力" className="glass-input w-full rounded-xl px-4 py-2.5" />
                  ) : (
                    <select value={itemForm.paper_type} onChange={e => setItemForm(f => ({ ...f, paper_type: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5">
                      <option value="">選択してください</option>
                      {PAPER_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">吉田スタジオ在庫数</label>
                  <input type="number" value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} placeholder="例: 250" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">次回増刷予定</label>
                  <input type="month" value={(itemForm.next_reprint_date || '').slice(0, 7)} onChange={e => setItemForm(f => ({ ...f, next_reprint_date: e.target.value ? e.target.value + '-01' : '' }))} className="glass-input w-full rounded-xl px-4 py-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">データ格納先URL</label>
                <input type="url" value={itemForm.data_url} onChange={e => setItemForm(f => ({ ...f, data_url: e.target.value }))} placeholder="https://..." className="glass-input w-full rounded-xl px-4 py-2.5" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">備考</label>
                <textarea value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="glass-input w-full rounded-xl px-4 py-2.5 resize-none" />
              </div>
            </div>
            </div>

            {/* 増刷情報セクション */}
            <div className="border border-slate-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Icon name="history" size={14} /> 増刷情報</h3>
                {!editingItemId && (
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 text-[10px] font-bold cursor-pointer hover:bg-indigo-100 transition">
                    <Icon name="file-text" size={10} /> 見積PDF取込
                    <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        showToast('PDF解析中...');
                        const data = await extractFromPdf(file);
                        setItemForm(f => ({
                          ...f,
                          ...(data.reprint_date && { last_reprint_date: data.reprint_date }),
                          ...(data.cost && { last_reprint_cost: data.cost }),
                          ...(data.quantity && { last_reprint_qty: data.quantity }),
                          ...(data.supplier && { supplier: data.supplier }),
                        }));
                        showToast('PDFから情報を読み取りました');
                      } catch (err) {
                        console.error(err);
                        showToast('PDF解析に失敗しました');
                      }
                      e.target.value = '';
                    }} />
                  </label>
                )}
              </div>
              {editingItemId ? (
                /* 編集時: 増刷履歴をインライン編集 */
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1"><Icon name="list" size={12} /> 増刷履歴</span>
                    <button type="button" onClick={() => { setInlineReprintEditId(null); setInlineReprintForm(EMPTY_REPRINT); setShowInlineReprintForm(true); setReprintTargetItemId(editingItemId); }} className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg font-bold hover:bg-indigo-100 transition flex items-center gap-0.5 border border-indigo-200"><Icon name="plus" size={10} /> 追加</button>
                  </div>

                  {showInlineReprintForm && (
                    <div className="bg-indigo-50 rounded-xl p-3 mb-3 border border-indigo-200 animate-enter">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><Icon name={inlineReprintEditId ? 'square-pen' : 'plus'} size={10} /> {inlineReprintEditId ? '増刷記録を編集' : '増刷記録を追加'}</h4>
                        <label className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-[9px] font-bold cursor-pointer hover:bg-indigo-50 transition">
                          <Icon name="file-text" size={9} /> 見積PDF読込
                          <input type="file" accept=".pdf" className="hidden" onChange={async (ev) => {
                            const file = ev.target.files?.[0];
                            if (!file) return;
                            try {
                              showToast('PDF解析中...');
                              const data = await extractFromPdf(file);
                              setInlineReprintForm(f => ({
                                ...f,
                                ...(data.reprint_date && { reprint_date: data.reprint_date }),
                                ...(data.cost && { cost: data.cost }),
                                ...(data.quantity && { quantity: data.quantity }),
                                ...(data.supplier && { supplier: data.supplier }),
                              }));
                              showToast('PDFから情報を読み取りました');
                            } catch (err) { showToast('PDF解析に失敗しました'); }
                            ev.target.value = '';
                          }} />
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">増刷日 *</label>
                          <input type="date" value={inlineReprintForm.reprint_date} onChange={e => setInlineReprintForm(f => ({ ...f, reprint_date: e.target.value }))} className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">金額（円）</label>
                          <input type="number" value={inlineReprintForm.cost} onChange={e => setInlineReprintForm(f => ({ ...f, cost: e.target.value }))} placeholder="150000" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" min="0" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">部数</label>
                          <input type="number" value={inlineReprintForm.quantity} onChange={e => setInlineReprintForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1000" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" min="0" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">印刷会社</label>
                          <input type="text" value={inlineReprintForm.supplier || ''} onChange={e => setInlineReprintForm(f => ({ ...f, supplier: e.target.value }))} placeholder="例: 〇〇印刷" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">デザイナー</label>
                          <input type="text" value={inlineReprintForm.designer || ''} onChange={e => setInlineReprintForm(f => ({ ...f, designer: e.target.value }))} placeholder="例: 田中デザイン事務所" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">備考</label>
                          <input type="text" value={inlineReprintForm.notes} onChange={e => setInlineReprintForm(f => ({ ...f, notes: e.target.value }))} placeholder="例: デザイン変更" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">納品先（複数選択可）</label>
                        <div className="grid grid-cols-3 gap-1 bg-white rounded-lg p-2 border border-slate-200">
                          {LOCATIONS.map(l => {
                            const selected = (inlineReprintForm.delivery_to || '').split(', ').filter(Boolean);
                            return (
                              <label key={l} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 rounded px-1.5 py-1 transition">
                                <input type="checkbox" checked={selected.includes(l)} onChange={e => {
                                  const newList = e.target.checked ? [...selected, l] : selected.filter(x => x !== l);
                                  setInlineReprintForm(f => ({ ...f, delivery_to: newList.join(', ') }));
                                }} className="w-3 h-3 rounded accent-indigo-500" />
                                <span className="text-[10px] text-slate-700">{l}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setShowInlineReprintForm(false); setInlineReprintEditId(null); }} className="flex-1 border border-slate-200 rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:bg-white transition">キャンセル</button>
                        <button type="button" onClick={async () => {
                          if (!inlineReprintForm.reprint_date) return;
                          const payload = { catalog_item_id: editingItemId, reprint_date: inlineReprintForm.reprint_date, cost: Number(inlineReprintForm.cost) || 0, quantity: Number(inlineReprintForm.quantity) || 0, file_url: inlineReprintForm.file_url, file_name: inlineReprintForm.file_name, notes: inlineReprintForm.notes, delivery_to: inlineReprintForm.delivery_to || '', supplier: inlineReprintForm.supplier || '', designer: inlineReprintForm.designer || '' };
                          try {
                            if (inlineReprintEditId) {
                              await updateDoc(doc(db, 'catalog_reprints', inlineReprintEditId), payload);
                              showToast('増刷記録を更新しました');
                            } else {
                              payload.created_at = new Date().toISOString();
                              await addDoc(collection(db, 'catalog_reprints'), payload);
                              showToast('増刷記録を追加しました');
                            }
                          } catch (_) {}
                          setShowInlineReprintForm(false);
                          setInlineReprintForm(EMPTY_REPRINT);
                          setInlineReprintEditId(null);
                        }} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition">保存</button>
                      </div>
                    </div>
                  )}

                  {getReprints(editingItemId).length === 0 && !showInlineReprintForm ? (
                    <p className="text-slate-400 text-xs py-4 text-center">増刷履歴がありません</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                      {getReprints(editingItemId).filter(r => r.id !== inlineReprintEditId).map(r => (
                        <div key={r.id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[11px]">
                          <div className="grid grid-cols-3 gap-2 mb-1">
                            <div><span className="text-slate-400">増刷日</span><br /><span className="font-bold text-slate-800">{formatDate(r.reprint_date)}</span></div>
                            <div><span className="text-slate-400">金額</span><br /><span className="font-bold text-slate-800">{formatCost(r.cost)}</span></div>
                            <div><span className="text-slate-400">部数</span><br /><span className="font-bold text-slate-800">{r.quantity > 0 ? Number(r.quantity).toLocaleString() : '—'}</span></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px]">
                              {r.supplier && <span><span className="text-slate-400">印刷会社:</span> <span className="text-slate-700">{r.supplier}</span></span>}
                              {r.designer && <span><span className="text-slate-400">デザイナー:</span> <span className="text-slate-700">{r.designer}</span></span>}
                              {r.delivery_to && <span><span className="text-slate-400">納品先:</span> <span className="text-slate-700">{r.delivery_to}</span></span>}
                              {r.notes && <span><span className="text-slate-400">備考:</span> <span className="text-slate-700">{r.notes}</span></span>}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button type="button" onClick={() => { setInlineReprintEditId(r.id); setInlineReprintForm({ reprint_date: r.reprint_date || '', cost: r.cost || '', quantity: r.quantity || '', file_url: r.file_url || '', file_name: r.file_name || '', notes: r.notes || '', delivery_to: r.delivery_to || '', supplier: r.supplier || '', designer: r.designer || '' }); setShowInlineReprintForm(true); }} className="p-1 text-slate-400 hover:text-indigo-500 transition"><Icon name="square-pen" size={12} /></button>
                              <button type="button" onClick={() => deleteReprint(r.id)} className="p-1 text-slate-400 hover:text-red-500 transition"><Icon name="trash-2" size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* 新規登録時: 従来のフィールド */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">前回増刷年月</label>
                      <input type="date" value={itemForm.last_reprint_date} onChange={e => setItemForm(f => ({ ...f, last_reprint_date: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">前回増刷部数</label>
                      <input type="number" value={itemForm.last_reprint_qty} onChange={e => setItemForm(f => ({ ...f, last_reprint_qty: e.target.value }))} placeholder="例: 1000" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">前回増刷金額</label>
                      <input type="number" value={itemForm.last_reprint_cost} onChange={e => setItemForm(f => ({ ...f, last_reprint_cost: e.target.value }))} placeholder="例: 150000" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">印刷会社</label>
                      <input type="text" value={itemForm.supplier} onChange={e => setItemForm(f => ({ ...f, supplier: e.target.value }))} placeholder="例: 〇〇印刷" className="glass-input w-full rounded-xl px-4 py-2.5" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">デザイナー</label>
                      <input type="text" value={itemForm.designer || ''} onChange={e => setItemForm(f => ({ ...f, designer: e.target.value }))} placeholder="例: 田中デザイン事務所" className="glass-input w-full rounded-xl px-4 py-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">納品先（複数選択可）</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-200">
                      {LOCATIONS.map(l => {
                        const selected = (itemForm.delivery_to || '').split(', ').filter(Boolean);
                        return (
                          <label key={l} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1.5 transition">
                            <input type="checkbox" checked={selected.includes(l)} onChange={e => {
                              const newList = e.target.checked ? [...selected, l] : selected.filter(x => x !== l);
                              setItemForm(f => ({ ...f, delivery_to: newList.join(', ') }));
                            }} className="w-3.5 h-3.5 rounded accent-indigo-500" />
                            <span className="text-xs text-slate-700">{l}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* Reprint Modal */}
      {showReprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowReprintModal(false)}>
          <form onSubmit={saveReprint} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-modal">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{editingReprintId ? '増刷記録編集' : '増刷記録追加'}</h2>
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold cursor-pointer hover:bg-indigo-100 transition">
                <Icon name="file-text" size={14} /> 見積PDF読込
                <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    showToast('PDF解析中...');
                    const data = await extractFromPdf(file);
                    setReprintForm(f => ({
                      ...f,
                      ...(data.reprint_date && { reprint_date: data.reprint_date }),
                      ...(data.cost && { cost: data.cost }),
                      ...(data.quantity && { quantity: data.quantity }),
                    }));
                    showToast('PDFから情報を読み取りました');
                  } catch (err) {
                    console.error(err);
                    showToast('PDF解析に失敗しました');
                  }
                  e.target.value = '';
                }} />
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">増刷日 *</label>
                <input type="date" value={reprintForm.reprint_date} onChange={e => setReprintForm(f => ({ ...f, reprint_date: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">金額（円）</label>
                  <input type="number" value={reprintForm.cost} onChange={e => setReprintForm(f => ({ ...f, cost: e.target.value }))} placeholder="150000" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">部数</label>
                  <input type="number" value={reprintForm.quantity} onChange={e => setReprintForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1000" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">デザイナー</label>
                <input type="text" value={reprintForm.designer} onChange={e => setReprintForm(f => ({ ...f, designer: e.target.value }))} placeholder="例: 田中デザイン事務所" className="glass-input w-full rounded-xl px-4 py-2.5" />
              </div>
              <FileUpload label="入稿データ" fileUrl={reprintForm.file_url} fileName={reprintForm.file_name} onFileChange={(url, name) => setReprintForm(f => ({ ...f, file_url: url, file_name: name }))} />
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">備考</label>
                <textarea value={reprintForm.notes} onChange={e => setReprintForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="glass-input w-full rounded-xl px-4 py-2.5 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowReprintModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md">保存</button>
            </div>
          </form>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <form onSubmit={saveSettings} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-modal">
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><Icon name="lock" size={20} className="text-indigo-500" /> パスワード変更</h2>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新しいパスワード" className="glass-input w-full rounded-xl px-4 py-2.5" autoFocus />
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md">変更</button>
            </div>
          </form>
        </div>
      )}
      {/* Manual Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowManual(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 animate-modal max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Icon name="book-open" size={16} className="text-indigo-600" /></div>
                使い方マニュアル
              </h2>
              <button onClick={() => setShowManual(false)} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
            </div>
            <div className="space-y-6 text-sm text-slate-600">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="image" size={14} className="text-indigo-500" /> ギャラリー表示 / リスト表示</h3>
                <p>ヘッダー右上の切替ボタンで、ギャラリー（カード形式）とリスト（テーブル形式）を切り替えられます。各アイテムをクリックすると詳細画面が表示されます。アイテムの枠線は事業部ごとの色で表示されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="plus" size={14} className="text-indigo-500" /> 販促物の新規登録</h3>
                <p>右上の「新規登録」ボタンから販促物を登録できます。商品名・事業部（新築/リフォーム/不動産/ソリューション/リゾート/工事部/共通/ノベルティ）・グループ・サイズ・紙の種類・ビジュアル画像・データ格納先URL・納品先などを入力します。前回増刷情報を入力すると増刷履歴にも自動登録されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="square-pen" size={14} className="text-amber-500" /> 販促物の編集・削除</h3>
                <p>各アイテムの詳細画面下部、またはリスト表示の操作列から編集・削除ができます。ギャラリー表示ではホバー時にもボタンが表示されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="history" size={14} className="text-indigo-500" /> 増刷履歴の管理</h3>
                <p>各アイテムの詳細画面で増刷履歴の追加・編集・削除ができます。増刷日・金額・部数・印刷会社・デザイナー・納品先・備考を記録できます。「見積PDF読込」ボタンからPDFファイルをアップロードすると、日付・金額・部数・印刷会社を自動で読み取ります。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="bar-chart-2" size={14} className="text-indigo-500" /> 事業部別サマリー</h3>
                <p>画面上部の事業部カードをクリックすると、期別（9月〜翌年8月）の合計増刷金額をポップアップで確認できます。期の表記は「26S」=2025年9月〜2026年8月です。上段に新築・リフォーム・不動産・ソリューション、下段にリゾート・工事部・共通・ノベルティが表示されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="filter" size={14} className="text-indigo-500" /> フィルター・検索・並び替え</h3>
                <p>ヘッダーの事業部タブ・グループ選択でフィルタリング、検索ボックスで商品名・備考・納品先を横断検索できます。並び替えボタンで登録順・アイテム名・増刷年月・増刷金額・在庫数の昇順/降順ソートが可能です。1回クリックで昇順、もう1回で降順、さらにクリックで解除です。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="store" size={14} className="text-emerald-500" /> 新規オープン機能</h3>
                <p>ヘッダーの「新規オープン」ボタンから、新規店舗オープン時に必要なアイテムの管理ができます。</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-slate-500">
                  <li><strong>必要アイテム一覧</strong> — 「編集」ボタンで登録済みアイテムから必要なものをチェックして保存</li>
                  <li><strong>新規店舗準備</strong> — 店舗名とオープン予定日を入力し、各アイテムのステータス（未着手→見積中→発注済→納品済）・必要部数・印刷会社・デザイナー・金額・納品予定日・備考を管理</li>
                  <li><strong>進捗管理</strong> — 完了チェックとプログレスバーで準備状況を一目で確認</li>
                  <li><strong>店舗準備リスト</strong> — 過去の店舗準備データも一覧から確認・再編集可能</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowFaq(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 animate-modal max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Icon name="help-circle" size={16} className="text-amber-600" /></div>
                よくある質問（FAQ）
              </h2>
              <button onClick={() => setShowFaq(false)} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { q: 'データはどこに保存されますか？', a: 'Firebase（クラウドデータベース）にリアルタイムで保存されます。複数端末から同時にアクセスしても自動で同期されます。' },
                { q: 'ログインパスワードを忘れました', a: '初期パスワードは「catalog1234」です。変更済みの場合は管理者にお問い合わせください。パスワード変更は「新規オープン」ボタン内の歯車アイコンから行えます。' },
                { q: '画像はどの形式に対応していますか？', a: 'JPG、PNG、GIF、WebPに対応しています。登録画面でクリックまたはドラッグ&ドロップでアップロードできます。' },
                { q: '増刷履歴でPDFから情報を読み取れますか？', a: 'はい、増刷記録の追加フォームにある「見積PDF読込」ボタンからPDFをアップロードすると、日付・金額・部数・印刷会社を自動で読み取ってフォームに入力します。' },
                { q: '期別増刷金額の「26S」とは何ですか？', a: '「26S」は2025年9月〜2026年8月の期間を表します。9月始まり・8月終わりの年度区分です。事業部カードをクリックすると期別の合計増刷金額を確認できます。' },
                { q: '事業部の種類は？', a: '新築・リフォーム・不動産・ソリューション・リゾート・工事部・共通・ノベルティの8つの事業部があります。' },
                { q: '新規オープン機能の使い方は？', a: 'ヘッダーの「新規オープン」→「編集」で必要アイテムを選択・保存します。「新規店舗準備」ボタンで店舗名を入力すると、選択したアイテムの準備状況（ステータス・印刷会社・デザイナー・金額・納品予定日など）を一覧で管理できます。' },
                { q: '店舗準備のステータスは？', a: '未着手→見積中→発注済→納品済の4段階です。完了チェックを入れると進捗バーに反映されます。' },
                { q: '納品先を複数選択できますか？', a: 'はい、販促物登録・増刷履歴の納品先はチェックリストから複数選択できます。' },
                { q: 'アイテムを誤って削除してしまいました', a: '削除は確認ダイアログが表示されますが、一度削除すると復元できません。重要なデータは定期的にバックアップしてください。' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="font-bold text-slate-800 text-sm flex items-start gap-2"><span className="text-indigo-500 mt-0.5">Q.</span>{item.q}</p>
                  <p className="text-slate-600 text-sm mt-2 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">A.</span>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* New Open Modal */}
      {showNewOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowNewOpenModal(false); setNewOpenEditMode(false); }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 animate-modal max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Icon name="store" size={16} className="text-indigo-600" /></div>
                新規店舗必要アイテム一覧
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{newOpenItemIds.length}件</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewOpenEditMode(!newOpenEditMode)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${newOpenEditMode ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-blue-600 hover:bg-blue-50 border-blue-200'}`}>
                  <Icon name="square-pen" size={12} /> {newOpenEditMode ? '編集中' : '登録アイテムを編集'}
                </button>
                <button onClick={openNewStoreSetup} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  <Icon name="plus" size={12} /> 準備リストを作成
                </button>
                <button onClick={() => { setShowNewOpenModal(false); setNewOpenEditMode(false); }} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
              </div>
            </div>

            {newOpenEditMode ? (
              <>
                {/* 編集モード: 事業部フィルタ + 全アイテムチェックボックス */}
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  <button onClick={() => setNewOpenFilterGenre('')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${!newOpenFilterGenre ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>すべて</button>
                  {GENRES.map(g => {
                    const c = GENRE_COLORS[g];
                    return <button key={g} onClick={() => setNewOpenFilterGenre(newOpenFilterGenre === g ? '' : g)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${newOpenFilterGenre === g ? `${c.bg} ${c.text}` : 'text-slate-500 hover:bg-slate-100'}`}>{g}</button>;
                  })}
                </div>
                <div className="space-y-1.5 mb-4 max-h-[50vh] overflow-y-auto">
                  {items.filter(i => !newOpenFilterGenre || i.genre === newOpenFilterGenre).map(item => {
                    const checked = newOpenItemIds.includes(item.id);
                    const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
                    return (
                      <label key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition border ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={checked} onChange={e => {
                          setNewOpenItemIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id));
                        }} className="w-4 h-4 rounded accent-indigo-500 flex-shrink-0" />
                        <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                          {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-contain" /> : <Icon name="image" size={12} className="text-slate-300 m-auto mt-2" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-800 truncate block">{item.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${gc.bg} ${gc.text}`}>{item.genre}</span>
                            <span className="text-[10px] text-slate-400">{item.group}</span>
                            {item.size && <span className="text-[10px] text-slate-400">{item.size}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setNewOpenEditMode(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
                  <button onClick={() => { saveNewOpenItems(); setNewOpenEditMode(false); }} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md flex items-center justify-center gap-1.5">
                    <Icon name="save" size={14} /> 保存
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 一覧表示モード: 選択済みアイテムのみ表示 */}
                {newOpenItemIds.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Icon name="store" size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold">アイテムが選択されていません</p>
                    <p className="text-xs mt-1">右上の「編集」ボタンから必要なアイテムを選択してください</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 mb-4 max-h-[40vh] overflow-y-auto">
                    {newOpenItemIds.map(id => {
                      const item = items.find(i => i.id === id);
                      if (!item) return null;
                      const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition cursor-pointer" onClick={() => { setShowNewOpenModal(false); setDetailItem(item); }}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-contain" /> : <Icon name="image" size={14} className="text-slate-300 m-auto mt-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-slate-800 truncate block">{item.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${gc.bg} ${gc.text}`}>{item.genre}</span>
                              <span className="text-[10px] text-slate-400">{item.group}</span>
                              {item.size && <span className="text-[10px] text-slate-400">{item.size}</span>}
                              {item.paper_type && <span className="text-[10px] text-slate-400">{item.paper_type}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 既存の店舗準備リスト */}
                {storeSetups.length > 0 && (
                  <div className="border-t-2 border-indigo-200 pt-4 mt-4">
                    <h3 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-1.5"><Icon name="clipboard-list" size={16} /> 店舗準備リスト</h3>
                    <div className="space-y-2">
                      {storeSetups.map(setup => {
                        const completedCount = (setup.items || []).filter(i => i.completed).length;
                        const totalCount = (setup.items || []).length;
                        const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
                        return (
                          <div key={setup.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 hover:shadow-md transition cursor-pointer ${pct === 100 ? 'bg-emerald-50 border-emerald-300' : 'bg-indigo-50 border-indigo-200'}`} onClick={() => openExistingStoreSetup(setup)}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${pct === 100 ? 'bg-emerald-200' : 'bg-indigo-200'}`}>
                              <Icon name="store" size={16} className={pct === 100 ? 'text-emerald-700' : 'text-indigo-700'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-bold text-slate-800">{setup.store_name}</span>
                              {setup.open_date && <span className="text-[10px] text-slate-400 ml-2">オープン: {formatDate(setup.open_date)}</span>}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{completedCount}/{totalCount}</span>
                                <span className="text-[10px] text-slate-400">({pct}%)</span>
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteStoreSetup(setup.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition flex-shrink-0"><Icon name="trash-2" size={14} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Store Setup Modal */}
      {showStoreSetupModal && (() => {
        const completedCount = storeSetupData.items.filter(i => i.completed).length;
        const totalCount = storeSetupData.items.length;
        const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowStoreSetupModal(false)}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-5xl mx-4 p-6 animate-modal max-h-[90vh] overflow-y-auto">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><Icon name="store" size={16} className="text-emerald-600" /></div>
                  新規店舗準備
                </h2>
                <button onClick={() => setShowStoreSetupModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
              </div>

              {/* 店舗情報 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">店舗名 *</label>
                  <input type="text" value={storeSetupData.storeName} onChange={e => setStoreSetupData(prev => ({ ...prev, storeName: e.target.value }))} placeholder="例: 松本店" className="glass-input w-full rounded-xl px-4 py-2.5" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">オープン予定日</label>
                  <input type="date" value={storeSetupData.openDate} onChange={e => setStoreSetupData(prev => ({ ...prev, openDate: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" />
                </div>
              </div>

              {/* 進捗バー */}
              <div className="flex items-center gap-3 mb-4 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                <span className="text-xs font-bold text-slate-500">進捗</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{completedCount} / {totalCount}</span>
                <span className="text-xs text-slate-400">({pct}%)</span>
              </div>

              {/* アイテムテーブル */}
              {totalCount === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="font-bold">必要アイテムが登録されていません</p>
                  <p className="text-xs mt-1">先に「新規店舗必要アイテム一覧」で必要なアイテムを選択してください</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl mb-4">
                  <table className="w-full min-w-[1000px] text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-100 bg-slate-50">
                        <th className="px-2 py-2 text-center w-8">完了</th>
                        <th className="px-2 py-2 text-left">アイテム名</th>
                        <th className="px-2 py-2 text-center w-16">事業部</th>
                        <th className="px-2 py-2 text-center w-24">ステータス</th>
                        <th className="px-2 py-2 text-center w-16">必要部数</th>
                        <th className="px-2 py-2 text-center w-24">印刷会社</th>
                        <th className="px-2 py-2 text-center w-24">デザイナー</th>
                        <th className="px-2 py-2 text-center w-20">金額</th>
                        <th className="px-2 py-2 text-center w-28">納品予定日</th>
                        <th className="px-2 py-2 text-center w-28">備考</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeSetupData.items.map((si, idx) => {
                        const item = items.find(i => i.id === si.item_id);
                        if (!item) return null;
                        const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
                        return (
                          <tr key={idx} className={`border-b border-slate-50 transition ${si.completed ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                            <td className="px-2 py-1.5 text-center">
                              <input type="checkbox" checked={si.completed} onChange={e => updateSetupItem(idx, 'completed', e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                                  {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-contain" /> : <Icon name="image" size={10} className="text-slate-300 m-auto mt-1.5" />}
                                </div>
                                <span className={`font-bold text-slate-800 truncate ${si.completed ? 'line-through text-slate-400' : ''}`}>{item.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${gc.bg} ${gc.text}`}>{item.genre}</span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <select value={si.status} onChange={e => updateSetupItem(idx, 'status', e.target.value)} className={`rounded-lg px-1.5 py-1 text-[10px] font-bold border-0 cursor-pointer ${SETUP_STATUS_COLORS[si.status]}`}>
                                {Object.entries(SETUP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" value={si.quantity} onChange={e => updateSetupItem(idx, 'quantity', e.target.value)} placeholder="—" className="w-full text-center glass-input rounded-lg px-1 py-1 text-xs" min="0" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="text" value={si.supplier} onChange={e => updateSetupItem(idx, 'supplier', e.target.value)} placeholder="—" className="w-full glass-input rounded-lg px-1.5 py-1 text-xs" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="text" value={si.designer} onChange={e => updateSetupItem(idx, 'designer', e.target.value)} placeholder="—" className="w-full glass-input rounded-lg px-1.5 py-1 text-xs" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" value={si.cost} onChange={e => updateSetupItem(idx, 'cost', e.target.value)} placeholder="—" className="w-full text-center glass-input rounded-lg px-1 py-1 text-xs" min="0" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="date" value={si.delivery_date} onChange={e => updateSetupItem(idx, 'delivery_date', e.target.value)} className="w-full glass-input rounded-lg px-1 py-1 text-xs" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="text" value={si.notes} onChange={e => updateSetupItem(idx, 'notes', e.target.value)} placeholder="—" className="w-full glass-input rounded-lg px-1.5 py-1 text-xs" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* フッター */}
              <div className="flex gap-2">
                <button onClick={() => setShowStoreSetupModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">閉じる</button>
                <button onClick={saveStoreSetup} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md flex items-center justify-center gap-1.5">
                  <Icon name="save" size={14} /> 保存
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Detail Modal */}
      {detailItem && (() => {
        const di = detailItem;
        const dgc = GENRE_COLORS[di.genre] || GENRE_COLORS['新築'];
        const dal = alertLevel(di.stock, di.last_reprint_qty);
        const dReprints = getReprints(di.id);
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailItem(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 animate-modal max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${dgc.bg} ${dgc.text}`}>{di.genre}</span>
                  <span className="text-xs text-slate-400">{GROUP_ICONS[di.group] || '📋'} {di.group}</span>
                  {dal !== 'none' && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dal === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{dal === 'critical' ? '在庫僅少' : '在庫注意'}</span>}
                </div>
                <button onClick={() => setDetailItem(null)} className="p-2 text-slate-400 hover:text-slate-600 flex-shrink-0"><Icon name="x" size={20} /></button>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-4">{di.name}</h2>

              <div className="flex gap-5 mb-5">
                {di.image_url && (
                  <div className="w-48 min-h-[240px] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                    <img src={di.image_url} alt={di.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-600 flex items-center gap-1.5 mb-2"><Icon name="info" size={14} /> 基本情報</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">サイズ</span>
                      <span className="text-sm font-bold text-slate-800 truncate block">{di.size || '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">紙の種類</span>
                      <span className="text-sm font-bold text-slate-800 truncate block">{di.paper_type || '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">前回増刷時期</span>
                      <span className="text-sm font-bold text-slate-800 block">{dReprints.length > 0 ? formatYearMonth(dReprints[0].reprint_date) : (di.last_reprint_date ? formatYearMonth(di.last_reprint_date) : '—')}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">次回増刷予定時期</span>
                      <span className={`text-sm font-bold whitespace-nowrap block ${di.next_reprint_date ? (daysUntil(di.next_reprint_date) < 0 ? 'text-red-600' : daysUntil(di.next_reprint_date) <= 30 ? 'text-amber-600' : 'text-slate-800') : 'text-slate-400'}`}>{di.next_reprint_date ? formatYearMonth(di.next_reprint_date) : '未設定'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">データ格納先</span>
                      {di.data_url ? <a href={di.data_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 mt-0.5"><Icon name="external-link" size={10} /> リンク</a> : <span className="text-sm text-slate-400">未登録</span>}
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden">
                      <span className="text-slate-400 block whitespace-nowrap">吉田スタジオ在庫数</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button onClick={(e) => { e.stopPropagation(); setDetailItem(prev => prev ? { ...prev, stock: Math.max(0, (Number(prev.stock) || 0) - 1) } : prev); }} className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition text-xs">−</button>
                        <input type="number" value={di.stock ?? ''} onClick={e => e.stopPropagation()} onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setDetailItem(prev => prev ? { ...prev, stock: v } : prev); }} className="w-12 text-center font-bold text-sm text-slate-800 bg-white border border-slate-200 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min="0" />
                        <button onClick={(e) => { e.stopPropagation(); setDetailItem(prev => prev ? { ...prev, stock: (Number(prev.stock) || 0) + 1 } : prev); }} className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition text-xs">+</button>
                        <div className="flex-1" />
                        <button onClick={async (e) => { e.stopPropagation(); const v = Number(di.stock) || 0; try { await updateDoc(doc(db, 'catalog_items', di.id), { stock: v, updated_at: new Date().toISOString() }); } catch(_){} setItems(prev => prev.map(i => i.id === di.id ? { ...i, stock: v } : i)); showToast('在庫数を保存しました'); }} className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-bold transition">保存</button>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100 overflow-hidden col-span-2">
                      <span className="text-slate-400 block">備考</span>
                      <span className="text-slate-600 text-xs">{di.notes || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Icon name="history" size={14} /> 増刷履歴</h3>
                  {!showInlineReprintForm && (
                    <button onClick={() => { setInlineReprintEditId(null); setInlineReprintForm(EMPTY_REPRINT); setShowInlineReprintForm(true); }} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold hover:bg-indigo-100 transition flex items-center gap-1 border border-indigo-200"><Icon name="plus" size={12} /> 追加</button>
                  )}
                </div>

                {showInlineReprintForm && (
                  <div className="bg-indigo-50 rounded-xl p-4 mb-3 border border-indigo-200 animate-enter">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Icon name={inlineReprintEditId ? 'square-pen' : 'plus'} size={12} /> {inlineReprintEditId ? '増刷記録を編集' : '増刷記録を追加'}</h4>
                      <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-[10px] font-bold cursor-pointer hover:bg-indigo-50 transition">
                        <Icon name="file-text" size={10} /> 見積PDF読込
                        <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            showToast('PDF解析中...');
                            const data = await extractFromPdf(file);
                            setInlineReprintForm(f => ({
                              ...f,
                              ...(data.reprint_date && { reprint_date: data.reprint_date }),
                              ...(data.cost && { cost: data.cost }),
                              ...(data.quantity && { quantity: data.quantity }),
                              ...(data.supplier && { supplier: data.supplier }),
                            }));
                            showToast('PDFから情報を読み取りました');
                          } catch (err) {
                            console.error(err);
                            showToast('PDF解析に失敗しました');
                          }
                          e.target.value = '';
                        }} />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">増刷日 *</label>
                        <input type="date" value={inlineReprintForm.reprint_date} onChange={e => setInlineReprintForm(f => ({ ...f, reprint_date: e.target.value }))} className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">金額（円）</label>
                        <input type="number" value={inlineReprintForm.cost} onChange={e => setInlineReprintForm(f => ({ ...f, cost: e.target.value }))} placeholder="150000" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" min="0" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">部数</label>
                        <input type="number" value={inlineReprintForm.quantity} onChange={e => setInlineReprintForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1000" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" min="0" />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">納品先（複数選択可）</label>
                      <div className="grid grid-cols-3 gap-1 bg-white rounded-lg p-2 border border-slate-200 ">
                        {LOCATIONS.map(l => {
                          const selected = (inlineReprintForm.delivery_to || '').split(', ').filter(Boolean);
                          return (
                            <label key={l} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 rounded px-1.5 py-1 transition">
                              <input type="checkbox" checked={selected.includes(l)} onChange={e => {
                                const newList = e.target.checked ? [...selected, l] : selected.filter(x => x !== l);
                                setInlineReprintForm(f => ({ ...f, delivery_to: newList.join(', ') }));
                              }} className="w-3 h-3 rounded accent-indigo-500" />
                              <span className="text-[10px] text-slate-700">{l}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">印刷会社</label>
                        <input type="text" value={inlineReprintForm.supplier || ''} onChange={e => setInlineReprintForm(f => ({ ...f, supplier: e.target.value }))} placeholder="例: 〇〇印刷" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">デザイナー</label>
                        <input type="text" value={inlineReprintForm.designer || ''} onChange={e => setInlineReprintForm(f => ({ ...f, designer: e.target.value }))} placeholder="例: 田中デザイン事務所" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">備考</label>
                        <input type="text" value={inlineReprintForm.notes} onChange={e => setInlineReprintForm(f => ({ ...f, notes: e.target.value }))} placeholder="例: デザイン変更" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowInlineReprintForm(false); setInlineReprintEditId(null); }} className="flex-1 border border-slate-200 rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:bg-white transition">キャンセル</button>
                      <button onClick={async () => {
                        if (!inlineReprintForm.reprint_date) return;
                        const payload = { catalog_item_id: di.id, reprint_date: inlineReprintForm.reprint_date, cost: Number(inlineReprintForm.cost) || 0, quantity: Number(inlineReprintForm.quantity) || 0, file_url: inlineReprintForm.file_url, file_name: inlineReprintForm.file_name, notes: inlineReprintForm.notes, delivery_to: inlineReprintForm.delivery_to || '', supplier: inlineReprintForm.supplier || '', designer: inlineReprintForm.designer || '' };
                        try {
                          if (inlineReprintEditId) {
                            await updateDoc(doc(db, 'catalog_reprints', inlineReprintEditId), payload);
                            showToast('増刷記録を更新しました');
                          } else {
                            payload.created_at = new Date().toISOString();
                            await addDoc(collection(db, 'catalog_reprints'), payload);
                            showToast('増刷記録を追加しました');
                          }
                        } catch (_) {}
                        setShowInlineReprintForm(false);
                        setInlineReprintForm(EMPTY_REPRINT);
                        setInlineReprintEditId(null);
                      }} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition">保存</button>
                    </div>
                  </div>
                )}

                {dReprints.length === 0 && !showInlineReprintForm ? (
                  <p className="text-slate-400 text-sm py-6 text-center">増刷履歴がありません</p>
                ) : (
                  <div className="space-y-2">
                    {dReprints.map(r => (
                      <div key={r.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <span className="text-slate-400 block mb-0.5">増刷日</span>
                            <span className="font-bold text-slate-800">{formatDate(r.reprint_date)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">金額（円）</span>
                            <span className="font-bold text-slate-800">{formatCost(r.cost)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">部数</span>
                            <span className="font-bold text-slate-800">{r.quantity > 0 ? Number(r.quantity).toLocaleString() : '—'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <span className="text-slate-400 block mb-0.5">納品先</span>
                            <span className="font-bold text-slate-700">{r.delivery_to || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">印刷会社</span>
                            <span className="font-bold text-slate-700">{r.supplier || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">デザイナー</span>
                            <span className="font-bold text-slate-700">{r.designer || '—'}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="text-slate-400 block mb-0.5">備考</span>
                              <span className="text-slate-600">{r.notes || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setInlineReprintEditId(r.id); setInlineReprintForm({ reprint_date: r.reprint_date || '', cost: r.cost || '', quantity: r.quantity || '', file_url: r.file_url || '', file_name: r.file_name || '', notes: r.notes || '', delivery_to: r.delivery_to || '', supplier: r.supplier || '', designer: r.designer || '' }); setShowInlineReprintForm(true); }} className="p-1 text-slate-400 hover:text-indigo-500 transition"><Icon name="square-pen" size={14} /></button>
                              <button onClick={() => deleteReprint(r.id)} className="p-1 text-slate-400 hover:text-red-500 transition"><Icon name="trash-2" size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => { setDetailItem(null); openEditItem(di); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"><Icon name="square-pen" size={14} /> 編集</button>
                <button onClick={() => { setDetailItem(null); deleteItem(di.id); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"><Icon name="trash-2" size={14} /> 削除</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
