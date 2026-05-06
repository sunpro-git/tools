import React from 'react';

// --- ヘルパー関数 ---
export const getAreaBranch = (address) => {
    if (!address) return null;
    if (address.match(/長野|須坂|千曲|中野/)) return { name: '長野', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (address.match(/上田|東御|小諸|佐久/)) return { name: '上田', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (address.match(/飯田/)) return { name: '飯田', class: 'bg-violet-50 text-violet-700 border-violet-200' };
    if (address.match(/伊那|駒ヶ根/)) return { name: '伊那', class: 'bg-rose-50 text-rose-700 border-rose-200' };
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
    if (!dt) return '---';
    const hasTime = typeof dt === 'string' && dt.includes('T') && !dt.endsWith('T');
    const dateStr = typeof dt === 'string' ? dt.split('T')[0] : dt;
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return '---';
    const year = parseInt(parts[0]); const month = parseInt(parts[1]); const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '---';
    const dateObj = new Date(year, month - 1, day);
    const w = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
    let c = "text-gray-400"; if (dateObj.getDay() === 0) c = "text-red-600"; if (dateObj.getDay() === 6) c = "text-blue-600";
    const mm = String(month).padStart(2, '0'); const dd = String(day).padStart(2, '0');
    if (!hasTime) return (<span>{year}/{mm}/{dd}<span className={`text-[11px] ml-0.5 ${c}`}>({w})</span></span>);
    const timeParts = typeof dt === 'string' ? dt.split('T')[1] : '';
    const time = timeParts ? timeParts.substring(0, 5) : '';
    if (!time || time === '00:00') return (<span>{year}/{mm}/{dd}<span className={`text-[11px] ml-0.5 ${c}`}>({w})</span></span>);
    return (<span>{year}/{mm}/{dd}<span className={`text-[11px] ml-0.5 ${c}`}>({w})</span> <span className="text-[11px]">{time}</span></span>);
};
export const toYMD = (date) => `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
export const formatRepName = (n) => n ? (n.includes(':')?n.split(':').pop():n).replace(/[\s\u3000]+/g,'') : '';
export const formatCurrency = (amount) => amount ? Number(amount).toLocaleString() + '円' : '-';
export const handleShowPicker = (e) => { try { if (e.target && typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (err) {} };

// 日付入力欄の右に表示する曜日ラベル（例: (水) 土曜は青、日曜は赤）
export const DowLabel = ({ ymd, className = '' }) => {
    if (!ymd) return null;
    const parts = String(ymd).split('T')[0].split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0]); const month = parseInt(parts[1]); const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    let c = "text-gray-500"; if (date.getDay() === 0) c = "text-red-600"; if (date.getDay() === 6) c = "text-blue-600";
    return <span className={`text-xs font-bold whitespace-nowrap ${c} ${className}`}>({w})</span>;
};

// eventType の選択肢（管理画面で編集可能な値）
export const EVENT_TYPE_OPTIONS = [
    { value: 'ohirome',       label: 'お披露目会・見学会（家具有）' },
    { value: 'ohirome_nashi', label: 'お披露目会・見学会（家具無）' },
    { value: 'event',         label: 'イベント（その他）' },
    { value: 'satsuei',       label: '撮影のみ（家具有）' },
    { value: 'satsuei_nashi', label: '撮影のみ（家具無）' },
];

// 登録内容から eventType を自動判定
// - 名称に「お披露目会」「見学会」を含む → ohirome / ohirome_nashi（家具設営有無で分岐）
// - イベント日が登録されている → event
// - 撮影日のみ → satsuei / satsuei_nashi（家具設営有無で分岐）
// - 何もない → '' (空)
export const computeEventType = (p) => {
    const hasFurniture = p.furnitureSetup === 'あり';
    const titleText = `${p.eventName || ''} ${p.name || ''}`;
    const isOhirome = /お披露目会|見学会/.test(titleText);
    const hasEventDates = (p.eventDates || []).filter(Boolean).length > 0
        || (p.openHouseDates || []).filter(Boolean).length > 0
        || !!p.openHouseDate;
    const hasShootingDates = (p.youtubeDates || []).filter(Boolean).length > 0 || !!p.youtubeDate
        || (p.photoDates || []).filter(Boolean).length > 0 || !!p.photoDate
        || (p.exteriorPhotoDates || []).filter(Boolean).length > 0 || !!p.exteriorPhotoDate
        || (p.instaLiveDates || []).filter(Boolean).length > 0 || !!p.instaLiveDate
        || (p.instaRegularDates || []).filter(Boolean).length > 0 || !!p.instaRegularDate
        || (p.instaPromoDates || []).filter(Boolean).length > 0 || !!p.instaPromoDate
        || (p.otherDates || []).filter(Boolean).length > 0 || !!p.otherDate;
    if (isOhirome) return hasFurniture ? 'ohirome' : 'ohirome_nashi';
    if (hasEventDates) return 'event';
    if (hasShootingDates) return hasFurniture ? 'satsuei' : 'satsuei_nashi';
    return '';
};

// 撮影ステータス計算: 全日程の最古/最新と今日を比較
// - 全て未来: 撮影予定 (blue)
// - 開催期間中: 撮影中 (emerald)
// - 全て過去: 撮影済 (gray)
// - 撮影日無し / shootingTypes のみ: 撮影 (yellow フォールバック)
// - 何もない: null
export const computeShootStatus = (p) => {
    const dates = [];
    const norm = (d) => typeof d === 'string' ? d.split('T')[0] : (d instanceof Date ? d.toISOString().split('T')[0] : String(d || '').split('T')[0]);
    const addArr = (arr) => (arr || []).filter(Boolean).forEach(d => { const v = norm(d); if (v) dates.push(v); });
    const addOne = (d) => { const v = norm(d); if (v) dates.push(v); };
    addArr(p.youtubeDates); addOne(p.youtubeDate);
    addArr(p.photoDates); addOne(p.photoDate);
    addArr(p.exteriorPhotoDates); addOne(p.exteriorPhotoDate);
    addArr(p.instaLiveDates); addOne(p.instaLiveDate);
    addArr(p.instaRegularDates); addOne(p.instaRegularDate);
    addArr(p.instaPromoDates); addOne(p.instaPromoDate);
    addArr(p.otherDates); addOne(p.otherDate);
    addOne(p.shootingRangeFrom); addOne(p.shootingRangeTo);
    const hasTypes = p.shootingTypes && p.shootingTypes.length > 0;
    if (dates.length === 0) {
        return hasTypes ? { label: '撮影', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' } : null;
    }
    const sorted = [...new Set(dates)].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const today = new Date().toISOString().split('T')[0];
    if (today > last) return { label: '撮影済', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
    if (today >= first) return { label: '撮影中', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: '撮影予定', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
};

// 曜日ラベルを内側に重ねた date input ラッパー
export const DateInputDow = ({ value, className = '', wrapperClassName = '', ...rest }) => (
    <span className={`relative inline-block ${wrapperClassName}`}>
        <input type="date" value={value} {...rest} className={`${className} pr-5`} />
        <DowLabel ymd={value} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none bg-gray-50 px-0.5" />
    </span>
);
