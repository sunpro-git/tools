import { createElement, useState } from 'react';
import htm from 'htm';
import {
  ArrowLeft, ShieldCheck, Shield, Users, TrendingUp, BarChart2,
  Plus, Pencil, Trash2, X,
} from 'lucide-react';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase.js';

const html = htm.bind(createElement);

const BUSINESS_TYPES = ['新築', 'リフォーム', '不動産', 'ソリューション'];

function WeaponModal({ weapon, onClose, onSave }) {
  const isEdit = !!weapon;
  const [title, setTitle] = useState(weapon?.title || '');
  const [businessType, setBusinessType] = useState(weapon?.businessType || '新築');
  const [categoriesText, setCategoriesText] = useState((weapon?.categories || []).join('、'));
  const [winRate, setWinRate] = useState(weapon?.winRate || '');
  const [overview, setOverview] = useState(weapon?.overview || '');
  const [summary, setSummary] = useState(weapon?.summary || '');
  const [todosText, setTodosText] = useState((weapon?.todos || []).join('\n'));
  const [tags, setTags] = useState((weapon?.tags || []).join('、'));
  const [supervisorName, setSupervisorName] = useState(weapon?.supervisor?.name || '');
  const [supervisorRole, setSupervisorRole] = useState(weapon?.supervisor?.role || '');
  const [videoUrl, setVideoUrl] = useState(weapon?.videoUrl || '');
  const [videoTitle, setVideoTitle] = useState(weapon?.videoTitle || '');

  const handleSave = () => {
    if (!title.trim()) { alert('タイトルは必須です'); return; }
    const data = {
      title: title.trim(),
      businessType,
      categories: categoriesText.split(/[,、]/).map(s => s.trim()).filter(Boolean),
      winRate: winRate.trim(),
      overview: overview.trim(),
      summary: summary.trim(),
      todos: todosText.split('\n').map(s => s.trim()).filter(Boolean),
      tags: tags.split(/[,、]/).map(s => s.trim()).filter(Boolean),
      supervisor: { name: supervisorName.trim(), role: supervisorRole.trim() },
      videoUrl: videoUrl.trim(),
      videoTitle: videoTitle.trim(),
      updatedAt: new Date().toISOString().split('T')[0],
    };
    onSave(data);
  };

  return html`
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-slate-800">${isEdit ? '武器を編集' : '新規武器追加'}</h3>
          <button onClick=${onClose} className="text-slate-400 hover:text-slate-600"><${X} size=${20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">タイトル <span className="text-red-500">*</span></label>
            <input type="text" value=${title} onChange=${e => setTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ビジネスタイプ</label>
              <select value=${businessType} onChange=${e => setBusinessType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                ${BUSINESS_TYPES.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">成約目安</label>
              <input type="text" value=${winRate} onChange=${e => setWinRate(e.target.value)}
                placeholder="例: 30%"
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">カテゴリ（読点「、」区切り）</label>
            <input type="text" value=${categoriesText} onChange=${e => setCategoriesText(e.target.value)}
              placeholder="例: 土地探し、お披露目会 / 見学会"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">タグ（読点「、」区切り）</label>
            <input type="text" value=${tags} onChange=${e => setTags(e.target.value)}
              placeholder="例: 新人向け、基本"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">概要</label>
            <textarea value=${overview} onChange=${e => setOverview(e.target.value)} rows=${3}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">サマリー</label>
            <textarea value=${summary} onChange=${e => setSummary(e.target.value)} rows=${3}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">即効TODO（1行1項目）</label>
            <textarea value=${todosText} onChange=${e => setTodosText(e.target.value)} rows=${4}
              placeholder="競合の見積もり内容を詳細にヒアリング"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">上司名</label>
              <input type="text" value=${supervisorName} onChange=${e => setSupervisorName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">上司役職</label>
              <input type="text" value=${supervisorRole} onChange=${e => setSupervisorRole(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">動画URL（YouTube embed）</label>
            <input type="text" value=${videoUrl} onChange=${e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">動画タイトル</label>
            <input type="text" value=${videoTitle} onChange=${e => setVideoTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick=${onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">キャンセル</button>
          <button onClick=${handleSave} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">保存する</button>
        </div>
      </div>
    </div>
  `;
}

