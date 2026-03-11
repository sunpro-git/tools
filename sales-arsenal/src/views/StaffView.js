import { createElement, useState, useEffect } from 'react';
import htm from 'htm';
import { Users, Plus, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { fetchAllUsers, saveStaff, deleteStaff } from '../services/db.js';

const html = htm.bind(createElement);

const STAFF_ROLES = [
  { id: 'admin', label: '管理者', color: 'bg-amber-100 text-amber-800' },
  { id: 'user',  label: '一般',   color: 'bg-slate-100 text-slate-600' },
];

function StaffModal({ staff, onClose, onSave }) {
  const isEdit = !!staff;
  const [name,       setName]       = useState(staff?.name       || '');
  const [email,      setEmail]      = useState(staff?.email      || '');
  const [department, setDepartment] = useState(staff?.department || '');
  const [role,       setRole]       = useState(staff?.role       || 'user');
  const [isActive,   setIsActive]   = useState(staff?.isActive   !== false);

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      alert('氏名とメールアドレスは必須です');
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), department: department.trim(), role, isActive });
  };

  return html`
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            ${isEdit ? 'スタッフ編集' : '新規スタッフ追加'}
          </h3>
          <button onClick=${onClose} className="text-slate-400 hover:text-slate-600">
            <${X} size=${20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input type="text" value=${name} onChange=${e => setName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input type="email" value=${email} onChange=${e => setEmail(e.target.value)}
              disabled=${isEdit}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" />
            ${isEdit && html`<p className="text-xs text-slate-400 mt-1">※ メールアドレスは変更できません</p>`}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">部署</label>
            <input type="text" value=${department} onChange=${e => setDepartment(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">権限</label>
            <div className="flex gap-2">
              ${STAFF_ROLES.map(r => html`
                <button key=${r.id} type="button" onClick=${() => setRole(r.id)}
                  className=${'px-5 py-2 rounded-lg text-sm font-bold border transition ' +
                    (role === r.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400')}>
                  ${r.label}
                </button>
              `)}
            </div>
          </div>
          <div>
            <label className="flex items-center cursor-pointer gap-3">
              <div className="relative">
                <input type="checkbox" checked=${isActive} onChange=${e => setIsActive(e.target.checked)}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="text-sm font-medium text-slate-700">アカウントを有効にする</span>
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button onClick=${onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">
            キャンセル
          </button>
          <button onClick=${handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">
            保存する
          </button>
        </div>
      </div>
    </div>
  `;
}

export default function StaffView({ onBack, onShowToast }) {
  const [staffList,    setStaffList]    = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterRole,   setFilterRole]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal,    setShowModal]    = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [sortKey,      setSortKey]      = useState('name');
  const [sortOrder,    setSortOrder]    = useState('asc');

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const users = await fetchAllUsers();
      setStaffList(users);
    } catch {
      onShowToast('スタッフ情報の取得に失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal  = (staff = null) => { setEditingStaff(staff); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingStaff(null); };

  const handleSave = async (formData) => {
    try {
      if (editingStaff) {
        await saveStaff(editingStaff.id, formData);
        onShowToast('スタッフ情報を更新しました', 'success');
      } else {
        const newId = formData.email.replace(/[.#$[\]]/g, '_');
        await saveStaff(newId, formData);
        onShowToast('スタッフを追加しました', 'success');
      }
      closeModal();
      await loadStaff();
    } catch {
      onShowToast('保存に失敗しました', 'error');
    }
  };

  const handleDelete = async (staff) => {
    if (!confirm(`「${staff.name}」を削除しますか？`)) return;
    try {
      await deleteStaff(staff.id);
      onShowToast('スタッフを削除しました', 'success');
      await loadStaff();
    } catch {
      onShowToast('削除に失敗しました', 'error');
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return html`<${ChevronsUpDown} size=${12} className="ml-1 inline text-slate-300" />`;
    return sortOrder === 'asc'
      ? html`<${ChevronUp} size=${12} className="ml-1 inline" />`
      : html`<${ChevronDown} size=${12} className="ml-1 inline" />`;
  };

  const filtered = staffList
    .filter(s => {
      const q = searchQuery.toLowerCase();
      if (q && !s.name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q)) return false;
      if (filterRole   !== 'all' && s.role !== filterRole) return false;
      if (filterStatus === 'active'   && s.isActive === false) return false;
      if (filterStatus === 'inactive' && s.isActive !== false) return false;
      return true;
    })
    .sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (typeof va === 'string')  return sortOrder === 'asc' ? va.localeCompare(vb, 'ja') : vb.localeCompare(va, 'ja');
      if (typeof va === 'boolean') return sortOrder === 'asc' ? (va === vb ? 0 : va ? -1 : 1) : (va === vb ? 0 : va ? 1 : -1);
      return 0;
    });

  return html`
    <div className="pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <${Users} size=${24} className="mr-2 text-indigo-600" /> スタッフ管理
        </h2>
        <button onClick=${() => openModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1.5 transition shadow-sm">
          <${Plus} size=${16} /> 新規追加
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-grow max-w-md">
          <input type="text" value=${searchQuery} onChange=${e => setSearchQuery(e.target.value)}
            placeholder="氏名・メールアドレスで検索..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <${Search} size=${16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-500 mr-2">状態</span>
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            ${[['all','全て'],['active','有効'],['inactive','無効']].map(([val, label]) => html`
              <button key=${val} onClick=${() => setFilterStatus(val)}
                className=${'px-3 py-1 text-xs rounded transition-colors ' +
                  (filterStatus === val ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700')}>
                ${label}
              </button>
            `)}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-500 mr-2">権限</span>
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            ${[['all','全て'],['admin','管理者'],['user','一般']].map(([val, label]) => html`
              <button key=${val} onClick=${() => setFilterRole(val)}
                className=${'px-3 py-1 text-xs rounded transition-colors ' +
                  (filterRole === val ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-700')}>
                ${label}
              </button>
            `)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        ${isLoading ? html`
          <div className="p-10 text-center text-slate-400">読み込み中...</div>
        ` : filtered.length === 0 ? html`
          <div className="p-10 text-center text-slate-400">該当するスタッフが見つかりません</div>
        ` : html`
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick=${() => handleSort('name')}>
                    氏名 <${SortIcon} column="name" />
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick=${() => handleSort('department')}>
                    部署 <${SortIcon} column="department" />
                  </th>
                  <th className="p-3 whitespace-nowrap">メールアドレス</th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick=${() => handleSort('role')}>
                    権限 <${SortIcon} column="role" />
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap" onClick=${() => handleSort('isActive')}>
                    状態 <${SortIcon} column="isActive" />
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(s => {
                  const roleDef = STAFF_ROLES.find(r => r.id === s.role) || STAFF_ROLES[1];
                  const active  = s.isActive !== false;
                  return html`
                    <tr key=${s.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-800 text-sm whitespace-nowrap">${s.name}</td>
                      <td className="p-3 text-sm text-slate-600">${s.department || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">${s.email}</td>
                      <td className="p-3">
                        <span className=${'px-2 py-0.5 rounded text-xs font-bold ' + roleDef.color}>
                          ${roleDef.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className=${'px-2 py-0.5 rounded text-xs font-bold ' +
                          (active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500')}>
                          ${active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick=${() => openModal(s)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold mr-3 transition">
                          編集
                        </button>
                        <button onClick=${() => handleDelete(s)}
                          className="text-red-400 hover:text-red-600 text-xs transition">
                          削除
                        </button>
                      </td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
          </div>
        `}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-right">
          ${filtered.length}件 / 全${staffList.length}件
        </div>
      </div>

      ${showModal && html`
        <${StaffModal}
          staff=${editingStaff}
          onClose=${closeModal}
          onSave=${handleSave}
        />
      `}
    </div>
  `;
}
