import React from 'react';

// --- ヘルパー関数 ---
export const getAreaBranch = (address) => {
    if (!address) return null;
    if (address.match(/長野|須坂|千曲|中野/)) return { name: '長野', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (address.match(/上田|東御|小諸|佐久/)) return { name: '上田', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (address.match(/伊那|駒ヶ根|飯田/)) return { name: '伊那', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (address.match(/松本|塩尻|安曇野/)) return { name: '本社', class: 'bg-slate-100 text-slate-600 border-slate-200' };
    return null;
};

export const formatDate = (d) => {
    if (!d) return '---'; const date = new Date(d); if (isNaN(date.getTime())) return '---';
    const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0');
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    let c = "text-gray-400"; if (date.getDay() === 0) c = "text-red-600"; if (date.getDay() === 6) c = "text-blue-600";
    return (<span>{year}/{month}/{day}<span className={`text-[11px] ml-0.5 ${c}`}>({w})</span></span>);
};
export const formatDateTime = (dt) => {
    if (!dt) return '---'; const date = new Date(dt); if (isNaN(date.getTime())) return '---';
    const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0');
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    let c = "text-gray-400"; if (date.getDay() === 0) c = "text-red-600"; if (date.getDay() === 6) c = "text-blue-600";
    return (<span>{year}/{month}/{day}<span className={`text-[11px] ml-0.5 ${c}`}>({w})</span> {time}</span>);
};
export const toYMD = (date) => `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
export const formatRepName = (n) => n ? (n.includes(':')?n.split(':').pop():n).replace(/[\s\u3000]+/g,'') : '';
export const formatCurrency = (amount) => amount ? Number(amount).toLocaleString() + '円' : '-';
export const handleShowPicker = (e) => { try { if (e.target && typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (err) {} };
