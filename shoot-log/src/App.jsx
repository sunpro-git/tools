import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, CALENDAR_GAS_API_URL, CATEGORIES, BRANCHES, BRANCH_LABELS, STAFF_ROLES, STAFF_DEPARTMENTS, EQUIPMENT_TYPES, SHOOTING_TYPES, ANDPAD_LABELS } from './config';
import { getAreaBranch, formatDate, formatDateTime, toYMD, formatRepName, formatCurrency, handleShowPicker } from './helpers';
import Icon from './components/Icon';
import TagInput from './components/TagInput';
import StaffOnlyInput from './components/StaffOnlyInput';
import FileUpload from './components/FileUpload';

const App = () => {
    const [user, setUser] = useState(null); const [properties, setProperties] = useState([]); const [staffs, setStaffs] = useState([]); const [equipments, setEquipments] = useState([]);
    const [loading, setLoading] = useState(true); const [isModalOpen, setIsModalOpen] = useState(false); const [isJsonModalOpen, setIsJsonModalOpen] = useState(false); const [isRequestModalOpen, setIsRequestModalOpen] = useState(false); const [isAndpadModalOpen, setIsAndpadModalOpen] = useState(false); const [isStaffModalOpen, setIsStaffModalOpen] = useState(false); const [isStaffBulkModalOpen, setIsStaffBulkModalOpen] = useState(false); const [staffBulkText, setStaffBulkText] = useState(''); const [staffBulkMode, setStaffBulkMode] = useState('import'); const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false); const [isEquipBulkModalOpen, setIsEquipBulkModalOpen] = useState(false); const [equipBulkText, setEquipBulkText] = useState(''); const [equipBulkMode, setEquipBulkMode] = useState('import');
    const [jsonInput, setJsonInput] = useState(''); const [editingId, setEditingId] = useState(null); const [notification, setNotification] = useState(null); const [bulkSyncing, setBulkSyncing] = useState(false); const [isSyncingCalendar, setIsSyncingCalendar] = useState(false); const [scrollToRequest, setScrollToRequest] = useState(false);
    const [visibleEventTypes, setVisibleEventTypes] = useState(['setup', 'teardown', 'openhouse', 'youtube', 'photo', 'instalive', 'event_setup', 'event_teardown', 'event_date']); const [viewMode, setViewMode] = useState('list');
    const [isFilterExpanded, setIsFilterExpanded] = useState(true); const [selectedCategories, setSelectedCategories] = useState([]); const [selectedBranches, setSelectedBranches] = useState([]); const [searchKeyword, setSearchKeyword] = useState('');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [events, setEvents] = useState([]); const [isEventModalOpen, setIsEventModalOpen] = useState(false); const [editingEventId, setEditingEventId] = useState(null);
    const [eventForm, setEventForm] = useState({ name:'', category:'新築', setupDate_date:'', setupDate_time:'', setupEndTime:'', setupVehicle:'', setupVehicle2:'', teardownDate_date:'', teardownDate_time:'', teardownEndTime:'', teardownVehicle:'', teardownVehicle2:'', eventDates:['',''], notificationStaff:[] });
    const [chatworkSettings, setChatworkSettings] = useState({ chatwork_room_id: '', chatwork_notify_on_create: 'true', chatwork_notify_on_update: 'true', chatwork_notify_on_remind: 'true', chatwork_template_create: '', chatwork_template_update: '', chatwork_template_remind: '' });
    const [editingTemplateType, setEditingTemplateType] = useState('create');
    const [filterFrom, setFilterFrom] = useState(''); const [filterTo, setFilterTo] = useState(''); const [importFrom, setImportFrom] = useState(''); const [importTo, setImportTo] = useState(''); const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

    const [reqSearch, setReqSearch] = useState({ keyword: '', category: '', staff: '', contractFrom: '', contractTo: '', handoverFrom: '', handoverTo: '' });
    const timeOptions = useMemo(() => Array.from({ length: 49 }, (_, i) => `${Math.floor((480 + (i * 15)) / 60).toString().padStart(2, '0')}:${((480 + (i * 15)) % 60).toString().padStart(2, '0')}`), []);
    const vehicleOptions = useMemo(() => equipments.filter(e => e.type === '車輛'), [equipments]);

    const [form, setForm] = useState({
        name: '', address: '', category: '新築', furnitureSetup: 'なし', customerName: '', customerLat: '', customerLon: '', mainStore: '',
        setupDate_date: '', setupDate_time: '', setupEndTime: '', teardownDate_date: '', teardownDate_time: '', teardownEndTime: '', setupVehicle: '', setupVehicle2: '', teardownVehicle: '', teardownVehicle2: '',
        shootingRange_from_date: '', shootingRange_from_time: '', shootingRange_to_date: '', shootingRange_to_time: '',
        openHouseDate: '', openHouseDates: ['', ''], handoverDate: '', handoverSource: '',
        youtubeDate: '', youtubeStartTime: '', youtubeEndTime: '', youtubeStaff: [], youtubeRequested: false, youtubeNote: '',
        photoDate: '', photoStartTime: '', photoEndTime: '', photoStaff: [], photoRequested: false, photoNote: '',
        exteriorPhotoDate: '', exteriorPhotoStartTime: '', exteriorPhotoEndTime: '', exteriorPhotoStaff: [], exteriorPhotoRequested: false, exteriorPhotoNote: '',
        instaLiveDate: '', instaLiveStartTime: '', instaLiveEndTime: '', instaLiveStaff: [], instaLiveRequested: false, instaLiveNote: '',
        instaRegularDate: '', instaRegularStartTime: '', instaRegularEndTime: '', instaRegularStaff: [], instaRegularRequested: false, instaRegularNote: '',
        instaPromoDate: '', instaPromoStartTime: '', instaPromoEndTime: '', instaPromoStaff: [], instaPromoRequested: false, instaPromoNote: '',
        otherDate: '', otherStartTime: '', otherEndTime: '', otherStaff: [], otherRequested: false, otherNote: '',
        notificationStaff: [], systemId: '', salesRep: '', icRep: '', constructionRep: '',
        requester: '', shootingTypes: [],
        parkingInfo: '', shootingPoints: '', witnessStaff: '', ownerPresence: '',
        instructionFileUrl: '', instructionFileName: '', overviewFileUrl: '', overviewFileName: '', shootingNotes: '',
        contractDate: '', contractAmount: '', originalUpdatedAt: null
    });
    const [staffForm, setStaffForm] = useState({ id: '', name: '', email: '', department: '', roles: [], chatwork_account_id: '' });
    const [staffFilterDept, setStaffFilterDept] = useState('');
    const [equipmentForm, setEquipmentForm] = useState({ id: '', name: '', email: '', type: '設備' });
    const [equipFilterType, setEquipFilterType] = useState('');
    const [propertySearchQuery, setPropertySearchQuery] = useState('');
    const [showPropertySuggestions, setShowPropertySuggestions] = useState(false);
    const staffSuggestions = useMemo(() => staffs.length === 0 ? ['スタッフ未登録'] : staffs.map(s => s.name), [staffs]);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const rawDate = p.setupDate || ''; const ymd = rawDate.split('T')[0]; const ym = ymd.substring(0, 7);
            const dateMatch = viewMode === 'calendar' ? true : ((!filterFrom || ym >= filterFrom) && (!filterTo || ym <= filterTo));
            const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
            let branchMatch = true; if (selectedBranches.length > 0) { const branchInfo = getAreaBranch(p.address); branchMatch = branchInfo && selectedBranches.includes(branchInfo.name); }
            let keywordMatch = true; if (searchKeyword.trim()) { const keywords = searchKeyword.toLowerCase().replace(/　/g, ' ').split(' ').filter(k => k); const targetString = [p.name, p.address, p.salesRep, p.icRep, p.constructionRep, p.systemId, ...(p.youtubeStaff || []), ...(p.photoStaff || []), ...(p.instaLiveStaff || [])].join(' ').toLowerCase(); keywordMatch = keywords.every(k => targetString.includes(k)); }
            return dateMatch && categoryMatch && branchMatch && keywordMatch;
        });
    }, [properties, filterFrom, filterTo, selectedCategories, selectedBranches, searchKeyword, viewMode]);

    const requestSuggestions = useMemo(() => {
        return properties.filter(p => {
            if (reqSearch.keyword) { const k = reqSearch.keyword.toLowerCase(); const target = [p.name, p.customerName, p.address].join(' ').toLowerCase(); if (!target.includes(k)) return false; }
            if (reqSearch.category && p.category !== reqSearch.category) return false;
            if (reqSearch.staff) { const s = reqSearch.staff; if (!((p.salesRep||'').includes(s) || (p.icRep||'').includes(s) || (p.constructionRep||'').includes(s))) return false; }
            if (reqSearch.contractFrom || reqSearch.contractTo) { const cDate = (p.contractDate || '').substring(0, 7); if (reqSearch.contractFrom && cDate < reqSearch.contractFrom) return false; if (reqSearch.contractTo && cDate > reqSearch.contractTo) return false; }
            if (reqSearch.handoverFrom || reqSearch.handoverTo) { const hDate = (p.handoverDate || '').substring(0, 7); if (reqSearch.handoverFrom && hDate < reqSearch.handoverFrom) return false; if (reqSearch.handoverTo && hDate > reqSearch.handoverTo) return false; }
            return true;
        }).slice(0, 50);
    }, [properties, reqSearch]);

    const groupedProperties = useMemo(() => {
        const groups = {};
        filteredProperties.forEach(p => { let key = "設営日未定"; if (p.setupDate) { const d = new Date(p.setupDate); if (!isNaN(d.getTime())) key = `${d.getFullYear()}年${d.getMonth() + 1}月 設営`; } if (!groups[key]) groups[key] = []; groups[key].push(p); });
        const sortedKeys = Object.keys(groups).sort((a, b) => { if (a === "設営日未定") return 1; if (b === "設営日未定") return -1; const dateA = new Date(a.replace(' 設営', '').replace('年', '/').replace('月', '/1')); const dateB = new Date(b.replace(' 設営', '').replace('年', '/').replace('月', '/1')); return dateA - dateB; });
        return sortedKeys.map(key => ({ title: key, items: groups[key] }));
    }, [filteredProperties]);

    const calendarEvents = useMemo(() => {
        const calItems = [];
        filteredProperties.forEach(prop => {
            const rawName = prop.customerName || prop.name || ''; const cleanName = rawName.replace(/[\s\u3000]+/g, ''); const categorySuffix = prop.category ? ` ${prop.category}` : '';
            const addEvent = (dateStr, type, label, colorClass) => { if (!dateStr || !visibleEventTypes.includes(type)) return; const ymd = dateStr.split('T')[0]; if (!calItems[ymd]) calItems[ymd] = []; calItems[ymd].push({ type, label, title: `【${label}】${cleanName}${categorySuffix}`, colorClass, prop }); };
            addEvent(prop.setupDate, 'setup', '設営', 'bg-blue-100 text-blue-800 border-blue-200'); addEvent(prop.teardownDate, 'teardown', '撤収', 'bg-orange-100 text-orange-800 border-orange-200');
            (prop.openHouseDates && prop.openHouseDates.length > 0 ? prop.openHouseDates : (prop.openHouseDate ? [prop.openHouseDate] : [])).forEach(d => { if(d) addEvent(d, 'openhouse', '見学会', 'bg-purple-100 text-purple-800 border-purple-200'); });
            addEvent(prop.handoverDate, 'handover', '引渡', 'bg-emerald-100 text-emerald-800 border-emerald-200');
            addEvent(prop.youtubeDate, 'youtube', 'YouTube', 'bg-red-100 text-red-800 border-red-200'); addEvent(prop.photoDate, 'photo', 'スチール', 'bg-blue-50 text-blue-600 border-blue-200'); addEvent(prop.instaLiveDate, 'instalive', 'インスタ', 'bg-pink-100 text-pink-800 border-pink-200');
        });
        events.forEach(evt => {
            const cleanName = (evt.name || '').replace(/[\s\u3000]+/g, ''); const categorySuffix = evt.category ? ` ${evt.category}` : '';
            const addEvt = (dateStr, type, label, colorClass) => { if (!dateStr || !visibleEventTypes.includes(type)) return; const ymd = dateStr.split('T')[0]; if (!calItems[ymd]) calItems[ymd] = []; calItems[ymd].push({ type, label, title: `【${label}】${cleanName}${categorySuffix}`, colorClass, eventData: evt }); };
            addEvt(evt.setupDate, 'event_setup', 'EV設営', 'bg-indigo-100 text-indigo-800 border-indigo-200');
            addEvt(evt.teardownDate, 'event_teardown', 'EV撤収', 'bg-amber-100 text-amber-800 border-amber-200');
            (evt.eventDates || []).forEach(d => { if(d) addEvt(d, 'event_date', 'イベント', 'bg-teal-100 text-teal-800 border-teal-200'); });
        });
        return calItems;
    }, [filteredProperties, visibleEventTypes, events]);

    const toggleEventType = (type) => { if (type === 'setup_teardown') setVisibleEventTypes(prev => (prev.includes('setup')||prev.includes('teardown')) ? prev.filter(t => t !== 'setup' && t !== 'teardown') : [...prev, 'setup', 'teardown']); else if (type === 'media') setVisibleEventTypes(prev => { const targets = ['youtube', 'photo', 'instalive']; if (targets.some(t => prev.includes(t))) return prev.filter(t => !targets.includes(t)); const newTypes = [...prev]; targets.forEach(t => { if (!newTypes.includes(t)) newTypes.push(t); }); return newTypes; }); else if (type === 'event') setVisibleEventTypes(prev => { const targets = ['event_setup', 'event_teardown', 'event_date']; if (targets.some(t => prev.includes(t))) return prev.filter(t => !targets.includes(t)); const newTypes = [...prev]; targets.forEach(t => { if (!newTypes.includes(t)) newTypes.push(t); }); return newTypes; }); else setVisibleEventTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); };
    const calendarMonths = useMemo(() => { const months = []; for (let i = 0; i < 4; i++) { const d = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + i, 1); const start = new Date(d); start.setDate(start.getDate() - start.getDay()); const days = []; for(let j=0; j<42; j++){ const cur = new Date(start); cur.setDate(start.getDate()+j); days.push({ date: cur, ymd: toYMD(cur), isCurrentMonth: cur.getMonth() === d.getMonth(), isToday: toYMD(cur) === toYMD(new Date()) }); } months.push({ year: d.getFullYear(), month: d.getMonth(), days }); } return months; }, [currentCalendarDate]);
    const toggleFilterCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); const toggleFilterBranch = (branch) => setSelectedBranches(prev => prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]);
    const setQuickFilter = (offset) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; setFilterFrom(ym); setFilterTo(ym); };
    const setFourMonthsFilter = () => { const start = new Date(); start.setDate(1); const end = new Date(); end.setDate(1); end.setMonth(end.getMonth() + 3); setFilterFrom(`${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`); setFilterTo(`${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}`); };
    const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

    useEffect(() => { const now = new Date(); const future = new Date(); future.setMonth(future.getMonth() + 3); const formatYM = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; setFilterFrom(formatYM(now)); setFilterTo(formatYM(future)); setImportFrom(formatYM(now)); setImportTo(formatYM(future)); setUser({ id: 'anon' }); const cleanup = listenToData(); return () => { if (cleanup) cleanup(); }; }, []);
    useEffect(() => { if (isModalOpen && scrollToRequest) { setTimeout(() => { const s = document.getElementById('shooting-request-section'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); setScrollToRequest(false); }, 300); } }, [isModalOpen, scrollToRequest]);

    const realtimePausedRef = useRef(false);
    const listenToData = () => {
        const fetchProperties = async () => {
            const { data, error } = await supabase.from('properties').select('*');
            if (error) { console.error(error); return; }
            const processed = (data || []).map(d => {
                let categoryVal = Array.isArray(d.category) ? (d.category[0] || '新築') : (d.category || '新築');
                let ohDates = (d.openHouseDates && Array.isArray(d.openHouseDates)) ? d.openHouseDates : (d.openHouseDate ? [d.openHouseDate] : []);
                return { ...d, category: categoryVal, openHouseDates: ohDates };
            }).sort((a, b) => (a.setupDate || '9999').localeCompare(b.setupDate || '9999'));
            setProperties(processed); setLoading(false);
        };
        const fetchStaffs = async () => {
            const { data, error } = await supabase.from('staffs').select('*');
            if (error) { console.error(error); return; }
            const sorted = [...(data || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setStaffs(sorted);
        };
        const fetchEquipments = async () => {
            const { data, error } = await supabase.from('equipments').select('*');
            if (error) { console.error(error); return; }
            const sorted = [...(data || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setEquipments(sorted);
        };
        // デバウンス付きfetch（Realtime通知の大量発火防止）
        let propTimer = null;
        const debouncedFetchProperties = () => {
            if (realtimePausedRef.current) return;
            clearTimeout(propTimer);
            propTimer = setTimeout(fetchProperties, 1000);
        };
        const fetchSettings = async () => {
            const { data, error } = await supabase.from('app_settings').select('*');
            if (error) { console.error(error); return; }
            const s = {}; (data || []).forEach(r => { if (r.key.startsWith('chatwork_')) s[r.key] = r.value || ''; });
            setChatworkSettings(prev => ({ ...prev, ...s }));
        };
        const fetchEvents = async () => {
            const { data, error } = await supabase.from('events').select('*');
            if (error) { console.error(error); return; }
            setEvents((data || []).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')));
        };
        fetchProperties(); fetchStaffs(); fetchEquipments(); fetchSettings(); fetchEvents();
        const ch1 = supabase.channel('properties-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, debouncedFetchProperties).subscribe();
        const ch2 = supabase.channel('staffs-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, () => fetchStaffs()).subscribe();
        const ch3 = supabase.channel('equipments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'equipments' }, () => fetchEquipments()).subscribe();
        const ch4 = supabase.channel('events-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents()).subscribe();
        return () => { clearTimeout(propTimer); supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); };
    };

    const submitRequest = (e) => { e.preventDefault(); if (!requestForm.propertyId) { alert("物件選択必須"); return; } const p = properties.find(p => p.id === requestForm.propertyId); if (p) { setIsRequestModalOpen(false); openShootingRequestModal(p); } else { alert("データなし"); } };
    const getCalendarEmail = (name) => { const cal = equipments.find(e => e.name === name && e.type === 'カレンダー'); return cal ? cal.email : null; };
    const getGuestEmails = (p) => { const names = [...(p.youtubeStaff||[]), ...(p.photoStaff||[]), ...(p.instaLiveStaff||[]), ...(p.notificationStaff||[])]; if(p.requester) names.push(p.requester); return [...new Set(names)].map(n => { const s = staffs.find(st => st.name === n); return s ? s.email : null; }).filter(e=>e).join(','); };
    const getVehicleEmail = (n) => { const v = equipments.find(e => e.name === n && e.type === '車輛'); return v ? v.email : null; };
    const calculateTimeRange = (d, s, e, all=false) => { if(!d) return null; const ymd = d.split('T')[0]; let start, end; if(all) { start=new Date(`${ymd}T10:00:00`); end=new Date(`${ymd}T17:00:00`); } else { let sStr = d; if(s) sStr = `${ymd}T${s}:00`; else if(!d.includes('T')) sStr = `${ymd}T09:00:00`; start = new Date(sStr); if(e) end=new Date(`${ymd}T${e}:00`); else end=new Date(start.getTime()+7200000); if(!e && d.includes('T') && !isNaN(new Date(d).getTime())) { start=new Date(d); end=new Date(start.getTime()+7200000); } } return {start, end}; };

    const generatePropertyEvents = (p) => {
        const events = []; const guests = getGuestEmails(p);
        const desc = `【シューログ 現場撮影管理より登録】\n\n担当: ${p.salesRep||'-'}\n種別: ${p.category}\n住所: ${p.address||'-'}`;
        const cat = p.category; const cleanName = (p.customerName||p.name||'').replace(/[\s\u3000]+/g,'');
        const suffix = cat?` ${cat}`:''; const hasF = p.furnitureSetup==='あり'; const hasOh = (p.openHouseDates&&p.openHouseDates.some(d=>d))||!!p.openHouseDate;
        const type = hasF?(hasOh?'ohirome':'satsuei'):(hasOh?'ohirome_nashi':'satsuei_nashi');
        const loc = p.googleMapUrl || p.address || '';

        const setupTeardownCal = getCalendarEmail('設営・撤収カレンダー');
        const commonEventCal = getCalendarEmail('イベントカレンダー');
        const shinchikuCal = getCalendarEmail('新築イベントカレンダー');
        const reformCal = getCalendarEmail('リフォームイベントカレンダー');

        const addSetupTeardownGuests = (baseGuests) => { let g = baseGuests || ''; if (setupTeardownCal) g = g ? `${g},${setupTeardownCal}` : setupTeardownCal; return g; };
        const addEventGuests = (baseGuests) => { let g = baseGuests || ''; if (commonEventCal) g = g ? `${g},${commonEventCal}` : commonEventCal; if (cat === '新築' && shinchikuCal) g = g ? `${g},${shinchikuCal}` : shinchikuCal; if (cat === 'リフォーム' && reformCal) g = g ? `${g},${reformCal}` : reformCal; return g; };

        if(p.setupDate){ const r = calculateTimeRange(p.setupDate, null, p.setupEndTime); if(r){ const ve = getVehicleEmail(p.setupVehicle); const ve2 = getVehicleEmail(p.setupVehicle2); let g = ve ? (guests ? `${guests},${ve}` : ve) : guests; if(ve2) g = g ? `${g},${ve2}` : ve2; g = addSetupTeardownGuests(g); const vDesc = [p.setupVehicle,p.setupVehicle2].filter(Boolean).join(', '); events.push({id:p.id, title:`【設営】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc+(vDesc?`\n車両: ${vDesc}`:''), category:cat, guests:g, eventType:type, vehicleEmail:ve, vehicleName:p.setupVehicle}); } }
        if(p.teardownDate){ const r = calculateTimeRange(p.teardownDate, null, p.teardownEndTime); if(r){ const ve = getVehicleEmail(p.teardownVehicle); const ve2 = getVehicleEmail(p.teardownVehicle2); let g = ve ? (guests ? `${guests},${ve}` : ve) : guests; if(ve2) g = g ? `${g},${ve2}` : ve2; g = addSetupTeardownGuests(g); const vDesc = [p.teardownVehicle,p.teardownVehicle2].filter(Boolean).join(', '); events.push({id:p.id, title:`【撤収】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc+(vDesc?`\n車両: ${vDesc}`:''), category:cat, guests:g, eventType:type, vehicleEmail:ve, vehicleName:p.teardownVehicle}); } }
        (p.openHouseDates&&p.openHouseDates.length>0?p.openHouseDates:(p.openHouseDate?[p.openHouseDate]:[])).forEach(d=>{
            if(!d)return;
            const r=calculateTimeRange(d,null,null,true);
            if(r) {
                let g = addEventGuests(guests);
                events.push({id:`${p.id}_oh_${d}`, title:`【見学会】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc, category:cat, guests:g, eventType:type});
            }
        });

        if(p.youtubeDate){ const r=calculateTimeRange(p.youtubeDate,p.youtubeStartTime,p.youtubeEndTime); if(r) events.push({id:p.id, title:`【YouTube】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${p.youtubeStaff.join(', ')}`, category:cat, guests:guests, eventType:type}); }
        if(p.photoDate){ const r=calculateTimeRange(p.photoDate,p.photoStartTime,p.photoEndTime); if(r) events.push({id:p.id, title:`【撮影】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${p.photoStaff.join(', ')}`, category:cat, guests:guests, eventType:type}); }
        if(p.instaLiveDate){ const r=calculateTimeRange(p.instaLiveDate,p.instaLiveStartTime,p.instaLiveEndTime); if(r) events.push({id:p.id, title:`【InstaLive】${cleanName}${suffix}`, startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${p.instaLiveStaff.join(', ')}`, category:cat, guests:guests, eventType:type}); }
        return events;
    };

    const autoSyncCalendar = async (newProp, oldProp) => {
        if(!CALENDAR_GAS_API_URL) return;
        const newEvts = generatePropertyEvents(newProp);
        const oldEvts = oldProp ? generatePropertyEvents(oldProp) : [];
        const payload = [...newEvts];
        if (oldEvts.length > 0) {
            if (newEvts.length === 0) {
                // スケジュール全クリア → 物件IDで全イベント削除（_oh_含む）
                payload.push({id: oldProp.id, action: 'deleteAll'});
            } else {
                // 部分変更 → 削除された見学会日程を特定
                const newIds = new Set(newEvts.map(e => e.id));
                const removedIds = [...new Set(oldEvts.filter(e => !newIds.has(e.id)).map(e => e.id))];
                removedIds.forEach(eid => payload.push({id: eid, action: 'delete'}));
            }
        }
        if(payload.length === 0) return;
        try {
            const res = await fetch(CALENDAR_GAS_API_URL, {method:'POST', body:JSON.stringify(payload)});
            const r = await res.json();
            if(r.success){
                if(r.errors && r.errors.length > 0) alert("カレンダー登録中にエラーが発生しました:\n" + r.errors.join("\n"));
                else showNotification(newEvts.length === 0 ? 'カレンダー情報を削除しました' : 'カレンダー情報を更新しました');
            } else {
                alert("カレンダー登録エラー: " + r.message);
            }
        } catch(e){
            console.error(e);
            alert("カレンダー同期通信エラー: " + e.message);
        }
    };

    const CW_DEFAULT_TEMPLATES = {
        create: `{メンション}\n[info][title]シューログ 物件新規登録通知[/title]\n物件名: {物件名}\n種別: {種別}\n住所: {住所}\n設営日: {設営日}\n撤収日: {撤収日}\n撮影種類: {撮影種類}\n[/info]`,
        update: `{メンション}\n[info][title]シューログ 物件更新通知[/title]\n物件名: {物件名}\n種別: {種別}\n住所: {住所}\n設営日: {設営日}\n撤収日: {撤収日}\n撮影種類: {撮影種類}\n[/info]`,
        remind: `{メンション}\n[info][title]シューログ 明日の撮影リマインド[/title]\n物件名: {物件名}\n撮影タイプ: {撮影タイプ}\n撮影日: {撮影日}\n住所: {住所}\n担当: {撮影担当}\n駐車場: {駐車場}\n[/info]`
    };
    const CW_TAGS = [
        { tag: '{物件名}', label: '物件名' }, { tag: '{住所}', label: '住所' }, { tag: '{種別}', label: '種別' },
        { tag: '{設営日}', label: '設営日' }, { tag: '{撤収日}', label: '撤収日' }, { tag: '{引渡日}', label: '引渡日' },
        { tag: '{YouTube日}', label: 'YouTube日' }, { tag: '{スチール日}', label: 'スチール日' }, { tag: '{インスタライブ日}', label: 'インスタライブ日' },
        { tag: '{撮影種類}', label: '撮影種類' }, { tag: '{営業担当}', label: '営業担当' }, { tag: '{IC担当}', label: 'IC担当' }, { tag: '{工務担当}', label: '工務担当' },
        { tag: '{メンション}', label: 'メンション' }, { tag: '{依頼者}', label: '依頼者' },
        { tag: '{駐車場}', label: '駐車場' }, { tag: '{撮影ポイント}', label: '撮影ポイント' }, { tag: '{立ち合い}', label: '立ち合い' }, { tag: '{施主在宅}', label: '施主在宅' }, { tag: '{撮影備考}', label: '撮影備考' },
    ];
    const CW_REMIND_TAGS = [{ tag: '{撮影日}', label: '撮影日' }, { tag: '{撮影タイプ}', label: '撮影タイプ' }, { tag: '{撮影担当}', label: '撮影担当' }];
    const renderCwTemplate = (template, prop, extraCtx = {}) => {
        const fd = (d) => d ? d.split('T')[0] : '';
        const mentionNames = [...(prop.notificationStaff || []), ...(prop.youtubeStaff || []), ...(prop.photoStaff || []), ...(prop.instaLiveStaff || [])];
        if (prop.requester) mentionNames.push(prop.requester);
        const mentionStr = [...new Set(mentionNames)].map(n => { const s = staffs.find(st => st.name === n); return s && s.chatwork_account_id ? `[To:${s.chatwork_account_id}]${s.name}さん` : null; }).filter(Boolean).join(' ');
        const map = {
            '{物件名}': (prop.customerName || prop.name || '').replace(/[\s\u3000]+/g, ''), '{住所}': prop.address || '', '{種別}': prop.category || '',
            '{営業担当}': prop.salesRep || '', '{IC担当}': prop.icRep || '', '{工務担当}': prop.constructionRep || '',
            '{設営日}': fd(prop.setupDate), '{撤収日}': fd(prop.teardownDate), '{引渡日}': fd(prop.handoverDate),
            '{見学会日}': (prop.openHouseDates || []).filter(d => d).map(d => d.split('T')[0]).join(', '),
            '{YouTube日}': fd(prop.youtubeDate), '{スチール日}': fd(prop.photoDate), '{インスタライブ日}': fd(prop.instaLiveDate),
            '{インスタ通常日}': fd(prop.instaRegularDate), '{インスタ宣伝日}': fd(prop.instaPromoDate), '{その他日}': fd(prop.otherDate),
            '{撮影種類}': (prop.shootingTypes || []).join(', '), '{家具設営}': prop.furnitureSetup || '', '{依頼者}': prop.requester || '',
            '{SystemID}': prop.systemId || '', '{駐車場}': prop.parkingInfo || '', '{撮影ポイント}': prop.shootingPoints || '',
            '{立ち合い}': prop.witnessStaff || '', '{施主在宅}': prop.ownerPresence || '', '{撮影備考}': prop.shootingNotes || '',
            '{メンション}': mentionStr, '{撮影日}': extraCtx.shootingDate || '', '{撮影タイプ}': extraCtx.shootingType || '', '{撮影担当}': extraCtx.shootingStaff || '',
        };
        return template.replace(/\{[^}]+\}/g, m => map[m] !== undefined ? map[m] : m);
    };

    const sendChatworkNotification = async (prop, isNew) => {
        const roomId = chatworkSettings.chatwork_room_id;
        if (!roomId) return;
        const toggleKey = isNew ? 'chatwork_notify_on_create' : 'chatwork_notify_on_update';
        if (chatworkSettings[toggleKey] === 'false') return;
        const templateKey = isNew ? 'chatwork_template_create' : 'chatwork_template_update';
        const template = chatworkSettings[templateKey] || CW_DEFAULT_TEMPLATES[isNew ? 'create' : 'update'];
        const message = renderCwTemplate(template, prop);
        try {
            await supabase.functions.invoke('chatwork-notify', { body: { room_id: roomId, message } });
        } catch (e) { console.error('Chatwork通知エラー:', e); }
    };

    const saveChatworkSettings = async () => {
        const upserts = Object.entries(chatworkSettings).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
        const { error } = await supabase.from('app_settings').upsert(upserts);
        if (error) { alert('設定保存失敗'); return; }
        showNotification('チャットワーク設定を保存しました');
        setIsSettingsModalOpen(false);
    };
    const insertCwTag = (tag) => {
        const ta = document.getElementById('cw-template-textarea');
        if (!ta) return;
        const start = ta.selectionStart; const end = ta.selectionEnd;
        const key = `chatwork_template_${editingTemplateType}`;
        const cur = chatworkSettings[key] || CW_DEFAULT_TEMPLATES[editingTemplateType];
        const nv = cur.substring(0, start) + tag + cur.substring(end);
        setChatworkSettings(prev => ({ ...prev, [key]: nv }));
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + tag.length; ta.focus(); }, 0);
    };

    const handleBulkImport = async () => {
        setBulkSyncing(true);
        realtimePausedRef.current = true;
        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('andpad-sync', { body: { from: importFrom, to: importTo } });
            if (fnError) throw fnError;
            if (!result.success) { alert('取得失敗: ' + result.message); setBulkSyncing(false); return; }
            const items = result.data || [];
            if (items.length === 0) { alert('該当データなし'); setBulkSyncing(false); return; }
            const toInsert = [];
            const toUpdate = [];
            for (const item of items) {
                const existing = properties.find(p => p.systemId && item.systemId && p.systemId === item.systemId);
                const cleanItem = { ...item }; delete cleanItem.id; delete cleanItem.createdAt; delete cleanItem.updatedAt;
                if (existing) {
                    toUpdate.push({ ...cleanItem, id: existing.id });
                } else {
                    toInsert.push(cleanItem);
                }
            }
            // バッチinsert（50件ずつ）
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                const { error } = await supabase.from('properties').insert(batch);
                if (error) throw error;
            }
            // バッチupdate（1件ずつだがPromise.allで並列化、10件ずつ）
            for (let i = 0; i < toUpdate.length; i += 10) {
                const batch = toUpdate.slice(i, i + 10);
                const results = await Promise.all(batch.map(item => {
                    const { id, ...data } = item;
                    return supabase.from('properties').update(data).eq('id', id);
                }));
                const err = results.find(r => r.error);
                if (err?.error) throw err.error;
            }
            const newCount = toInsert.length, updateCount = toUpdate.length;
            setIsAndpadModalOpen(false);
            realtimePausedRef.current = false;
            // 同期完了後にデータを1回だけ再取得
            const { data } = await supabase.from('properties').select('*');
            if (data) {
                const processed = data.map(d => {
                    let categoryVal = Array.isArray(d.category) ? (d.category[0] || '新築') : (d.category || '新築');
                    let ohDates = (d.openHouseDates && Array.isArray(d.openHouseDates)) ? d.openHouseDates : (d.openHouseDate ? [d.openHouseDate] : []);
                    return { ...d, category: categoryVal, openHouseDates: ohDates };
                }).sort((a, b) => (a.setupDate || '9999').localeCompare(b.setupDate || '9999'));
                setProperties(processed);
            }
            setBulkSyncing(false);
            showNotification(`取込完了: 新規${newCount}件, 更新${updateCount}件`);
            return;
        } catch (e) {
            console.error(e);
            alert('ANDPAD同期エラー: ' + e.message);
        }
        realtimePausedRef.current = false;
        setBulkSyncing(false);
    };
    const handleClearData = async () => {
        if (!confirm('全物件データを削除しますか？この操作は取り消せません。')) return;
        if (!confirm('本当に全て削除しますか？')) return;
        try {
            const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true });
            const { error } = await supabase.from('properties').delete().gte('createdAt', '1970-01-01');
            if (error) throw error;
            showNotification(`${count}件削除完了`);
        } catch (e) {
            console.error(e);
            alert('削除エラー: ' + e.message);
        }
    };
    const handleSyncCalendar = async () => {
        if (filteredProperties.length === 0) { alert('同期するデータがありません'); return; }
        if (!confirm(`${filteredProperties.length}件の物件をカレンダー同期しますか？`)) return;
        setIsSyncingCalendar(true);
        try {
            const allEvents = [];
            filteredProperties.forEach(p => {
                const evts = generatePropertyEvents(p);
                allEvents.push(...evts);
            });
            if (allEvents.length === 0) { alert('カレンダーイベントがありません'); setIsSyncingCalendar(false); return; }
            const res = await fetch(CALENDAR_GAS_API_URL, { method: 'POST', body: JSON.stringify(allEvents) });
            const r = await res.json();
            if (r.success) {
                if (r.errors && r.errors.length > 0) alert("カレンダー登録中にエラーが発生しました:\n" + r.errors.join("\n"));
                else showNotification(`${allEvents.length}件のイベントを同期しました`);
            } else {
                alert('カレンダー同期失敗: ' + r.message);
            }
        } catch (e) {
            console.error(e);
            alert('カレンダー同期エラー: ' + e.message);
        }
        setIsSyncingCalendar(false);
    };
    const processJsonImport = async () => {
        if (!jsonInput.trim()) { alert('JSONデータを入力してください'); return; }
        try {
            const parsed = JSON.parse(jsonInput);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            if (items.length === 0) { alert('データが空です'); return; }
            let count = 0;
            for (const item of items) {
                const existing = item.systemId ? properties.find(p => p.systemId === item.systemId) : null;
                const cleanItem = { ...item }; delete cleanItem.id; delete cleanItem.createdAt; delete cleanItem.updatedAt;
                if (existing) {
                    const { error } = await supabase.from('properties').update(cleanItem).eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('properties').insert(cleanItem);
                    if (error) throw error;
                }
                count++;
            }
            showNotification(`${count}件インポート完了`);
            setJsonInput('');
            setIsJsonModalOpen(false);
        } catch (e) {
            console.error(e);
            alert('JSONパースエラー: ' + e.message);
        }
    };
    const saveStaff = async (e) => { e.preventDefault(); if(!staffForm.name){alert("氏名必須");return;} const data={name:staffForm.name, email:staffForm.email, department:staffForm.department, roles:staffForm.roles, chatwork_account_id:staffForm.chatwork_account_id||''}; try{ if(staffForm.id){const{error}=await supabase.from('staffs').update(data).eq('id',staffForm.id);if(error)throw error;showNotification('更新完了');}else{const{error}=await supabase.from('staffs').insert(data);if(error)throw error;showNotification('追加完了');} setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''}); }catch(e){alert('保存失敗');} };
    const deleteStaff = async (id) => { if(confirm('削除しますか？')){ const{error}=await supabase.from('staffs').delete().eq('id',id); if(error){alert('削除失敗');return;} showNotification('削除完了'); if(staffForm.id===id)setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''}); } };
    const toggleStaffRole = (r) => setStaffForm(p=>({ ...p, roles: p.roles.includes(r)?p.roles.filter(x=>x!==r):[...p.roles,r] }));

    const handleStaffBulkExport = () => { const header = "氏名\tメールアドレス\t所属事業部\t役割\tチャットワークID"; const rows = staffs.map(s => `${s.name}\t${s.email||''}\t${s.department||''}\t${(s.roles||[]).join(',')}\t${s.chatwork_account_id||''}`); setStaffBulkText([header, ...rows].join('\n')); setStaffBulkMode('export'); setIsStaffBulkModalOpen(true); };
    const handleStaffBulkImport = async () => { if(!staffBulkText) return; const lines = staffBulkText.trim().split('\n'); const rows = []; const startIdx = lines[0].includes('氏名') ? 1 : 0; for(let i=startIdx; i<lines.length; i++) { const cols = lines[i].split('\t'); if(cols.length < 1 || !cols[0]) continue; rows.push({ name: cols[0].trim(), email: cols[1]?cols[1].trim():'', department: cols[2]?cols[2].trim():'', roles: cols[3]?cols[3].split(',').map(r=>r.trim()).filter(r=>r):[], chatwork_account_id: cols[4]?cols[4].trim():'' }); } if(rows.length > 0) { let insertCount=0, updateCount=0, errCount=0; for(const row of rows) { const existing = row.email ? staffs.find(s=>s.email===row.email) : null; try { if(existing) { const{error}=await supabase.from('staffs').update(row).eq('id',existing.id); if(error) throw error; updateCount++; } else { const{error}=await supabase.from('staffs').insert(row); if(error) throw error; insertCount++; } } catch(e){ errCount++; } } const msg = []; if(insertCount) msg.push(`${insertCount}件追加`); if(updateCount) msg.push(`${updateCount}件更新`); if(errCount) msg.push(`${errCount}件失敗`); showNotification(msg.join('、')); setIsStaffBulkModalOpen(false); setStaffBulkText(''); } else { alert("データなし"); } };
    const copyToClipboard = () => { navigator.clipboard.writeText(staffBulkText).then(() => showNotification('コピー完了')); };

    const saveEquipment = async (e) => { e.preventDefault(); if(!equipmentForm.name){alert("名称必須");return;} const data={name:equipmentForm.name, email:equipmentForm.email, type:equipmentForm.type}; try{ if(equipmentForm.id){const{error}=await supabase.from('equipments').update(data).eq('id',equipmentForm.id);if(error)throw error;showNotification('更新完了');}else{const{error}=await supabase.from('equipments').insert(data);if(error)throw error;showNotification('追加完了');} setEquipmentForm({id:'',name:'',email:'',type:'設備'}); }catch(e){alert('保存失敗');} };
    const deleteEquipment = async (id) => { if(confirm('削除しますか？')){ const{error}=await supabase.from('equipments').delete().eq('id',id); if(error){alert('削除失敗');return;} showNotification('削除完了'); if(equipmentForm.id===id)setEquipmentForm({id:'',name:'',email:'',type:'設備'}); } };
    const handleEquipBulkExport = () => { const header = "名称\tID/Email\t種類"; const rows = equipments.map(e => `${e.name}\t${e.email||''}\t${e.type||''}`); setEquipBulkText([header, ...rows].join('\n')); setEquipBulkMode('export'); setIsEquipBulkModalOpen(true); };
    const handleEquipBulkImport = async () => { if(!equipBulkText) return; const lines = equipBulkText.trim().split('\n'); const rows = []; const startIdx = lines[0].includes('名称') ? 1 : 0; for(let i=startIdx; i<lines.length; i++) { const cols = lines[i].split('\t'); if(cols.length < 1 || !cols[0]) continue; rows.push({ name: cols[0].trim(), email: cols[1]?cols[1].trim():'', type: cols[2]?cols[2].trim():'' }); } if(rows.length > 0) { const{error}=await supabase.from('equipments').insert(rows); if(error){alert('取込失敗');return;} showNotification(`${rows.length}件取込完了`); setIsEquipBulkModalOpen(false); setEquipBulkText(''); } else { alert("データなし"); } };
    const copyEquipToClipboard = () => { navigator.clipboard.writeText(equipBulkText).then(() => showNotification('コピー完了')); };

    const openShootingRequestModal = (prop) => { openEditModal(prop); setScrollToRequest(true); };
    const openEditModal = (prop) => {
        setEditingId(prop.id);
        const [sd, st] = (prop.setupDate || '').split('T'); const [td, tt] = (prop.teardownDate || '').split('T'); const [sfd, sft] = (prop.shootingRangeFrom || '').split('T'); const [std, stt] = (prop.shootingRangeTo || '').split('T');
        let hDate = (prop.handoverDate || '').split('T')[0].replace(/\//g, '-');
        let cat = Array.isArray(prop.category) ? (prop.category[0] || '新築') : (prop.category || '新築');
        let editOhDates = prop.openHouseDates && prop.openHouseDates.length > 0 ? [...prop.openHouseDates] : (prop.openHouseDate ? [prop.openHouseDate] : []);
        editOhDates = editOhDates.map(d => (d || '').split('T')[0].replace(/\//g, '-')); if (editOhDates.length === 0) editOhDates = ['', '']; else if (editOhDates.length === 1) editOhDates.push('');

        // 撮影種類の自動設定
        let currentTypes = prop.shootingTypes || [];
        if (currentTypes.length === 0) {
            if (cat === '新築') currentTypes = ['スチール', 'YouTube', 'インスタライブ'];
            else if (cat === 'リフォーム') currentTypes = ['スチール', 'YouTube', 'インスタ通常投稿用', 'インスタ宣伝用'];
        }

        setForm({
            ...prop, category: cat,
            customerName: prop.customerName||'', customerLat: prop.customerLat||'', customerLon: prop.customerLon||'', mainStore: prop.mainStore||'', googleMapUrl: prop.googleMapUrl||'', handoverSource: prop.handoverSource||'', furnitureSetup: prop.furnitureSetup||'なし',
            setupDate_date: sd||'', setupDate_time: st?.substring(0,5)||'', setupEndTime: prop.setupEndTime||'', teardownDate_date: td||'', teardownDate_time: tt?.substring(0,5)||'', teardownEndTime: prop.teardownEndTime||'', setupVehicle: prop.setupVehicle||'', setupVehicle2: prop.setupVehicle2||'', teardownVehicle: prop.teardownVehicle||'', teardownVehicle2: prop.teardownVehicle2||'',
            shootingRange_from_date: sfd||'', shootingRange_from_time: sft?.substring(0,5)||'', shootingRange_to_date: std||'', shootingRange_to_time: stt?.substring(0,5)||'',
            openHouseDates: editOhDates, handoverDate: hDate,
            youtubeDate: (prop.youtubeDate||'').split('T')[0], youtubeStartTime: prop.youtubeStartTime||'', youtubeEndTime: prop.youtubeEndTime||'', youtubeStaff: prop.youtubeStaff||[], youtubeRequested: prop.youtubeRequested||false, youtubeNote: prop.youtubeNote||'',
            photoDate: (prop.photoDate||'').split('T')[0], photoStartTime: prop.photoStartTime||'', photoEndTime: prop.photoEndTime||'', photoStaff: prop.photoStaff||[], photoRequested: prop.photoRequested||false, photoNote: prop.photoNote||'',
            instaLiveDate: (prop.instaLiveDate||'').split('T')[0], instaLiveStartTime: prop.instaLiveStartTime||'', instaLiveEndTime: prop.instaLiveEndTime||'', instaLiveStaff: prop.instaLiveStaff||[], instaLiveRequested: prop.instaLiveRequested||false, instaLiveNote: prop.instaLiveNote||'',
            instaRegularDate: (prop.instaRegularDate||'').split('T')[0], instaRegularStartTime: prop.instaRegularStartTime||'', instaRegularEndTime: prop.instaRegularEndTime||'', instaRegularStaff: prop.instaRegularStaff||[], instaRegularRequested: prop.instaRegularRequested||false, instaRegularNote: prop.instaRegularNote||'',
            instaPromoDate: (prop.instaPromoDate||'').split('T')[0], instaPromoStartTime: prop.instaPromoStartTime||'', instaPromoEndTime: prop.instaPromoEndTime||'', instaPromoStaff: prop.instaPromoStaff||[], instaPromoRequested: prop.instaPromoRequested||false, instaPromoNote: prop.instaPromoNote||'',
            otherDate: (prop.otherDate||'').split('T')[0], otherStartTime: prop.otherStartTime||'', otherEndTime: prop.otherEndTime||'', otherStaff: prop.otherStaff||[], otherRequested: prop.otherRequested||false, otherNote: prop.otherNote||'',
            notificationStaff: prop.notificationStaff||[], requester: prop.requester||'', shootingTypes: currentTypes, parkingInfo: prop.parkingInfo||'', shootingPoints: prop.shootingPoints||'', witnessStaff: prop.witnessStaff||'', ownerPresence: prop.ownerPresence||'', instructionFileUrl: prop.instructionFileUrl||'', instructionFileName: prop.instructionFileName||'', overviewFileUrl: prop.overviewFileUrl||'', overviewFileName: prop.overviewFileName||'', shootingNotes: prop.shootingNotes||'', contractDate: prop.contractDate||'', contractAmount: prop.contractAmount||'', originalUpdatedAt: prop.updatedAt
        });
        setIsModalOpen(true);
    };
    const handleCategoryChange = (cat) => { let newTypes = []; if (cat === '新築') newTypes = ['スチール', 'YouTube', 'インスタライブ']; else if (cat === 'リフォーム') newTypes = ['スチール', 'YouTube', 'インスタ通常投稿用', 'インスタ宣伝用']; setForm(prev => ({ ...prev, category: cat, shootingTypes: newTypes })); };
    const addOpenHouseDate = () => setForm(p => ({...p, openHouseDates: [...p.openHouseDates, '']}));
    const updateOpenHouseDate = (i, v) => { const n = [...form.openHouseDates]; n[i] = v; setForm({...form, openHouseDates: n}); };
    const removeOpenHouseDate = (i) => { setForm(p => ({...p, openHouseDates: p.openHouseDates.filter((_, idx) => idx !== i)})); };
    const resetEventForm = () => setEventForm({ name:'', category:'新築', setupDate_date:'', setupDate_time:'', setupEndTime:'', setupVehicle:'', setupVehicle2:'', teardownDate_date:'', teardownDate_time:'', teardownEndTime:'', teardownVehicle:'', teardownVehicle2:'', eventDates:['',''], notificationStaff:[] });
    const openNewEventModal = () => { setEditingEventId(null); resetEventForm(); setIsEventModalOpen(true); };
    const openEditEventModal = (evt) => {
        setEditingEventId(evt.id);
        const [sd, st] = (evt.setupDate || '').split('T'); const [td, tt] = (evt.teardownDate || '').split('T');
        let eDates = evt.eventDates && evt.eventDates.length > 0 ? [...evt.eventDates] : ['', ''];
        eDates = eDates.map(d => (d || '').split('T')[0].replace(/\//g, '-')); if (eDates.length < 2) eDates.push('');
        setEventForm({ name: evt.name||'', category: evt.category||'新築', setupDate_date: sd||'', setupDate_time: st?.substring(0,5)||'', setupEndTime: evt.setupEndTime||'', setupVehicle: evt.setupVehicle||'', setupVehicle2: evt.setupVehicle2||'', teardownDate_date: td||'', teardownDate_time: tt?.substring(0,5)||'', teardownEndTime: evt.teardownEndTime||'', teardownVehicle: evt.teardownVehicle||'', teardownVehicle2: evt.teardownVehicle2||'', eventDates: eDates, notificationStaff: evt.notificationStaff||[] });
        setIsEventModalOpen(true);
    };
    const saveEvent = async (e) => {
        e.preventDefault(); if(!eventForm.name){alert("イベント名必須");return;}
        const setup = eventForm.setupDate_date ? `${eventForm.setupDate_date}T${eventForm.setupDate_time || '00:00'}` : '';
        const teardown = eventForm.teardownDate_date ? `${eventForm.teardownDate_date}T${eventForm.teardownDate_time || '00:00'}` : '';
        const validDates = eventForm.eventDates.filter(d => d);
        const data = { name: eventForm.name, category: eventForm.category, setupDate: setup, setupEndTime: eventForm.setupEndTime, setupVehicle: eventForm.setupVehicle, setupVehicle2: eventForm.setupVehicle2, teardownDate: teardown, teardownEndTime: eventForm.teardownEndTime, teardownVehicle: eventForm.teardownVehicle, teardownVehicle2: eventForm.teardownVehicle2, eventDates: validDates, notificationStaff: eventForm.notificationStaff, updatedAt: new Date().toISOString() };
        try { if(editingEventId) { const{error}=await supabase.from('events').update(data).eq('id',editingEventId); if(error) throw error; } else { const{error}=await supabase.from('events').insert(data); if(error) throw error; } setIsEventModalOpen(false); showNotification('イベント保存完了'); } catch(err) { alert('保存失敗: '+err.message); }
    };
    const deleteEvent = async (id) => { if(!confirm('イベントを削除しますか？')) return; const{error}=await supabase.from('events').delete().eq('id',id); if(error){alert('削除失敗');return;} showNotification('イベント削除完了'); if(editingEventId===id) setIsEventModalOpen(false); };
    const addEventDate = () => setEventForm(p => ({...p, eventDates: [...p.eventDates, '']}));
    const updateEventDate = (i, v) => { const n = [...eventForm.eventDates]; n[i] = v; setEventForm({...eventForm, eventDates: n}); };
    const removeEventDate = (i) => { setEventForm(p => ({...p, eventDates: p.eventDates.filter((_, idx) => idx !== i)})); };
    const openRequestModal = () => { setIsRequestModalOpen(true); setReqSearch({keyword:'', category:'', staff:'', contractFrom:'', contractTo:'', handoverFrom:'', handoverTo:''}); };
    const selectPropertyForRequest = (p) => { openEditModal(p); setScrollToRequest(true); setIsRequestModalOpen(false); };
    const saveProperty = async (e) => {
        e.preventDefault(); const setup = form.setupDate_date ? `${form.setupDate_date}T${form.setupDate_time || '00:00'}` : ''; const teardown = form.teardownDate_date ? `${form.teardownDate_date}T${form.teardownDate_time || '00:00'}` : ''; const sFrom = form.shootingRange_from_date ? `${form.shootingRange_from_date}T${form.shootingRange_from_time || '00:00'}` : ''; const sTo = form.shootingRange_to_date ? `${form.shootingRange_to_date}T${form.shootingRange_to_time || '00:00'}` : ''; const validOh = form.openHouseDates.filter(d => d);
        const buildMediaDate = (d, t) => d ? (t ? `${d}T${t}:00` : d) : '';
        const data = { ...form, setupDate: setup, teardownDate: teardown, shootingRangeFrom: sFrom, shootingRangeTo: sTo, openHouseDates: validOh, openHouseDate: validOh[0]||'', youtubeDate: buildMediaDate(form.youtubeDate, form.youtubeStartTime), photoDate: buildMediaDate(form.photoDate, form.photoStartTime), exteriorPhotoDate: buildMediaDate(form.exteriorPhotoDate, form.exteriorPhotoStartTime), instaLiveDate: buildMediaDate(form.instaLiveDate, form.instaLiveStartTime), instaRegularDate: buildMediaDate(form.instaRegularDate, form.instaRegularStartTime), instaPromoDate: buildMediaDate(form.instaPromoDate, form.instaPromoStartTime), otherDate: buildMediaDate(form.otherDate, form.otherStartTime) };
        delete data.setupDate_date; delete data.setupDate_time; delete data.teardownDate_date; delete data.teardownDate_time; delete data.shootingRange_from_date; delete data.shootingRange_from_time; delete data.shootingRange_to_date; delete data.shootingRange_to_time;
        delete data.id; delete data.createdAt; delete data.updatedAt; delete data.originalUpdatedAt;
        try {
            let tid = editingId;
            if(editingId) { const { data: result, error } = await supabase.from('properties').update(data).eq('id', editingId).eq('updatedAt', form.originalUpdatedAt).select(); if(error) throw error.message; if(!result || result.length === 0) throw "他者が更新しました"; }
            else { const { data: result, error } = await supabase.from('properties').insert(data).select(); if(error) throw error.message; tid = result[0].id; }
            const oldProp = editingId ? properties.find(x=>x.id===editingId) : null;
            const isNew = !editingId;
            setIsModalOpen(false); showNotification('保存完了'); autoSyncCalendar({...data, id: tid}, oldProp); sendChatworkNotification({...data, id: tid}, isNew);
        } catch(err) { alert(typeof err==='string'?err:err.message); }
    };
    const clearPropertySchedule = async (id) => {
        if(!confirm('スケジュール情報を削除しますか？'))return;
        try {
            const up={setupDate:'',teardownDate:'',setupEndTime:'',teardownEndTime:'',setupVehicle:'',setupVehicle2:'',teardownVehicle:'',teardownVehicle2:'',shootingRangeFrom:'',shootingRangeTo:'',openHouseDate:'',openHouseDates:[],youtubeDate:'',youtubeStartTime:'',youtubeEndTime:'',youtubeStaff:[],youtubeRequested:false,youtubeNote:'',photoDate:'',photoStartTime:'',photoEndTime:'',photoStaff:[],photoRequested:false,photoNote:'',instaLiveDate:'',instaLiveStartTime:'',instaLiveEndTime:'',instaLiveStaff:[],instaLiveRequested:false,instaLiveNote:'',instaRegularDate:'',instaRegularStartTime:'',instaRegularEndTime:'',instaRegularStaff:[],instaRegularRequested:false,instaRegularNote:'',instaPromoDate:'',instaPromoStartTime:'',instaPromoEndTime:'',instaPromoStaff:[],instaPromoRequested:false,instaPromoNote:'',otherDate:'',otherStartTime:'',otherEndTime:'',otherStaff:[],otherRequested:false,otherNote:'',notificationStaff:[],furnitureSetup:'なし',requester:'',shootingTypes:[],parkingInfo:'',shootingPoints:'',witnessStaff:'',ownerPresence:'',instructionFileUrl:'',instructionFileName:'',overviewFileUrl:'',overviewFileName:'',shootingNotes:''};
            const { error } = await supabase.from('properties').update(up).eq('id', id); if(error) throw error.message;
            showNotification('クリア完了'); if(editingId===id)setIsModalOpen(false);
            const p = properties.find(x=>x.id===id); if(p) autoSyncCalendar({...p, ...up}, p);
        } catch(e){ alert('失敗:'+e.message); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>;

    return (
        <div className="min-h-screen pb-20">
            {/* Header, Main Content same as before */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3"><svg width="38" height="38" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="6" fill="#C5A070"/><rect y="14.5" width="40" height="3" fill="white"/><circle cx="20" cy="20" r="11" fill="white"/><circle cx="20" cy="20" r="7.5" fill="#C5A070"/><circle cx="20" cy="20" r="4" fill="white"/><circle cx="20" cy="20" r="2" fill="white"/><circle cx="31" cy="8" r="2.8" fill="white"/></svg><div><h1 className="text-lg font-bold tracking-tight text-primary leading-none">シューログ 現場撮影管理</h1><p className="text-xs text-gray-400 font-medium tracking-wider">SUNPRO SHOOT LOG</p></div></div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 mr-2">
                            <button onClick={()=>setIsAndpadModalOpen(true)} disabled={bulkSyncing} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-50" title="ANDPAD取込"><Icon name="cloud-download" size={20} /></button>
                            <button onClick={()=>{setJsonInput('');setIsJsonModalOpen(true);}} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors" title="JSON取込"><Icon name="file-code" size={20} /></button>
                            <button onClick={()=>{setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''});setIsStaffModalOpen(true);}} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors" title="スタッフ管理"><Icon name="users" size={20} /></button>
                            <button onClick={()=>{setEquipmentForm({id:'',name:'',email:'',type:'設備'});setIsEquipmentModalOpen(true);}} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors" title="設備管理"><Icon name="package" size={20} /></button>
                            <button onClick={handleSyncCalendar} disabled={isSyncingCalendar} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-50" title="Googleカレンダー同期">{isSyncingCalendar?<span className="animate-spin">⌛</span>:<Icon name="calendar-days" size={20} />}</button>
                            <button onClick={()=>setIsSettingsModalOpen(true)} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-full transition-colors" title="チャットワーク設定"><Icon name="message-square" size={20} /></button>
                            <button onClick={handleClearData} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors" title="全データ削除"><Icon name="trash" size={20} /></button>
                        </div>
                        <button onClick={openNewEventModal} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"><Icon name="calendar-plus" size={16} className="text-purple-500" /> イベント追加</button>
                        <button onClick={openRequestModal} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"><Icon name="camera" size={16} className="text-accent" /> 撮影依頼</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-1 mb-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"><span className="text-sm font-bold text-gray-500">設営日:</span><Icon name="calendar-days" size={18} className="text-gray-400" /><input type="month" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="bg-transparent text-sm font-semibold outline-none text-gray-700 w-28" /><span className="text-gray-300">→</span><input type="month" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="bg-transparent text-sm font-semibold outline-none text-gray-700 w-28" /></div>
                            <div className="flex gap-1">{[0, 1, 2].map(o => (<button key={o} onClick={() => setQuickFilter(o)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">{o === 0 ? '今月' : o === 1 ? '来月' : '再来月'}</button>))}<button onClick={setFourMonthsFilter} className="px-3 py-1.5 rounded-lg text-sm font-bold text-accent bg-accent/10 hover:bg-accent/20 transition-colors">4ヶ月分</button></div>
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            <div className="flex bg-gray-100/50 p-1 rounded-xl">{['list', 'calendar'].map(m => (<button key={m} onClick={() => setViewMode(m)} className={`p-2 rounded-lg transition-all ${viewMode === m ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Icon name={m === 'list' ? 'list' : 'calendar'} size={20} /></button>))}</div>
                            <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${isFilterExpanded ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}><Icon name="list-filter" size={16} /> フィルター</button>
                        </div>
                    </div>
                    {isFilterExpanded && (
                        <div className="border-t border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-enter">
                            <div className="space-y-2"><label className="text-sm font-bold text-gray-400 uppercase tracking-wider">事業部</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><button key={c} onClick={()=>toggleFilterCategory(c)} className={`px-3 py-1.5 rounded-full text-sm font-bold border ${selectedCategories.includes(c)?'bg-primary text-white border-primary':'bg-white text-gray-500'}`}>{c}</button>)}</div></div>
                            <div className="space-y-2"><label className="text-sm font-bold text-gray-400 uppercase tracking-wider">支店</label><div className="flex flex-wrap gap-2">{BRANCHES.map(b=><button key={b} onClick={()=>toggleFilterBranch(b)} className={`px-3 py-1.5 rounded-full text-sm font-bold border ${selectedBranches.includes(b)?'bg-accent text-white border-accent':'bg-white text-gray-500'}`}>{BRANCH_LABELS[b]}</button>)}</div></div>
                            <div className="space-y-2"><label className="text-sm font-bold text-gray-400 uppercase tracking-wider">キーワード</label><div className="relative"><Icon name="search" size={18} className="absolute left-3 top-3 text-gray-300" /><input type="text" value={searchKeyword} onChange={e=>setSearchKeyword(e.target.value)} placeholder="物件名, 担当者..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none"/></div></div>
                        </div>
                    )}
                </div>

                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase font-bold tracking-wider"><th className="px-6 py-4 w-40">ステータス</th><th className="px-6 py-4">物件情報</th><th className="px-6 py-4">スケジュール</th><th className="px-6 py-4">メディア</th><th className="px-6 py-4 text-center w-40">操作</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {groupedProperties.map(group => (
                                        <React.Fragment key={group.title}>
                                            <tr className="bg-primary border-b-2 border-gray-300">
                                                <td colSpan="5" className="px-0">
                                                    <div className="px-6 py-2 text-sm font-bold text-white flex items-center gap-2">
                                                        <Icon name="calendar" size={16} /> {group.title}
                                                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs">全 {group.items.length} 件</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {group.items.map(prop => {
                                                const branch = getAreaBranch(prop.address);
                                                const scheduleItems = [
                                                    { type: 'setup', date: prop.setupDate, label: '設営', color: 'text-blue-500' },
                                                    { type: 'teardown', date: prop.teardownDate, label: '撤収', color: 'text-orange-500' },
                                                    ...(prop.openHouseDates && prop.openHouseDates.length > 0 ? prop.openHouseDates : (prop.openHouseDate ? [prop.openHouseDate] : [])).map(d => ({ type: 'openhouse', date: d, label: '見学会', color: 'text-purple-600' })),
                                                    { type: 'handover', date: prop.handoverDate, label: '引渡', color: 'text-emerald-600', extra: prop.handoverSource },
                                                    ...(prop.shootingRangeFrom ? [{ type: 'shooting', date: prop.shootingRangeFrom, label: '撮影期間', color: 'text-amber-600', isRange: true, to: prop.shootingRangeTo }] : [])
                                                ].filter(i => i.date).sort((a,b) => new Date(a.date) - new Date(b.date));

                                                return (
                                                    <tr key={prop.id} className="hover:bg-yellow-50 transition-colors border-b-2 border-gray-300">
                                                        <td className="px-6 py-4 align-top w-40"><div className="flex flex-col gap-1.5 items-start"><span className="px-2 py-0.5 rounded text-sm font-bold bg-gray-100 text-gray-600 border border-gray-200">{prop.category}</span>{branch && <span className={`px-2 py-0.5 rounded text-sm font-bold border ${branch.class}`}>{branch.name}</span>}</div></td>
                                                        <td className="px-6 py-4 align-top max-w-xs">
                                                            <div className="font-bold text-sm text-gray-900 mb-0.5">{prop.customerName ? <>{prop.customerName}<span className="text-xs font-normal ml-1 text-gray-600">様</span></> : <span className="text-gray-400 font-normal">顧客名未設定</span>}</div>
                                                            <div className="text-xs text-gray-500 font-medium mb-1">{prop.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1 mb-2"><Icon name="map-pin" size={14}/> {prop.address}</div>
                                                            <div className="flex flex-wrap gap-2 text-sm text-gray-400 font-medium">{prop.salesRep && <span>営:{formatRepName(prop.salesRep)}</span>}{prop.icRep && <span>IC:{formatRepName(prop.icRep)}</span>}</div>
                                                        </td>
                                                        <td className="px-6 py-4 align-top">
                                                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-start">
                                                                {scheduleItems.map((item, idx) => (
                                                                    <React.Fragment key={idx}>
                                                                        <span className={`font-bold ${item.color} pt-0.5`}>{item.label}</span>
                                                                        {item.isRange ? (
                                                                            <div className="flex flex-col text-gray-700 font-medium">
                                                                                <span>{formatDateTime(item.date)}</span>
                                                                                <span className="text-gray-300 text-xs leading-none py-0.5">▼</span>
                                                                                <span>{formatDateTime(item.to)}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-medium text-gray-700">
                                                                                {item.type === 'openhouse' || item.type === 'handover' ? formatDate(item.date) : formatDateTime(item.date)}
                                                                                {item.extra && <span className="text-sm text-emerald-400 ml-1">({item.extra})</span>}
                                                                            </span>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 align-top">
                                                            <div className="space-y-1">
                                                                {[{l:'YouTube', d:prop.youtubeDate, s:prop.youtubeStartTime, e:prop.youtubeEndTime, r:prop.youtubeRequested},{l:'スチール', d:prop.photoDate, s:prop.photoStartTime, e:prop.photoEndTime, r:prop.photoRequested},{l:'インスタ', d:prop.instaLiveDate, s:prop.instaLiveStartTime, e:prop.instaLiveEndTime, r:prop.instaLiveRequested}].filter(x=>x.d).map(m=>(
                                                                    <div key={m.l} className="flex items-center gap-2 text-sm"><span className="w-16 font-bold text-gray-400 text-sm">{m.l}</span><span className="font-bold text-gray-700">{formatDate(m.d)}{(m.s || m.e) && <span className="ml-1 text-sm text-gray-400 font-normal">({m.s}~{m.e})</span>}</span>{m.r && <span className="w-2 h-2 rounded-full bg-accent"></span>}</div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 align-top text-center w-40">
                                                            <div className="flex justify-center gap-2 mb-2"><button onClick={() => openShootingRequestModal(prop)} className="text-gray-400 hover:text-accent transition-colors"><Icon name="camera" size={20} /></button><button onClick={() => openEditModal(prop)} className="text-gray-400 hover:text-primary transition-colors"><Icon name="pencil" size={20} /></button><button onClick={() => clearPropertySchedule(prop.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Icon name="trash-2" size={20} /></button></div>
                                                            {prop.googleMapUrl && <a href={prop.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 mb-2 bg-blue-50 w-full"><Icon name="map-pin" size={12}/> GOOGLE MAP</a>}
                                                            {prop.systemId && <a href={`https://andpad.jp/manager/my/orders/${prop.systemId}`} target="_blank" className="flex items-center justify-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 bg-red-50 w-full"><Icon name="hard-hat" size={12}/> ANDPAD</a>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'calendar' && (
                    <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h2 className="text-xl font-bold text-primary">カレンダー (4ヶ月表示)</h2>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {[{ id: 'setup_teardown', label: '設営・撤収', color: 'text-blue-600 border-blue-200 bg-blue-50' }, { id: 'openhouse', label: '見学会', color: 'text-purple-600 border-purple-200 bg-purple-50' }, { id: 'media', label: '撮影・配信', color: 'text-pink-600 border-pink-200 bg-pink-50' }, { id: 'handover', label: '引渡', color: 'text-emerald-600 border-emerald-200 bg-emerald-50' }, { id: 'event', label: 'イベント', color: 'text-teal-600 border-teal-200 bg-teal-50' }].map(type => {
                                    let isActive = false;
                                    if (type.id === 'setup_teardown') isActive = visibleEventTypes.includes('setup') || visibleEventTypes.includes('teardown');
                                    else if (type.id === 'media') isActive = visibleEventTypes.includes('youtube') || visibleEventTypes.includes('photo') || visibleEventTypes.includes('instalive');
                                    else if (type.id === 'event') isActive = visibleEventTypes.includes('event_setup') || visibleEventTypes.includes('event_teardown') || visibleEventTypes.includes('event_date');
                                    else isActive = visibleEventTypes.includes(type.id);
                                    return <button key={type.id} onClick={() => toggleEventType(type.id)} className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${isActive ? `${type.color} shadow-sm` : 'bg-white text-gray-300 border-gray-100'}`}>{type.label}</button>;
                                })}
                            </div>
                            <div className="flex gap-1 bg-gray-50 p-1 rounded-lg"><button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))} className="p-1.5 hover:bg-white rounded-md transition-all shadow-sm"><Icon name="chevron-left" size={18}/></button><button onClick={() => setCurrentCalendarDate(new Date())} className="px-3 text-sm font-bold hover:bg-white rounded-md transition-all shadow-sm">今日</button><button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))} className="p-1.5 hover:bg-white rounded-md transition-all shadow-sm"><Icon name="chevron-right" size={18}/></button></div>
                        </div>
                        <div className="space-y-8">
                            {calendarMonths.map((monthData, mIdx) => (
                                <div key={mIdx}>
                                    <h3 className="text-lg font-bold text-gray-700 mb-2 pl-2 border-l-4 border-accent">{monthData.year}年 {monthData.month + 1}月</h3>
                                    <div className="grid grid-cols-7 border-b border-gray-100 mb-2">{['日','月','火','水','木','金','土'].map((d,i) => <div key={i} className={`text-center py-2 text-sm font-bold ${i===0?'text-red-400':i===6?'text-blue-400':'text-gray-400'}`}>{d}</div>)}</div>
                                    <div className="grid grid-cols-7 gap-1">{monthData.days.map((day, i) => (<div key={i} className={`min-h-[60px] p-2 rounded-lg border ${day.isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50/50 border-transparent text-gray-300'}`}><div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${day.isToday ? 'bg-accent text-white' : ''}`}>{day.date.getDate()}</div><div className="space-y-1">{calendarEvents[day.ymd] && calendarEvents[day.ymd].map((evt, idx) => (<button key={idx} onClick={() => evt.eventData ? openEditEventModal(evt.eventData) : openEditModal(evt.prop)} className={`w-full text-left text-xs px-1.5 py-1 rounded border truncate font-bold hover:opacity-80 transition-opacity ${evt.colorClass}`}>{evt.title}</button>))}</div></div>))}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal: Property Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-enter">
                    <div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex flex-col"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{editingId ? '物件情報' : '新規登録'}</h2><div className="text-xl font-bold text-primary">{form.customerName || '顧客名未設定'}</div></div>
                        <div className="flex items-center gap-3">{form.googleMapUrl && <a href={form.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-bold text-xs" title="Google Map"><Icon name="map-pin" size={16}/> Google Map</a>}{form.systemId && <a href={`https://andpad.jp/manager/my/orders/${form.systemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-bold text-xs" title="ANDPAD"><Icon name="hard-hat" size={16}/> ANDPAD</a>}<button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"><Icon name="x" size={24}/></button></div>
                    </div>
                    <div className="p-8 space-y-8"><form onSubmit={saveProperty} className="space-y-8">
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">基本情報</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">顧客名</label><input type="text" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">物件名*</label><input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div><label className="block text-sm font-bold text-gray-500 mb-1">住所</label><input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div></div><div><label className="block text-sm font-bold text-gray-500 mb-1">GoogleMapURL</label><input type="text" value={form.googleMapUrl} onChange={e => setForm({...form, googleMapUrl: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-bold text-gray-500 mb-2">事業部</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><button key={c} type="button" onClick={()=>handleCategoryChange(c)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${form.category===c?'bg-primary text-white':'bg-white text-gray-500'}`}>{c}</button>)}</div></div><div className="flex-1"><label className="block text-sm font-bold text-gray-500 mb-2">家具設営</label><div className="flex flex-wrap gap-2">{['あり','なし'].map(o=><button key={o} type="button" onClick={()=>setForm({...form,furnitureSetup:o})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${form.furnitureSetup===o?'bg-accent text-white':'bg-white text-gray-500'}`}>{o}</button>)}</div></div></div></div></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">スケジュール</h3><div className="space-y-6"><div><label className="text-sm font-bold text-blue-600 mb-1 block">設営</label><div className="flex gap-2 items-center"><input type="date" value={form.setupDate_date} onChange={e=>setForm({...form,setupDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={form.setupDate_time} onChange={e=>setForm({...form,setupDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={form.setupEndTime} onChange={e=>setForm({...form,setupEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={form.setupVehicle} onChange={e=>setForm({...form,setupVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={form.setupVehicle2} onChange={e=>setForm({...form,setupVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div><label className="text-sm font-bold text-orange-600 mb-1 block">撤収</label><div className="flex gap-2 items-center"><input type="date" value={form.teardownDate_date} onChange={e=>setForm({...form,teardownDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={form.teardownDate_time} onChange={e=>setForm({...form,teardownDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={form.teardownEndTime} onChange={e=>setForm({...form,teardownEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={form.teardownVehicle} onChange={e=>setForm({...form,teardownVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={form.teardownVehicle2} onChange={e=>setForm({...form,teardownVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div className="border-t border-dashed pt-4"><label className="text-sm font-bold text-purple-600 mb-1 block">見学会</label>{form.openHouseDates.map((d,i)=>(<div key={i} className="flex gap-2 mt-1"><input type="date" value={d} onChange={e=>updateOpenHouseDate(i,e.target.value)} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/>{form.openHouseDates.length>1&&<button type="button" onClick={()=>removeOpenHouseDate(i)} className="text-red-500"><Icon name="trash-2" size={18}/></button>}</div>))}<button type="button" onClick={addOpenHouseDate} className="text-sm text-purple-500 mt-1">+ 追加</button></div><div><label className="text-sm font-bold text-emerald-600 mb-1 block">引渡日</label><input type="date" value={form.handoverDate} onChange={e=>setForm({...form,handoverDate:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/></div></div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">撮影依頼</h3><div className="space-y-6"><div><label className="text-sm font-bold text-gray-500 mb-1 block">依頼者</label><select value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影種類</label><div className="flex flex-wrap gap-2">{SHOOTING_TYPES.map(t=><button type="button" key={t} onClick={()=>{const n=form.shootingTypes.includes(t)?form.shootingTypes.filter(x=>x!==t):[...form.shootingTypes,t];setForm({...form,shootingTypes:n})}} className={`px-3 py-2 border rounded-lg ${form.shootingTypes.includes(t)?'bg-accent text-white':'bg-gray-50'}`}>{t}</button>)}</div></div><div><label className="text-sm font-bold text-accent mb-1 block">撮影可能期間</label><div className="flex gap-2 items-center"><input type="date" value={form.shootingRange_from_date} onChange={e=>setForm({...form,shootingRange_from_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={form.shootingRange_from_time} onChange={e=>setForm({...form,shootingRange_from_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span>~</span><input type="date" value={form.shootingRange_to_date} onChange={e=>setForm({...form,shootingRange_to_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={form.shootingRange_to_time} onChange={e=>setForm({...form,shootingRange_to_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FileUpload label="撮影指示書 (PDF)" fileUrl={form.instructionFileUrl} fileName={form.instructionFileName} onFileChange={(url, name) => setForm({...form, instructionFileUrl: url, instructionFileName: name})} /><FileUpload label="イベント物件概要書 (PDF)" fileUrl={form.overviewFileUrl} fileName={form.overviewFileName} onFileChange={(url, name) => setForm({...form, overviewFileUrl: url, overviewFileName: name})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-bold text-gray-500 mb-1 block">立ち合い</label><select value={form.witnessStaff} onChange={e=>setForm({...form,witnessStaff:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option><option value="なし">なし</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">施主在宅</label><div className="flex gap-2">{['あり','なし'].map(o=><button key={o} type="button" onClick={()=>setForm({...form,ownerPresence:o})} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${form.ownerPresence===o?'bg-accent text-white border-accent':'bg-white text-gray-500 border-gray-200'}`}>{o}</button>)}</div></div></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影の注意事項など</label><textarea value={form.shootingNotes} onChange={e=>setForm({...form,shootingNotes:e.target.value})} rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm" placeholder="撮影時の注意点やメモを入力"/></div></div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">撮影日程</h3><div className="space-y-4">{form.shootingTypes.includes('YouTube') && <TagInput label="YouTube撮影" dateValue={form.youtubeDate} onDateChange={e=>setForm({...form,youtubeDate:e.target.value})} startTimeValue={form.youtubeStartTime} onStartTimeChange={e=>setForm({...form,youtubeStartTime:e.target.value})} endTimeValue={form.youtubeEndTime} onEndTimeChange={e=>setForm({...form,youtubeEndTime:e.target.value})} isRequested={form.youtubeRequested} onRequestedChange={v=>setForm({...form,youtubeRequested:v})} tags={form.youtubeStaff} onTagsChange={v=>setForm({...form,youtubeStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.youtubeNote} onNoteChange={e=>setForm({...form,youtubeNote:e.target.value})} />}{form.shootingTypes.includes('スチール') && <TagInput label="スチール撮影" dateValue={form.photoDate} onDateChange={e=>setForm({...form,photoDate:e.target.value})} startTimeValue={form.photoStartTime} onStartTimeChange={e=>setForm({...form,photoStartTime:e.target.value})} endTimeValue={form.photoEndTime} onEndTimeChange={e=>setForm({...form,photoEndTime:e.target.value})} isRequested={form.photoRequested} onRequestedChange={v=>setForm({...form,photoRequested:v})} tags={form.photoStaff} onTagsChange={v=>setForm({...form,photoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.photoNote} onNoteChange={e=>setForm({...form,photoNote:e.target.value})} />}{form.shootingTypes.includes('外観スチール') && <TagInput label="外観スチール撮影" dateValue={form.exteriorPhotoDate} onDateChange={e=>setForm({...form,exteriorPhotoDate:e.target.value})} startTimeValue={form.exteriorPhotoStartTime} onStartTimeChange={e=>setForm({...form,exteriorPhotoStartTime:e.target.value})} endTimeValue={form.exteriorPhotoEndTime} onEndTimeChange={e=>setForm({...form,exteriorPhotoEndTime:e.target.value})} isRequested={form.exteriorPhotoRequested} onRequestedChange={v=>setForm({...form,exteriorPhotoRequested:v})} tags={form.exteriorPhotoStaff} onTagsChange={v=>setForm({...form,exteriorPhotoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.exteriorPhotoNote} onNoteChange={e=>setForm({...form,exteriorPhotoNote:e.target.value})} />}{form.shootingTypes.includes('インスタライブ') && <TagInput label="インスタライブ撮影" dateValue={form.instaLiveDate} onDateChange={e=>setForm({...form,instaLiveDate:e.target.value})} startTimeValue={form.instaLiveStartTime} onStartTimeChange={e=>setForm({...form,instaLiveStartTime:e.target.value})} endTimeValue={form.instaLiveEndTime} onEndTimeChange={e=>setForm({...form,instaLiveEndTime:e.target.value})} isRequested={form.instaLiveRequested} onRequestedChange={v=>setForm({...form,instaLiveRequested:v})} tags={form.instaLiveStaff} onTagsChange={v=>setForm({...form,instaLiveStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaLiveNote} onNoteChange={e=>setForm({...form,instaLiveNote:e.target.value})} />}{form.shootingTypes.includes('インスタ通常投稿用') && <TagInput label="インスタ通常投稿撮影" dateValue={form.instaRegularDate} onDateChange={e=>setForm({...form,instaRegularDate:e.target.value})} startTimeValue={form.instaRegularStartTime} onStartTimeChange={e=>setForm({...form,instaRegularStartTime:e.target.value})} endTimeValue={form.instaRegularEndTime} onEndTimeChange={e=>setForm({...form,instaRegularEndTime:e.target.value})} isRequested={form.instaRegularRequested} onRequestedChange={v=>setForm({...form,instaRegularRequested:v})} tags={form.instaRegularStaff} onTagsChange={v=>setForm({...form,instaRegularStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaRegularNote} onNoteChange={e=>setForm({...form,instaRegularNote:e.target.value})} />}{form.shootingTypes.includes('インスタ宣伝用') && <TagInput label="インスタ宣伝撮影" dateValue={form.instaPromoDate} onDateChange={e=>setForm({...form,instaPromoDate:e.target.value})} startTimeValue={form.instaPromoStartTime} onStartTimeChange={e=>setForm({...form,instaPromoStartTime:e.target.value})} endTimeValue={form.instaPromoEndTime} onEndTimeChange={e=>setForm({...form,instaPromoEndTime:e.target.value})} isRequested={form.instaPromoRequested} onRequestedChange={v=>setForm({...form,instaPromoRequested:v})} tags={form.instaPromoStaff} onTagsChange={v=>setForm({...form,instaPromoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaPromoNote} onNoteChange={e=>setForm({...form,instaPromoNote:e.target.value})} />}{form.shootingTypes.includes('その他') && <TagInput label="その他撮影" dateValue={form.otherDate} onDateChange={e=>setForm({...form,otherDate:e.target.value})} startTimeValue={form.otherStartTime} onStartTimeChange={e=>setForm({...form,otherStartTime:e.target.value})} endTimeValue={form.otherEndTime} onEndTimeChange={e=>setForm({...form,otherEndTime:e.target.value})} isRequested={form.otherRequested} onRequestedChange={v=>setForm({...form,otherRequested:v})} tags={form.otherStaff} onTagsChange={v=>setForm({...form,otherStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.otherNote} onNoteChange={e=>setForm({...form,otherNote:e.target.value})} />}</div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">通知</h3><StaffOnlyInput label="通知スタッフ" tags={form.notificationStaff} onTagsChange={v=>setForm({...form,notificationStaff:v})} suggestions={staffSuggestions} /></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">ANDPAD連携</h3><div className="grid grid-cols-2 gap-4">{Object.keys(ANDPAD_LABELS).map(key=><div key={key}><label className="block text-sm font-bold text-gray-400 uppercase mb-1">{ANDPAD_LABELS[key]}</label><input type="text" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div>)}</div></section>
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-4">{editingId && <button type="button" onClick={()=>clearPropertySchedule(editingId)} className="px-6 py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50">削除</button>}<button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50">キャンセル</button><button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-gray-800">保存する</button></div>
                        </form></div>
                    </div>
                </div>
            )}

            {/* Staff Modal */}
            {isStaffModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsStaffModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden relative animate-enter"><div className="w-full md:w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-4 border-b bg-white sticky top-0 z-10 flex flex-col gap-3"><div className="flex justify-between items-center"><h3 className="font-bold text-primary">スタッフ一覧</h3><div className="flex gap-2"><button onClick={handleStaffBulkExport} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">書出</button><button onClick={()=>{setStaffBulkMode('import');setStaffBulkText('');setIsStaffBulkModalOpen(true);}} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">取込</button><button onClick={()=>setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''})} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-gray-800">新規</button></div></div><select value={staffFilterDept} onChange={e=>setStaffFilterDept(e.target.value)} className="w-full border rounded p-1 text-sm"><option value="">全部署</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="overflow-y-auto flex-1 p-2 space-y-2">{staffs.filter(s=>!staffFilterDept||s.department===staffFilterDept).map(s=>(<div key={s.id} onClick={()=>setStaffForm({...s,chatwork_account_id:s.chatwork_account_id||''})} className={`p-3 rounded-xl cursor-pointer border ${staffForm.id===s.id?'bg-white border-accent':'bg-white border-transparent'}`}><div><div className="font-bold text-sm">{s.name} <span className="text-xs font-normal text-gray-400 ml-1">{s.department}</span>{s.chatwork_account_id && <span className="text-xs font-normal text-blue-500 ml-1">CW</span>}</div><div className="text-sm text-gray-400">{s.email}</div></div></div>))}</div></div><div className="w-full md:w-1/2 p-6 overflow-y-auto bg-white"><div className="flex justify-between mb-6"><h3 className="font-bold text-lg">編集</h3><button onClick={()=>setIsStaffModalOpen(false)}><Icon name="x" size={20}/></button></div><form onSubmit={saveStaff} className="space-y-5"><div><label className="block text-sm font-bold text-gray-500">氏名</label><input type="text" value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">メールアドレス</label><input type="text" value={staffForm.email} onChange={e=>setStaffForm({...staffForm,email:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">チャットワークID</label><input type="text" value={staffForm.chatwork_account_id} onChange={e=>setStaffForm({...staffForm,chatwork_account_id:e.target.value})} className="w-full border rounded px-2 py-2" placeholder="例: 1234567"/></div><div><label className="block text-sm font-bold text-gray-500">所属事業部</label><select value={staffForm.department} onChange={e=>setStaffForm({...staffForm,department:e.target.value})} className="w-full border rounded px-2 py-2"><option value="">未設定</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div><label className="block text-sm font-bold text-gray-500">役割</label><div className="grid grid-cols-2 gap-2">{STAFF_ROLES.map(r=><button type="button" key={r} onClick={()=>toggleStaffRole(r)} className={`px-2 py-1 border rounded text-sm ${staffForm.roles.includes(r)?'bg-accent text-white':'bg-gray-50'}`}>{r}</button>)}</div></div><div className="flex gap-3 pt-6 border-t">{staffForm.id&&<button type="button" onClick={()=>deleteStaff(staffForm.id)} className="px-4 py-2 border text-red-500 rounded">削除</button>}<button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded">保存</button></div></form></div></div></div>)}
            {isStaffBulkModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsStaffBulkModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-enter"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{staffBulkMode==='import'?'スタッフ一括取込':'スタッフ一括書出'}</h3><button onClick={()=>setIsStaffBulkModalOpen(false)}><Icon name="x" size={20}/></button></div><textarea value={staffBulkText} onChange={e=>setStaffBulkText(e.target.value)} readOnly={staffBulkMode==='export'} className="w-full h-64 border rounded p-2 mb-4 font-mono text-xs" placeholder={staffBulkMode==='import'?'氏名\tメールアドレス\t所属事業部\t役割\n山田太郎\ttaro@example.com\t新築\t営業,広報':''} /><div className="flex gap-4">{staffBulkMode==='export'?<button onClick={copyToClipboard} className="flex-1 py-2 bg-accent text-white rounded">クリップボードにコピー</button>:<button onClick={handleStaffBulkImport} className="flex-1 py-2 bg-primary text-white rounded">取り込む</button>}</div></div></div>)}
            {isEquipmentModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsEquipmentModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden relative animate-enter"><div className="w-full md:w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-4 border-b bg-white sticky top-0 z-10 flex flex-col gap-3"><div className="flex justify-between items-center"><h3 className="font-bold text-primary">設備一覧</h3><div className="flex gap-2"><button onClick={handleEquipBulkExport} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">書出</button><button onClick={()=>{setEquipBulkMode('import');setEquipBulkText('');setIsEquipBulkModalOpen(true);}} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">取込</button><button onClick={()=>setEquipmentForm({id:'',name:'',email:'',type:'設備'})} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-gray-800">新規</button></div></div><select value={equipFilterType} onChange={e=>setEquipFilterType(e.target.value)} className="w-full border rounded p-1 text-sm"><option value="">全種類</option>{EQUIPMENT_TYPES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="overflow-y-auto flex-1 p-2 space-y-2">{equipments.filter(e=>!equipFilterType||e.type===equipFilterType).map(e=>(<div key={e.id} onClick={()=>setEquipmentForm(e)} className={`p-3 rounded-xl cursor-pointer border ${equipmentForm.id===e.id?'bg-white border-accent':'bg-white border-transparent'}`}><div><div className="font-bold text-sm">{e.name}</div><div className="text-sm text-gray-400">{e.type}</div><div className="text-sm text-gray-400">{e.email}</div></div></div>))}</div></div><div className="w-full md:w-1/2 p-6 overflow-y-auto bg-white"><div className="flex justify-between mb-6"><h3 className="font-bold text-lg">編集</h3><button onClick={()=>setIsEquipmentModalOpen(false)}><Icon name="x" size={20}/></button></div><form onSubmit={saveEquipment} className="space-y-5"><div><label className="block text-sm font-bold text-gray-500">名称</label><input type="text" value={equipmentForm.name} onChange={e=>setEquipmentForm({...equipmentForm,name:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">ID/Email</label><input type="text" value={equipmentForm.email} onChange={e=>setEquipmentForm({...equipmentForm,email:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">種類</label><div className="flex gap-2">{EQUIPMENT_TYPES.map(t=><button type="button" key={t} onClick={()=>setEquipmentForm({...equipmentForm,type:t})} className={`flex-1 py-2 border rounded text-sm ${equipmentForm.type===t?'bg-accent text-white':'bg-gray-50'}`}>{t}</button>)}</div></div><div className="flex gap-3 pt-6 border-t">{equipmentForm.id&&<button type="button" onClick={()=>deleteEquipment(equipmentForm.id)} className="px-4 py-2 border text-red-500 rounded">削除</button>}<button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded">保存</button></div></form></div></div></div>)}
            {isEquipBulkModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsEquipBulkModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-enter"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{equipBulkMode==='import'?'設備一括取込':'設備一括書出'}</h3><button onClick={()=>setIsEquipBulkModalOpen(false)}><Icon name="x" size={20}/></button></div><textarea value={equipBulkText} onChange={e=>setEquipBulkText(e.target.value)} readOnly={equipBulkMode==='export'} className="w-full h-64 border rounded p-2 mb-4 font-mono text-xs" placeholder={equipBulkMode==='import'?'名称\tID/Email\t種類\nハイエース\thiace@example.com\t車輛':''} /><div className="flex gap-4">{equipBulkMode==='export'?<button onClick={copyEquipToClipboard} className="flex-1 py-2 bg-accent text-white rounded">クリップボードにコピー</button>:<button onClick={handleEquipBulkImport} className="flex-1 py-2 bg-primary text-white rounded">取り込む</button>}</div></div></div>)}
            {isAndpadModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsAndpadModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-enter text-center"><Icon name="cloud-download" size={48} className="text-accent mx-auto mb-4"/><h3 className="text-xl font-bold text-primary mb-2">ANDPAD 同期</h3><div className="flex gap-2 justify-center mb-8"><input type="month" value={importFrom} onChange={e=>setImportFrom(e.target.value)} className="border rounded px-2 py-1"/><span>~</span><input type="month" value={importTo} onChange={e=>setImportTo(e.target.value)} className="border rounded px-2 py-1"/></div><div className="flex gap-4"><button onClick={()=>setIsAndpadModalOpen(false)} className="flex-1 py-3 border rounded text-gray-400">キャンセル</button><button onClick={handleBulkImport} className="flex-1 py-3 bg-primary text-white rounded shadow-lg">実行</button></div></div></div>)}
            {isJsonModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsJsonModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl animate-enter"><textarea value={jsonInput} onChange={e=>setJsonInput(e.target.value)} placeholder="Paste JSON..." className="w-full h-64 border rounded p-2 mb-4"/><div className="flex gap-4"><button onClick={()=>setIsJsonModalOpen(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={processJsonImport} className="flex-1 py-2 bg-primary text-white rounded">Import</button></div></div></div>)}
            {isRequestModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsRequestModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-enter flex flex-col"><div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><Icon name="camera" size={24}/> 撮影依頼 - 物件選択</h2><button onClick={()=>setIsRequestModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="x" size={24}/></button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200"><div className="col-span-1"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">事業部</label><select value={reqSearch.category} onChange={e=>setReqSearch({...reqSearch, category:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">全て</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="col-span-1"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">担当者</label><select value={reqSearch.staff} onChange={e=>setReqSearch({...reqSearch, staff:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">全て</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">フリーワード</label><input type="text" value={reqSearch.keyword} onChange={e=>setReqSearch({...reqSearch, keyword:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="物件名, 顧客名, 住所..." /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">契約日 (年月)</label><div className="flex gap-2 items-center"><input type="month" value={reqSearch.contractFrom} onChange={e=>setReqSearch({...reqSearch, contractFrom:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /><span className="text-gray-400">~</span><input type="month" value={reqSearch.contractTo} onChange={e=>setReqSearch({...reqSearch, contractTo:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /></div></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">引渡日 (年月)</label><div className="flex gap-2 items-center"><input type="month" value={reqSearch.handoverFrom} onChange={e=>setReqSearch({...reqSearch, handoverFrom:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /><span className="text-gray-400">~</span><input type="month" value={reqSearch.handoverTo} onChange={e=>setReqSearch({...reqSearch, handoverTo:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /></div></div><div className="col-span-4 flex justify-end pt-2"><button onClick={()=>setReqSearch({keyword:'',category:'',staff:'',contractFrom:'',contractTo:'',handoverFrom:'',handoverTo:''})} className="text-sm text-gray-400 underline hover:text-gray-600">条件クリア</button></div></div></div><div className="flex-1 overflow-y-auto p-6 bg-gray-50"><div className="space-y-3"><div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200"><div className="col-span-1">事業部</div><div className="col-span-2">担当者</div><div className="col-span-2">契約日</div><div className="col-span-3">顧客名 / 物件名</div><div className="col-span-2">引渡日</div><div className="col-span-2 text-right">契約金額</div></div>{requestSuggestions.length > 0 ? requestSuggestions.map(p => (<div key={p.id} onClick={() => selectPropertyForRequest(p)} className="grid grid-cols-12 gap-4 px-4 py-4 bg-white rounded-xl border border-gray-200 hover:border-accent hover:shadow-md transition-all cursor-pointer items-center group"><div className="col-span-1"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{p.category}</span></div><div className="col-span-2 text-xs text-gray-500"><div>{formatRepName(p.salesRep)} <span className="text-[10px] text-gray-400">(営)</span></div>{p.icRep && <div>{formatRepName(p.icRep)} <span className="text-[10px] text-gray-400">(IC)</span></div>}{p.constructionRep && <div>{formatRepName(p.constructionRep)} <span className="text-[10px] text-gray-400">(工)</span></div>}</div><div className="col-span-2 text-sm font-medium text-gray-700">{p.contractDate ? formatDate(p.contractDate) : '-'}</div><div className="col-span-3"><div className="font-bold text-sm text-gray-800">{p.customerName || '未設定'}</div><div className="text-xs text-gray-500 truncate">{p.name}</div></div><div className="col-span-2 text-sm font-medium text-emerald-600">{p.handoverDate ? formatDate(p.handoverDate) : '-'}</div><div className="col-span-2 text-right font-bold text-gray-700">{formatCurrency(p.contractAmount)}</div></div>)) : (<div className="text-center py-12 text-gray-400 font-bold">条件に一致する物件がありません</div>)}</div></div></div></div>)}

            {isSettingsModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsSettingsModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-enter"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-primary flex items-center gap-2"><Icon name="settings" size={24}/> 設定</h3><button onClick={()=>setIsSettingsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="x" size={20}/></button></div><div className="space-y-5">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200"><h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><Icon name="message-square" size={16} className="text-blue-500"/>チャットワーク通知</h4><div><label className="block text-xs font-bold text-gray-500 mb-1">グループチャット ルームID</label><input type="text" value={chatworkSettings.chatwork_room_id} onChange={e=>setChatworkSettings(p=>({...p,chatwork_room_id:e.target.value}))} className="w-full border rounded px-3 py-2 text-sm" placeholder="例: 123456789"/></div></div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200"><h4 className="font-bold text-sm text-gray-700 mb-3">通知タイミング</h4><div className="space-y-2">{[{key:'chatwork_notify_on_create',label:'日程登録時'},{key:'chatwork_notify_on_update',label:'日程変更時'},{key:'chatwork_notify_on_remind',label:'各撮影日前日リマインド'}].map(t=>(<div key={t.key} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border"><span className="text-sm font-medium">{t.label}</span><button type="button" onClick={()=>setChatworkSettings(p=>({...p,[t.key]:p[t.key]==='true'?'false':'true'}))} className={`w-12 h-6 rounded-full transition-colors relative ${chatworkSettings[t.key]==='true'?'bg-accent':'bg-gray-300'}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${chatworkSettings[t.key]==='true'?'left-6':'left-0.5'}`}/></button></div>))}</div></div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200"><h4 className="font-bold text-sm text-gray-700 mb-3">通知テンプレート</h4><div className="flex gap-2 mb-3">{[{key:'create',label:'日程登録時'},{key:'update',label:'日程変更時'},{key:'remind',label:'前日リマインド'}].map(t=>(<button key={t.key} type="button" onClick={()=>setEditingTemplateType(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${editingTemplateType===t.key?'bg-primary text-white':'bg-white border text-gray-500 hover:bg-gray-50'}`}>{t.label}</button>))}</div>
                    <div className="mb-2"><label className="block text-xs font-bold text-gray-500 mb-1">タグ挿入（クリックで挿入）</label><div className="flex flex-wrap gap-1">{[...CW_TAGS, ...(editingTemplateType==='remind'?CW_REMIND_TAGS:[])].map(t=>(<button key={t.tag} type="button" onClick={()=>insertCwTag(t.tag)} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100 transition-colors">{t.label}</button>))}</div></div>
                    <textarea id="cw-template-textarea" value={chatworkSettings[`chatwork_template_${editingTemplateType}`]||CW_DEFAULT_TEMPLATES[editingTemplateType]} onChange={e=>setChatworkSettings(p=>({...p,[`chatwork_template_${editingTemplateType}`]:e.target.value}))} className="w-full border rounded p-3 text-sm font-mono h-48 resize-y" />
                    <button type="button" onClick={()=>setChatworkSettings(p=>({...p,[`chatwork_template_${editingTemplateType}`]:''})) } className="text-xs text-gray-400 underline hover:text-gray-600 mt-1">デフォルトに戻す</button>
                </div>
                <div className="flex gap-3 pt-2"><button onClick={()=>setIsSettingsModalOpen(false)} className="flex-1 py-2 border rounded text-gray-500">キャンセル</button><button onClick={saveChatworkSettings} className="flex-1 py-2 bg-primary text-white rounded shadow-lg">保存</button></div>
            </div></div></div>)}

            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsEventModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-enter">
                    <div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex flex-col"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{editingEventId ? 'イベント編集' : 'イベント新規登録'}</h2><div className="text-xl font-bold text-primary">{eventForm.name || 'イベント名未設定'}</div></div>
                        <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="x" size={24}/></button>
                    </div>
                    <div className="p-8 space-y-8"><form onSubmit={saveEvent} className="space-y-8">
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">基本情報</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">イベント名*</label><input type="text" required value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold" /></div><div><label className="block text-sm font-bold text-gray-500 mb-2">事業部</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><button key={c} type="button" onClick={()=>setEventForm({...eventForm, category:c})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${eventForm.category===c?'bg-primary text-white':'bg-white text-gray-500'}`}>{c}</button>)}</div></div></div></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">スケジュール</h3><div className="space-y-6"><div><label className="text-sm font-bold text-blue-600 mb-1 block">設営</label><div className="flex gap-2 items-center"><input type="date" value={eventForm.setupDate_date} onChange={e=>setEventForm({...eventForm,setupDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={eventForm.setupDate_time} onChange={e=>setEventForm({...eventForm,setupDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={eventForm.setupEndTime} onChange={e=>setEventForm({...eventForm,setupEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={eventForm.setupVehicle} onChange={e=>setEventForm({...eventForm,setupVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={eventForm.setupVehicle2} onChange={e=>setEventForm({...eventForm,setupVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div><label className="text-sm font-bold text-orange-600 mb-1 block">撤収</label><div className="flex gap-2 items-center"><input type="date" value={eventForm.teardownDate_date} onChange={e=>setEventForm({...eventForm,teardownDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={eventForm.teardownDate_time} onChange={e=>setEventForm({...eventForm,teardownDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={eventForm.teardownEndTime} onChange={e=>setEventForm({...eventForm,teardownEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={eventForm.teardownVehicle} onChange={e=>setEventForm({...eventForm,teardownVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={eventForm.teardownVehicle2} onChange={e=>setEventForm({...eventForm,teardownVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div className="border-t border-dashed pt-4"><label className="text-sm font-bold text-teal-600 mb-1 block">イベント日程</label>{eventForm.eventDates.map((d,i)=>(<div key={i} className="flex gap-2 mt-1"><input type="date" value={d} onChange={e=>updateEventDate(i,e.target.value)} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/>{eventForm.eventDates.length>1&&<button type="button" onClick={()=>removeEventDate(i)} className="text-red-500"><Icon name="trash-2" size={18}/></button>}</div>))}<button type="button" onClick={addEventDate} className="text-sm text-teal-500 mt-1">+ 追加</button></div></div></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">通知</h3><StaffOnlyInput label="通知スタッフ" tags={eventForm.notificationStaff} onTagsChange={v=>setEventForm({...eventForm,notificationStaff:v})} suggestions={staffSuggestions} /></section>
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-4">{editingEventId && <button type="button" onClick={()=>deleteEvent(editingEventId)} className="px-6 py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50">削除</button>}<button type="button" onClick={()=>setIsEventModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50">キャンセル</button><button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-gray-800">保存する</button></div>
                    </form></div>
                </div></div>
            )}

            {notification && (<div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-enter"><Icon name="circle-check" size={18} className="text-green-400" /><span className="text-sm font-bold tracking-wide">{notification}</span></div>)}
        </div>
    );
};

export default App;
