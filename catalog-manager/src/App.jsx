import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './components/Icon';
import FileUpload from './components/FileUpload';
import { db, storage, GENRES, GENRE_COLORS, GROUPS } from './config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { makeDemoImage } from './demoImage';

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
  name: '', genre: '新築', group: 'パンフレット', stock: '', next_reprint_date: '',
  last_reprint_qty: '', last_reprint_cost: '', last_reprint_date: '',
  data_url: '', delivery_to: '', notes: '', image_url: '',
  size: '', paper_type: '', supplier: '',
};
const SIZES = ['A3', 'A4', 'A5', 'A6', 'B4', 'B5', 'B6', '長3封筒', '角2封筒', '名刺サイズ', 'ハガキ', 'その他'];
const PAPER_TYPES = ['コート紙', 'マットコート紙', '上質紙', 'アート紙', 'ケント紙', 'クラフト紙', '再生紙', '特殊紙', 'その他'];
const EMPTY_REPRINT = { reprint_date: '', cost: '', quantity: '', file_url: '', file_name: '', notes: '', delivery_to: '', supplier: '' };
const EMPTY_REQUEST = { quantity: '', department: '', locations: [], urgency: 'normal', notes: '', requester_name: '' };
const URGENCY_LABELS = { urgent: '至急', normal: '通常', low: '急ぎなし' };
const URGENCY_COLORS = { urgent: 'bg-red-100 text-red-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-slate-100 text-slate-600' };
const REQUEST_STATUS_LABELS = { pending: '申請中', approved: '承認済', ordered: '発注済', delivered: '納品済', rejected: '却下' };
const REQUEST_STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', ordered: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };
const LOCATIONS = ['本社', '吉田スタジオ', '長野支店', '松本支店', '上田支店(グランミュゼ)', '伊那支店(グラン・メティス)', 'グラン・ニュクス', 'グラン・シフ', '紬', '飯田支店'];
const GROUP_ICONS = { 'パンフレット': '📖', 'カタログ': '📚', 'チラシ': '📄', '封筒': '✉️', 'ファイル': '📁', '紙類': '📃' };

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
  const [chatworkForm, setChatworkForm] = useState({ chatwork_room_id: '', chatwork_api_token: '', chatwork_notify_days_before: '7', chatwork_notify_enabled: 'true' });
  const [newPassword, setNewPassword] = useState('');
  const imageInputRef = useRef(null);

  // ─── 増刷リクエスト ───
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequestListModal, setShowRequestListModal] = useState(false);
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST);
  const [requestTargetItem, setRequestTargetItem] = useState(null);
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
      setChatworkForm({
        chatwork_room_id: obj.chatwork_room_id || '',
        chatwork_api_token: obj.chatwork_api_token || '',
        chatwork_notify_days_before: obj.chatwork_notify_days_before || '7',
        chatwork_notify_enabled: obj.chatwork_notify_enabled || 'true',
      });
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
    return () => { unsubItems(); unsubReprints(); };
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
    setReprintForm({ reprint_date: reprint.reprint_date || '', cost: reprint.cost || '', quantity: reprint.quantity || '', file_url: reprint.file_url || '', file_name: reprint.file_name || '', notes: reprint.notes || '' });
    setShowReprintModal(true);
  };
  const saveReprint = async (e) => {
    e.preventDefault();
    if (!reprintForm.reprint_date) return;
    const payload = { catalog_item_id: reprintTargetItemId, reprint_date: reprintForm.reprint_date, cost: Number(reprintForm.cost) || 0, quantity: Number(reprintForm.quantity) || 0, file_url: reprintForm.file_url, file_name: reprintForm.file_name, notes: reprintForm.notes };
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
      for (const [key, value] of Object.entries(chatworkForm)) {
        await setDoc(doc(db, 'catalog_settings', key), { value, updated_at: new Date().toISOString() });
      }
      if (newPassword.trim()) {
        await setDoc(doc(db, 'catalog_settings', 'app_password'), { value: newPassword.trim(), updated_at: new Date().toISOString() });
        setNewPassword('');
      }
    } catch (_) {}
    showToast('設定を保存しました');
    setShowSettings(false);
    loadSettings();
  };

  // ─── Chatwork通知 ───
  const sendChatworkNotify = async (item) => {
    const roomId = settings.chatwork_room_id;
    const apiToken = settings.chatwork_api_token;
    if (!roomId || !apiToken) { alert('設定画面でチャットワークのAPIトークンとルームIDを設定してください'); return; }
    const message = `[info][title]カタログ増刷リマインド[/title]商品名: ${item.name}\n事業部: ${item.genre}\nグループ: ${item.group || '—'}\n在庫数: ${item.stock ?? '—'}\n次回増刷予定日: ${formatDate(item.next_reprint_date)}\n前回増刷金額: ${formatCost(item.last_reprint_cost)}\n備考: ${item.notes || 'なし'}[/info]`;
    try {
      const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'X-ChatWorkToken': apiToken, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `body=${encodeURIComponent(message)}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('チャットワークに通知しました');
    } catch (err) {
      alert('通知送信に失敗しました: ' + err.message);
    }
  };

  // ─── 増刷リクエスト ───
  const openRequestModal = (item) => {
    setRequestTargetItem(item);
    setRequestForm({ ...EMPTY_REQUEST, department: item.genre, quantity: String(item.last_reprint_qty || '') });
    setShowRequestModal(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.quantity || !requestTargetItem) return;
    const newReq = {
      id: crypto.randomUUID(),
      catalog_item_id: requestTargetItem.id,
      item_name: requestTargetItem.name,
      item_genre: requestTargetItem.genre,
      item_group: requestTargetItem.group,
      quantity: Number(requestForm.quantity),
      department: requestForm.department,
      locations: requestForm.locations || [],
      location: (requestForm.locations || []).join(', '),
      urgency: requestForm.urgency,
      notes: requestForm.notes,
      requester_name: requestForm.requester_name,
      status: 'pending',
      requested_at: new Date().toISOString(),
      requested_by: requestForm.requester_name || '—',
    };

    // ローカルstate保存
    setRequests(prev => [newReq, ...prev]);

    // Firebase保存
    try {
      await addDoc(collection(db, 'catalog_requests'), newReq);
    } catch (_) {}

    // Chatwork通知
    const roomId = settings.chatwork_room_id;
    const apiToken = settings.chatwork_api_token;
    if (roomId) {
      const message = `[info][title]増刷リクエスト[/title]` +
        `商品名: ${requestTargetItem.name}\n` +
        `事業部: ${requestTargetItem.genre}\n` +
        `グループ: ${requestTargetItem.group || '—'}\n` +
        `現在の在庫: ${requestTargetItem.stock ?? '—'}\n` +
        `リクエスト部数: ${Number(requestForm.quantity).toLocaleString()}部\n` +
        `依頼部署: ${requestForm.department}\n` +
        `担当者: ${requestForm.requester_name || '未入力'}\n` +
        `納品先拠点: ${(requestForm.locations || []).length > 0 ? (requestForm.locations || []).join(', ') : '未指定'}\n` +
        (requestForm.notes ? `備考: ${requestForm.notes}\n` : '') +
        `申請日時: ${new Date().toLocaleString('ja-JP')}[/info]`;

      try {
        const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: { 'X-ChatWorkToken': apiToken, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `body=${encodeURIComponent(message)}`,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('増刷リクエストを送信し、チャットワークに通知しました');
      } catch (err) {
        showToast('増刷リクエストを送信しました（チャットワーク通知は設定を確認してください）');
      }
    } else {
      showToast('増刷リクエストを送信しました');
    }
    setShowRequestModal(false);
  };

  const updateRequestStatus = async (id, status) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r));
    try {
      await updateDoc(doc(db, 'catalog_requests', id), { status, updated_at: new Date().toISOString() });
    } catch (_) {}
    showToast(`ステータスを「${REQUEST_STATUS_LABELS[status]}」に変更しました`);
  };

  const pendingRequestCount = requests.filter(r => r.status === 'pending').length;

  // ─── ログイン画面 ───
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-100">
        <form onSubmit={handleLogin} className="glass-strong rounded-2xl p-8 w-full max-w-sm animate-modal">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Icon name="book-open" size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">カタログ管理</h1>
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
              <h1 className="text-lg font-bold text-slate-800">カタログ管理</h1>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{filteredItems.length}件</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowManual(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="使い方">
                <Icon name="book-open" size={14} /> 使い方
              </button>
              <button onClick={() => setShowFaq(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="FAQ">
                <Icon name="help-circle" size={14} /> FAQ
              </button>
              <button onClick={() => setShowRequestListModal(true)} className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition text-xs font-bold" title="増刷リクエスト一覧">
                <Icon name="inbox" size={14} /> 増刷リクエスト
                {pendingRequestCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">{pendingRequestCount}</span>
                )}
              </button>
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition text-xs font-bold" title="設定">
                <Icon name="settings" size={14} /> 設定
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {genreSummary.map(({ genre, count }) => {
            const c = GENRE_COLORS[genre];
            return (
              <div key={genre} className="bg-white rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition border border-slate-100" onClick={() => setSelectedSummaryGenre(selectedSummaryGenre === genre ? '' : genre)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className="text-sm font-bold text-slate-700">{genre}</span>
                  </div>
                  <span className="flex items-center gap-1"><span className="text-[10px] text-slate-400">アイテム数</span><span className="text-lg font-bold text-slate-800">{count}<span className="text-xs text-slate-400 ml-0.5">件</span></span></span>
                </div>
              </div>
            );
          })}
        </div>

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
              const al = alertLevel(item.stock, item.last_reprint_qty);
              return (
                <div key={item.id} className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition group cursor-pointer ${gc.border}`} onClick={() => setDetailItem(item)}>
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
                    {/* アラートバッジ */}
                    {al !== 'none' && (
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm text-[9px] font-bold text-white ${al === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}>
                        <Icon name="alert-triangle" size={10} className="text-white" />
                        {al === 'critical' ? '在庫僅少' : '在庫注意'}
                      </span>
                    )}
                    {/* ホバー時のアクションボタン */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end justify-center opacity-0 group-hover:opacity-100 pb-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditItem(item)} className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-amber-600 shadow transition" title="編集"><Icon name="square-pen" size={14} /></button>
                        <button onClick={() => openRequestModal(item)} className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-emerald-600 shadow transition" title="増刷リクエスト"><Icon name="shopping-cart" size={14} /></button>
                        <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-red-600 shadow transition" title="削除"><Icon name="trash-2" size={14} /></button>
                      </div>
                    </div>
                  </div>
                  {/* 情報 */}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-slate-800 truncate mb-1.5">{item.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {item.group && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.group}</span>}
                      {item.size && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.size}</span>}
                      {item.paper_type && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.paper_type}</span>}
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] text-slate-400 leading-none">吉スタ在庫</span>
                        <span className={`text-sm font-bold leading-none ${al === 'critical' ? 'text-red-600' : al === 'warning' ? 'text-amber-600' : 'text-slate-700'}`}>{item.stock ?? '—'}</span>
                      </div>
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
                  <th className="w-14 px-1 py-2 text-center whitespace-nowrap">アラート</th>
                  <th className="w-12 px-1 py-2 text-center">画像</th>
                  <th className="text-center px-1 py-2">商品名</th>
                  <th className="text-center px-1 py-2 w-20">事業部</th>
                  <th className="text-center px-1 py-2 w-20">グループ</th>
                  <th className="text-center px-1 py-2 w-10">サイズ</th>
                  <th className="text-center px-1 py-2 w-16">紙種</th>
                  <th className="text-center px-1 py-2 w-20">吉スタ在庫</th>
                  <th className="text-center px-1 py-2 w-20">前回増刷</th>
                  <th className="text-center px-1 py-2 w-24">次回増刷予定</th>
                  <th className="text-center px-1 py-2 w-36">操作</th>
                </tr>
              </thead>
              <tbody>
            {filteredItems.map(item => {
              const gc = GENRE_COLORS[item.genre] || GENRE_COLORS['新築'];
              const al = alertLevel(item.stock, item.last_reprint_qty);

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={`animate-enter cursor-pointer transition border-b border-slate-100 ${al === 'critical' ? 'bg-red-50' : al === 'warning' ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                    onClick={() => setDetailItem(item)}
                  >
                    <td className="px-1 py-2 text-center">
                      {al !== 'none' ? (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap ${al === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}>
                          <Icon name="alert-triangle" size={9} /> {al === 'critical' ? '僅少' : '注意'}
                        </span>
                      ) : <span className="text-[9px] text-slate-300">—</span>}
                    </td>
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
                    <td className="px-1 py-2 text-center">
                      <span className={`font-bold text-xs ${al === 'critical' ? 'text-red-600' : al === 'warning' ? 'text-amber-600' : 'text-slate-800'}`}>{item.stock ?? '—'}</span>
                    </td>
                    <td className="px-1 py-2 text-center text-[11px] text-slate-500 whitespace-nowrap">{formatYearMonth(item.last_reprint_date)}</td>
                    <td className="px-1 py-2 text-center whitespace-nowrap">
                      {item.next_reprint_date ? (
                        <span className="text-[11px] font-bold text-slate-600">
                          {formatYearMonth(item.next_reprint_date)}
                        </span>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                    <td className="px-1 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => openEditItem(item)} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition" title="編集"><Icon name="square-pen" size={10} /> 編集</button>
                        <button onClick={() => openRequestModal(item)} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition" title="増刷"><Icon name="shopping-cart" size={10} /> 増刷</button>
                        <button onClick={() => deleteItem(item.id)} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition" title="削除"><Icon name="trash-2" size={10} /> 削除</button>
                      </div>
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
          <form onSubmit={saveItem} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 animate-modal max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editingItemId ? 'カタログ編集' : 'カタログ新規登録'}</h2>
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
                  <label className="text-xs font-bold text-slate-500 block mb-2">事業部 *</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {GENRES.map(g => {
                      const c = GENRE_COLORS[g];
                      return (
                        <button key={g} type="button" onClick={() => setItemForm(f => ({ ...f, genre: g }))} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${itemForm.genre === g ? `${c.bg} ${c.text} ${c.border}` : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>{g}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-2">グループ</label>
                  <select value={itemForm.group} onChange={e => setItemForm(f => ({ ...f, group: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5">
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
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
                  <label className="text-xs font-bold text-slate-500 block mb-1">在庫数</label>
                  <input type="number" value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} placeholder="例: 250" className="glass-input w-full rounded-xl px-4 py-2.5" min="0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">次回増刷予定</label>
                  <input type="month" value={(itemForm.next_reprint_date || '').slice(0, 7)} onChange={e => setItemForm(f => ({ ...f, next_reprint_date: e.target.value ? e.target.value + '-01' : '' }))} className="glass-input w-full rounded-xl px-4 py-2.5" />
                </div>
              </div>

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
                  <label className="text-xs font-bold text-slate-500 block mb-1">発注先</label>
                  <input type="text" value={itemForm.supplier} onChange={e => setItemForm(f => ({ ...f, supplier: e.target.value }))} placeholder="例: 〇〇印刷" className="glass-input w-full rounded-xl px-4 py-2.5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">データ格納先URL</label>
                  <input type="url" value={itemForm.data_url} onChange={e => setItemForm(f => ({ ...f, data_url: e.target.value }))} placeholder="https://..." className="glass-input w-full rounded-xl px-4 py-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">納品先（複数選択可）</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-200 ">
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

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">備考</label>
                <textarea value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="glass-input w-full rounded-xl px-4 py-2.5 resize-none" />
              </div>
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
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editingReprintId ? '増刷記録編集' : '増刷記録追加'}</h2>
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
          <form onSubmit={saveSettings} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-modal max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><Icon name="settings" size={20} className="text-indigo-500" /> 設定</h2>
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><Icon name="message-square" size={16} className="text-blue-500" /> チャットワーク通知</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">APIトークン</label>
                    <input type="password" value={chatworkForm.chatwork_api_token} onChange={e => setChatworkForm(f => ({ ...f, chatwork_api_token: e.target.value }))} placeholder="Chatwork API Token" className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
                    <p className="text-[10px] text-slate-400 mt-1">Chatwork &gt; 環境設定 &gt; API から取得</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">ルームID</label>
                    <input type="text" value={chatworkForm.chatwork_room_id} onChange={e => setChatworkForm(f => ({ ...f, chatwork_room_id: e.target.value }))} placeholder="例: 123456789" className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">何日前に通知</label>
                    <input type="number" value={chatworkForm.chatwork_notify_days_before} onChange={e => setChatworkForm(f => ({ ...f, chatwork_notify_days_before: e.target.value }))} min="1" max="90" className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={chatworkForm.chatwork_notify_enabled === 'true'} onChange={e => setChatworkForm(f => ({ ...f, chatwork_notify_enabled: e.target.checked ? 'true' : 'false' }))} className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-sm font-bold text-slate-600">自動通知を有効にする</span>
                  </label>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2"><Icon name="lock" size={16} className="text-slate-400" /> パスワード変更</h3>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新しいパスワード（変更する場合のみ）" className="glass-input w-full rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md">保存</button>
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
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex bg-slate-200 rounded p-0.5">
                      <div className="bg-white rounded px-2 py-0.5 text-[9px] font-bold text-indigo-600 flex items-center gap-1"><Icon name="image" size={8} /> ギャラリー</div>
                      <div className="px-2 py-0.5 text-[9px] text-slate-400 flex items-center gap-1"><Icon name="list" size={8} /> リスト</div>
                    </div>
                    <span className="text-[9px] text-slate-400">← この切替ボタンで表示を変更</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1,2,3,4].map(i => <div key={i} className="bg-white rounded border border-slate-200 p-1.5 text-center"><div className="bg-slate-100 rounded h-8 mb-1 flex items-center justify-center"><Icon name="image" size={10} className="text-slate-300" /></div><div className="text-[7px] text-slate-400">アイテム{i}</div></div>)}
                  </div>
                </div>
                <p>ヘッダー右上の切替ボタンで、ギャラリー（カード形式）とリスト（テーブル形式）を切り替えられます。各アイテムをクリックすると詳細画面が表示されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="plus" size={14} className="text-indigo-500" /> カタログの新規登録</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-indigo-500 text-white rounded px-2 py-0.5 text-[9px] font-bold flex items-center gap-1"><Icon name="plus" size={8} /> 新規登録</div>
                    <span className="text-[9px] text-slate-400">← 右上のボタンをクリック</span>
                  </div>
                  <div className="bg-white rounded border border-slate-200 p-2 space-y-1">
                    {['商品名 *', '事業部・グループ', 'サイズ・紙の種類', '在庫数・次回増刷予定', 'ビジュアル画像', '納品先（複数選択可）'].map(l => <div key={l} className="flex items-center gap-1"><div className="w-20 text-[7px] text-slate-400">{l}</div><div className="flex-1 h-3 bg-slate-100 rounded" /></div>)}
                  </div>
                </div>
                <p>右上の「新規登録」ボタンからカタログを登録できます。商品名・事業部・グループ・サイズ・紙の種類・在庫数・ビジュアル画像・データ格納先URL・納品先などを入力します。前回増刷情報を入力すると増刷履歴にも自動登録されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="square-pen" size={14} className="text-amber-500" /> カタログの編集・削除</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-600"><Icon name="square-pen" size={8} /> 編集</div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-600"><Icon name="shopping-cart" size={8} /> 増刷</div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-[9px] font-bold text-red-600"><Icon name="trash-2" size={8} /> 削除</div>
                    <span className="text-[9px] text-slate-400">← 詳細画面下部またはリスト操作列</span>
                  </div>
                </div>
                <p>各アイテムの詳細画面下部、またはリスト表示の操作列から編集・削除ができます。ギャラリー表示ではホバー時にもボタンが表示されます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="history" size={14} className="text-indigo-500" /> 増刷履歴の管理</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1"><Icon name="history" size={8} /> 増刷履歴</span>
                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 font-bold flex items-center gap-0.5"><Icon name="plus" size={7} /> 追加</span>
                  </div>
                  <div className="space-y-1">
                    <div className="bg-white rounded border border-slate-200 p-1.5 grid grid-cols-3 gap-1 text-[7px]">
                      <div><span className="text-slate-400">増刷日</span><br /><span className="font-bold">2025/04/01</span></div>
                      <div><span className="text-slate-400">金額</span><br /><span className="font-bold">¥150,000</span></div>
                      <div><span className="text-slate-400">部数</span><br /><span className="font-bold">1,000</span></div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-400 mt-1.5">※ 「追加」ボタンで同じ画面内にフォームが展開されます</div>
                </div>
                <p>各アイテムの詳細画面で増刷履歴の追加・編集・削除ができます。増刷日・金額・部数・納品先・備考を記録でき、新しい順に表示されます。追加・編集は同じ画面内で操作可能です。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="shopping-cart" size={14} className="text-emerald-500" /> 増刷リクエスト</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="bg-white rounded border border-slate-200 p-2 space-y-1.5">
                    <div className="text-[8px] font-bold text-slate-700 flex items-center gap-1"><div className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center"><Icon name="shopping-cart" size={8} className="text-emerald-600" /></div> 増刷リクエスト</div>
                    <div className="grid grid-cols-2 gap-1">
                      {['リクエスト部数', '依頼部署', '担当者名', '納品先拠点'].map(l => <div key={l} className="text-[7px]"><span className="text-slate-400">{l}</span><div className="h-3 bg-slate-100 rounded mt-0.5" /></div>)}
                    </div>
                    <div className="text-[7px] text-slate-400">備考・理由</div>
                    <div className="h-3 bg-slate-100 rounded" />
                  </div>
                  <div className="text-[8px] text-slate-400 mt-1.5">※ Chatwork連携設定時は送信と同時に自動通知されます</div>
                </div>
                <p>在庫が少なくなったアイテムの増刷を依頼できます。リクエスト部数・依頼部署・担当者名・納品先拠点を入力して送信します。ヘッダーの「増刷リクエスト」から一覧・ステータス管理ができます。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="bar-chart-2" size={14} className="text-indigo-500" /> 事業部別サマリー</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {['新築', 'リフォーム', '不動産', 'ソリューション', '共通'].map((g, i) => <div key={g} className="bg-white rounded border border-slate-200 px-1.5 py-1 text-center text-[7px]"><span className="text-slate-500">{g}</span><br /><span className="font-bold text-slate-800">{3}件</span></div>)}
                  </div>
                  <div className="text-[8px] text-slate-400 flex items-center gap-1"><Icon name="mouse-pointer" size={8} /> クリックすると期別増刷金額が表示されます</div>
                  <div className="bg-white rounded border border-slate-200 p-1.5 mt-1 space-y-1">
                    <div className="flex justify-between text-[8px]"><span className="font-bold">26S <span className="text-slate-400 font-normal">2025年9月〜2026年8月</span></span><span className="font-bold text-indigo-600">¥450,000</span></div>
                    <div className="flex justify-between text-[8px]"><span className="font-bold">25S <span className="text-slate-400 font-normal">2024年9月〜2025年8月</span></span><span className="font-bold text-indigo-600">¥380,000</span></div>
                  </div>
                </div>
                <p>画面上部の事業部カードをクリックすると、期別（9月〜翌年8月）の合計増刷金額をポップアップで確認できます。期の表記は「26S」=2025年9月〜2026年8月です。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="filter" size={14} className="text-indigo-500" /> フィルター・検索・並び替え</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <div className="bg-slate-800 text-white rounded px-1.5 py-0.5 text-[8px] font-bold">すべて</div>
                    <div className="text-slate-400 rounded px-1.5 py-0.5 text-[8px]">新築</div>
                    <div className="text-slate-400 rounded px-1.5 py-0.5 text-[8px]">リフォーム</div>
                    <span className="text-slate-200 mx-0.5">|</span>
                    <div className="border border-slate-200 rounded px-1.5 py-0.5 text-[8px] text-slate-400">グループ ▾</div>
                    <span className="text-slate-200 mx-0.5">|</span>
                    <div className="flex gap-0.5">
                      {['登録順', 'アイテム名', '増刷金額', '在庫数'].map(s => <span key={s} className="text-[7px] text-slate-400 px-1 py-0.5 rounded hover:bg-slate-100">{s}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="search" size={8} className="text-slate-400" />
                    <div className="flex-1 h-4 bg-white border border-slate-200 rounded text-[7px] text-slate-300 px-1 flex items-center">商品名や納品先で検索...</div>
                  </div>
                </div>
                <p>ヘッダーの事業部タブ・グループ選択でフィルタリング、検索ボックスで商品名・備考・納品先を横断検索できます。並び替えボタンで登録順・アイテム名・増刷年月・増刷金額・在庫数の昇順/降順ソートが可能です。1回クリックで昇順、もう1回で降順、さらにクリックで解除です。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="alert-triangle" size={14} className="text-amber-500" /> 在庫アラート</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white bg-amber-500"><Icon name="alert-triangle" size={7} /> 在庫注意</span><span className="text-[8px] text-slate-400">在庫 ≤ 20%</span></div>
                    <div className="flex items-center gap-1"><span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white bg-red-500"><Icon name="alert-triangle" size={7} /> 在庫僅少</span><span className="text-[8px] text-slate-400">在庫 ≤ 10%</span></div>
                  </div>
                  <div className="text-[8px] text-slate-400 mt-1.5">※ 前回増刷部数に対する在庫数の割合で判定されます</div>
                </div>
                <p>在庫数が前回増刷部数の20%以下になると「在庫注意」（オレンジ）、10%以下で「在庫僅少」（赤）のバッジがギャラリー・リスト両方に表示されます。前回増刷部数が未登録の場合はアラートは表示されません。</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Icon name="settings" size={14} className="text-slate-500" /> 設定</h3>
                <div className="bg-slate-50 rounded-xl p-3 mb-2 border border-slate-200">
                  <div className="bg-white rounded border border-slate-200 p-2 space-y-1.5">
                    <div className="text-[8px] font-bold text-slate-600 flex items-center gap-1"><Icon name="message-square" size={8} className="text-blue-500" /> チャットワーク通知</div>
                    <div className="grid grid-cols-2 gap-1">
                      {['APIトークン', 'ルームID', '何日前に通知', '自動通知ON/OFF'].map(l => <div key={l} className="text-[7px]"><span className="text-slate-400">{l}</span><div className="h-3 bg-slate-100 rounded mt-0.5" /></div>)}
                    </div>
                    <div className="text-[8px] font-bold text-slate-600 flex items-center gap-1 mt-1"><Icon name="lock" size={8} className="text-slate-400" /> パスワード変更</div>
                    <div className="h-3 bg-slate-100 rounded" />
                  </div>
                </div>
                <p>ヘッダーの「設定」ボタンからChatwork連携（APIトークン・ルームID・通知日数）やパスワード変更ができます。Chatwork APIトークンは Chatwork &gt; 環境設定 &gt; API から取得できます。</p>
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
                { q: 'データはどこに保存されますか？', a: 'Supabase（クラウドデータベース）に保存されます。DB未接続の場合はブラウザのメモリに一時保存され、ページをリロードするとデータは消えます。' },
                { q: 'ログインパスワードを忘れました', a: '初期パスワードは「catalog1234」です。設定画面で変更した場合は、管理者にお問い合わせください。' },
                { q: '画像はどの形式に対応していますか？', a: 'JPG、PNG、GIF、WebPに対応しています。カタログ登録画面でクリックまたはドラッグ&ドロップでアップロードできます。' },
                { q: '在庫アラートはどのタイミングで表示されますか？', a: '在庫数が前回増刷部数の20%以下で「在庫注意」（オレンジ）、10%以下で「在庫僅少」（赤）が表示されます。前回増刷部数が未登録の場合はアラートは表示されません。' },
                { q: '増刷リクエストを送信するとどうなりますか？', a: 'リクエスト一覧に追加され、Chatwork連携が設定されている場合は指定ルームに自動通知されます。リクエスト一覧で承認→発注済→納品済とステータスを管理できます。' },
                { q: 'Chatwork通知が届きません', a: '設定画面でAPIトークンとルームIDが正しく入力されているか確認してください。APIトークンはChatworkの環境設定 > APIから取得できます。' },
                { q: '期別増刷金額の「26S」とは何ですか？', a: '「26S」は2025年9月〜2026年8月の期間を表します。9月始まり・8月終わりの年度区分です。事業部カードをクリックすると期別の合計増刷金額を確認できます。' },
                { q: 'デモデータを登録したい', a: 'カタログが0件の状態で表示される「デモデータを登録」ボタンから15件のサンプルデータを一括登録できます。' },
                { q: '納品先を複数選択できますか？', a: 'はい、カタログ登録・増刷リクエスト・増刷履歴の納品先はチェックリストから複数選択できます。' },
                { q: 'カタログを誤って削除してしまいました', a: '削除は確認ダイアログが表示されますが、一度削除すると復元できません。重要なデータは定期的にバックアップしてください。' },
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

      {/* Request Modal */}
      {showRequestModal && requestTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowRequestModal(false)}>
          <form onSubmit={submitRequest} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-modal">
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><Icon name="shopping-cart" size={16} className="text-emerald-600" /></div>
              増刷リクエスト
            </h2>
            <p className="text-sm text-slate-400 mb-5">「{requestTargetItem.name}」の増刷を依頼</p>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-slate-400 block">現在の在庫</span><span className="font-bold text-slate-700">{requestTargetItem.stock ?? '—'}</span></div>
                <div><span className="text-slate-400 block">前回増刷数</span><span className="font-bold text-slate-700">{requestTargetItem.last_reprint_qty ? Number(requestTargetItem.last_reprint_qty).toLocaleString() : '—'}</span></div>
                <div><span className="text-slate-400 block">前回金額</span><span className="font-bold text-indigo-600">{formatCost(requestTargetItem.last_reprint_cost)}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">リクエスト部数 *</label>
                <input type="number" value={requestForm.quantity} onChange={e => setRequestForm(f => ({ ...f, quantity: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" placeholder="例: 500" required min="1" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">依頼部署</label>
                  <select value={requestForm.department} onChange={e => setRequestForm(f => ({ ...f, department: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5">
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">担当者名</label>
                  <input type="text" value={requestForm.requester_name} onChange={e => setRequestForm(f => ({ ...f, requester_name: e.target.value }))} className="glass-input w-full rounded-xl px-4 py-2.5" placeholder="例: 山田太郎" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-2">納品先拠点（複数選択可）</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-200 ">
                  {LOCATIONS.map(l => (
                    <label key={l} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1.5 transition">
                      <input type="checkbox" checked={(requestForm.locations || []).includes(l)} onChange={e => {
                        const cur = requestForm.locations || [];
                        setRequestForm(f => ({ ...f, locations: e.target.checked ? [...cur, l] : cur.filter(x => x !== l) }));
                      }} className="w-3.5 h-3.5 rounded accent-indigo-500" />
                      <span className="text-xs text-slate-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">備考・理由</label>
                <textarea value={requestForm.notes} onChange={e => setRequestForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="glass-input w-full rounded-xl px-4 py-2.5 resize-none" placeholder="例: イベント用に追加が必要" />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
              <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-2.5 font-bold hover:opacity-90 transition shadow-md flex items-center justify-center gap-1.5">
                <Icon name="send" size={14} /> リクエスト送信
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Request List Modal */}
      {showRequestListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowRequestListModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 animate-modal max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Icon name="inbox" size={16} className="text-indigo-600" /></div>
                増刷リクエスト一覧
                {pendingRequestCount > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequestCount}件 申請中</span>}
              </h2>
              <button onClick={() => setShowRequestListModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={20} /></button>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Icon name="inbox" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">リクエストはまだありません</p>
                <p className="text-xs mt-1">カタログ一覧の <Icon name="shopping-cart" size={12} className="inline" /> ボタンからリクエストできます</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-bold text-slate-800">{req.item_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GENRE_COLORS[req.item_genre]?.bg || ''} ${GENRE_COLORS[req.item_genre]?.text || ''}`}>{req.item_genre}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${REQUEST_STATUS_COLORS[req.status]}`}>{REQUEST_STATUS_LABELS[req.status]}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(req.requested_at).toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                      <div><span className="text-slate-400">リクエスト部数: </span><span className="font-bold text-slate-700">{Number(req.quantity).toLocaleString()}部</span></div>
                      <div><span className="text-slate-400">依頼部署: </span><span className="font-bold text-slate-700">{req.department}</span></div>
                      <div><span className="text-slate-400">担当者: </span><span className="font-bold text-slate-700">{req.requester_name || '—'}</span></div>
                      <div><span className="text-slate-400">納品先: </span><span className="font-bold text-slate-700">{req.locations ? req.locations.join(', ') : (req.location || '未指定')}</span></div>
                    </div>
                    {req.notes && <p className="text-xs text-slate-500 mt-2 bg-white rounded-lg px-3 py-1.5 border border-slate-100">{req.notes}</p>}

                    {req.status === 'pending' && (
                      <div className="flex gap-1.5 mt-3">
                        <button onClick={() => updateRequestStatus(req.id, 'approved')} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition">承認</button>
                        <button onClick={() => updateRequestStatus(req.id, 'ordered')} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition">発注済</button>
                        <button onClick={() => updateRequestStatus(req.id, 'rejected')} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition">却下</button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <div className="flex gap-1.5 mt-3">
                        <button onClick={() => updateRequestStatus(req.id, 'ordered')} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition">発注済にする</button>
                      </div>
                    )}
                    {req.status === 'ordered' && (
                      <div className="flex gap-1.5 mt-3">
                        <button onClick={() => updateRequestStatus(req.id, 'delivered')} className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition">納品済にする</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                    <h4 className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-1"><Icon name={inlineReprintEditId ? 'square-pen' : 'plus'} size={12} /> {inlineReprintEditId ? '増刷記録を編集' : '増刷記録を追加'}</h4>
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
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">発注先</label>
                        <input type="text" value={inlineReprintForm.supplier || ''} onChange={e => setInlineReprintForm(f => ({ ...f, supplier: e.target.value }))} placeholder="例: 〇〇印刷" className="glass-input w-full rounded-lg px-2 py-1.5 text-xs" />
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
                        const payload = { catalog_item_id: di.id, reprint_date: inlineReprintForm.reprint_date, cost: Number(inlineReprintForm.cost) || 0, quantity: Number(inlineReprintForm.quantity) || 0, file_url: inlineReprintForm.file_url, file_name: inlineReprintForm.file_name, notes: inlineReprintForm.notes, delivery_to: inlineReprintForm.delivery_to || '', supplier: inlineReprintForm.supplier || '' };
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
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-slate-400 block mb-0.5">納品先</span>
                            <span className="font-bold text-slate-700">{r.delivery_to || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">発注先</span>
                            <span className="font-bold text-slate-700">{r.supplier || '—'}</span>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="text-slate-400 block mb-0.5">備考</span>
                              <span className="text-slate-600">{r.notes || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setInlineReprintEditId(r.id); setInlineReprintForm({ reprint_date: r.reprint_date || '', cost: r.cost || '', quantity: r.quantity || '', file_url: r.file_url || '', file_name: r.file_name || '', notes: r.notes || '', delivery_to: r.delivery_to || '', supplier: r.supplier || '' }); setShowInlineReprintForm(true); }} className="p-1 text-slate-400 hover:text-indigo-500 transition"><Icon name="square-pen" size={14} /></button>
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
                <button onClick={() => { openRequestModal(di); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"><Icon name="shopping-cart" size={14} /> <span className="text-center leading-tight">増刷<br />リクエスト</span></button>
                <button onClick={() => { setDetailItem(null); deleteItem(di.id); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"><Icon name="trash-2" size={14} /> 削除</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