export default function AdminPanel({ weapons, onBack, onShowToast }) {
  const [tab, setTab] = useState('weapons');
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState(null);

  const toggleSupervisor = async (weapon) => {
    try {
      await updateDoc(doc(db, 'weapons', weapon.id), {
        supervisorApproved: !weapon.supervisorApproved,
      });
      onShowToast(
        weapon.supervisorApproved ? '上司認定を解除しました' : '上司認定しました',
        'success'
      );
    } catch {
      onShowToast('更新に失敗しました', 'error');
    }
  };

  const handleEdit = (weapon) => { setEditingWeapon(weapon); setShowWeaponModal(true); };
  const handleAdd = () => { setEditingWeapon(null); setShowWeaponModal(true); };

  const handleDelete = async (weapon) => {
    if (!confirm(`「${weapon.title}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    try {
      await deleteDoc(doc(db, 'weapons', weapon.id));
      onShowToast('武器を削除しました', 'success');
    } catch {
      onShowToast('削除に失敗しました', 'error');
    }
  };

  const handleSaveWeapon = async (formData) => {
    try {
      if (editingWeapon) {
        await updateDoc(doc(db, 'weapons', editingWeapon.id), formData);
        onShowToast('武器を更新しました', 'success');
      } else {
        await addDoc(collection(db, 'weapons'), {
          ...formData,
          likes: 0,
          metrics: { favorites: 0, understood: 0, practicing: 0 },
          completedBy: [],
          downloads: [],
          templates: [],
          timestamps: [],
          transcript: '',
          quiz: { questions: [] },
          supervisorApproved: false,
        });
        onShowToast('武器を追加しました', 'success');
      }
      setShowWeaponModal(false);
      setEditingWeapon(null);
    } catch {
      onShowToast('保存に失敗しました', 'error');
    }
  };

  const totalCompleted = weapons.reduce((sum, w) => sum + (w.completedBy?.length || 0), 0);
  const totalLikes = weapons.reduce((sum, w) => sum + (w.likes || 0), 0);
  const topWeapon = [...weapons].sort((a, b) => (b.metrics?.understood || 0) - (a.metrics?.understood || 0))[0];

  const tabs = [
    { id: 'weapons', label: '武器管理', icon: Shield },
    { id: 'stats',   label: '統計',     icon: BarChart2 },
  ];

  return html`
    <div className="pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-5 rounded-xl mb-6">
        <button onClick=${onBack} className="flex items-center gap-1 text-white/80 hover:text-white mb-3 text-sm">
          <${ArrowLeft} className="w-4 h-4" /> 戻る
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">コンテンツ管理</h2>
            <p className="text-xs text-white/70 mt-0.5">武器庫の管理・統計を確認できます</p>
          </div>
          ${tab === 'weapons' && html`
            <button onClick=${handleAdd}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition">
              <${Plus} size=${16} /> 武器を追加
            </button>
          `}
        </div>
      </div>

      <div className="flex bg-white border-b border-slate-200 mb-4 rounded-t-xl overflow-hidden shadow-sm">
        ${tabs.map(({ id, label, icon: Icon }) => html`
          <button key=${id} onClick=${() => setTab(id)}
            className=${'flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ' +
              (tab === id ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            <${Icon} className="w-4 h-4" />
            ${label}
          </button>
        `)}
      </div>

      ${tab === 'stats' && html`
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${[
              { label: '総武器数',  value: weapons.length,                                    icon: Shield,      color: 'bg-indigo-50 text-indigo-600' },
              { label: '総習得数',  value: totalCompleted,                                    icon: Users,       color: 'bg-green-50 text-green-600'   },
              { label: '総いいね数', value: totalLikes,                                       icon: TrendingUp,  color: 'bg-red-50 text-red-600'       },
              { label: '認定済み',  value: weapons.filter(w => w.supervisorApproved).length,  icon: ShieldCheck, color: 'bg-amber-50 text-amber-600'   },
            ].map(({ label, value, icon: Icon, color }) => html`
              <div key=${label} className=${'rounded-2xl p-5 ' + color}>
                <${Icon} className="w-5 h-5 mb-2 opacity-70" />
                <div className="text-3xl font-bold">${value}</div>
                <div className="text-xs opacity-70 mt-1">${label}</div>
              </div>
            `)}
          </div>
          ${topWeapon && html`
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">最も習得された武器</h3>
              <p className="text-sm font-bold text-slate-800">${topWeapon.title}</p>
              <p className="text-xs text-slate-500 mt-1">${topWeapon.completedBy?.length || 0}人が習得済み</p>
            </div>
          `}
        </div>
      `}

      ${tab === 'weapons' && html`
        <div className="space-y-2">
          ${weapons.length === 0 && html`
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-sm border border-slate-200">
              武器がまだありません
            </div>
          `}
          ${weapons.map(weapon => html`
            <div key=${weapon.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-indigo-200 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">${weapon.title}</p>
                  <div className="flex items-center flex-wrap gap-3 text-xs text-slate-400">
                    <span>${weapon.businessType}</span>
                    <span>習得: ${weapon.completedBy?.length || 0}人</span>
                    <span>いいね: ${weapon.likes || 0}</span>
                    ${weapon.updatedAt && html`<span>更新: ${weapon.updatedAt}</span>`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button onClick=${() => handleEdit(weapon)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                    <${Pencil} className="w-3.5 h-3.5" /> 編集
                  </button>
                  <button onClick=${() => toggleSupervisor(weapon)}
                    className=${'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ' +
                      (weapon.supervisorApproved
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                    <${ShieldCheck} className="w-3.5 h-3.5" />
                    ${weapon.supervisorApproved ? '認定済み' : '認定する'}
                  </button>
                  <button onClick=${() => handleDelete(weapon)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition">
                    <${Trash2} className="w-3.5 h-3.5" /> 削除
                  </button>
                </div>
              </div>
            </div>
          `)}
        </div>
      `}

      ${showWeaponModal && html`
        <${WeaponModal}
          weapon=${editingWeapon}
          onClose=${() => { setShowWeaponModal(false); setEditingWeapon(null); }}
          onSave=${handleSaveWeapon}
        />
      `}
    </div>
  `;
}
