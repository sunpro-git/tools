import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, CALENDAR_GAS_API_URL, CATEGORIES, BRANCHES, BRANCH_LABELS, STAFF_ROLES, STAFF_DEPARTMENTS, EQUIPMENT_TYPES, SHOOTING_TYPES, ANDPAD_LABELS } from './config';
import { formatDate, formatDateTime, toYMD, formatRepName, formatCurrency, handleShowPicker } from './helpers';
import Icon from './components/Icon';
import TagInput from './components/TagInput';
import StaffOnlyInput from './components/StaffOnlyInput';
import FileUpload from './components/FileUpload';

const App = () => {
    const [user, setUser] = useState(null); const [properties, setProperties] = useState([]); const [staffs, setStaffs] = useState([]); const [equipments, setEquipments] = useState([]);
    const [loading, setLoading] = useState(true); const [isModalOpen, setIsModalOpen] = useState(false); const [isRequestModalOpen, setIsRequestModalOpen] = useState(false); const [requestMode, setRequestMode] = useState('shoot'); const [isStaffModalOpen, setIsStaffModalOpen] = useState(false); const [isStaffBulkModalOpen, setIsStaffBulkModalOpen] = useState(false); const [staffBulkText, setStaffBulkText] = useState(''); const [staffBulkMode, setStaffBulkMode] = useState('import'); const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false); const [isEquipBulkModalOpen, setIsEquipBulkModalOpen] = useState(false); const [equipBulkText, setEquipBulkText] = useState(''); const [equipBulkMode, setEquipBulkMode] = useState('import');
    const [editingId, setEditingId] = useState(null); const [notification, setNotification] = useState(null); const [isSyncingCalendar, setIsSyncingCalendar] = useState(false); const [scrollToRequest, setScrollToRequest] = useState(false);
    const [visibleEventTypes, setVisibleEventTypes] = useState(['setup', 'teardown', 'openhouse', 'youtube', 'photo', 'instalive', 'event_setup', 'event_teardown', 'event_date']); const [viewMode, setViewMode] = useState('list');
    const [isFilterExpanded, setIsFilterExpanded] = useState(true); const [selectedCategories, setSelectedCategories] = useState([]); const [selectedBranches, setSelectedBranches] = useState([]); const [selectedScheduleTypes, setSelectedScheduleTypes] = useState([]); const [searchKeyword, setSearchKeyword] = useState('');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const showConfirm = (title, message, onOk, variant = 'danger') => new Promise(resolve => { setConfirmDialog({ title, message, variant, onOk: () => { setConfirmDialog(null); if(onOk) onOk(); resolve(true); }, onCancel: () => { setConfirmDialog(null); resolve(false); } }); });
    const [isEventModalOpen, setIsEventModalOpen] = useState(false); const [editingEventId, setEditingEventId] = useState(null);
    const [eventForm, setEventForm] = useState({ name:'', category:'新築', customerName:'', address:'', googleMapUrl:'', setupDate_date:'', setupDate_time:'', setupEndTime:'', setupVehicle:'', setupVehicle2:'', teardownDate_date:'', teardownDate_time:'', teardownEndTime:'', teardownVehicle:'', teardownVehicle2:'', eventName:'', eventDates:['',''], handoverDate:'', notificationStaff:[], propertyId:'', propertyName:'', requester:'', shootingTypes:[], shootingRange_from_date:'', shootingRange_from_time:'', shootingRange_to_date:'', shootingRange_to_time:'', instructionFileUrl:'', instructionFileName:'', overviewFileUrl:'', overviewFileName:'', witnessStaff:'', ownerPresence:'', shootingNotes:'', systemId:'', salesRep:'', icRep:'', constructionRep:'' });
    const [eventPropertySearch, setEventPropertySearch] = useState('');
    const [eventPropertyResults, setEventPropertyResults] = useState([]);
    const [eventPropertyLoading, setEventPropertyLoading] = useState(false);
    const [showEventPropertySearch, setShowEventPropertySearch] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpContent, setHelpContent] = useState('');
    const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
    const [faqContent, setFaqContent] = useState('');
    const [isEditingFaq, setIsEditingFaq] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [chatworkSettings, setChatworkSettings] = useState({ chatwork_room_id: '', chatwork_notify_on_create: 'true', chatwork_notify_on_update: 'true', chatwork_notify_on_remind: 'true', chatwork_template_create: '', chatwork_template_update: '', chatwork_template_remind: '' });
    const [editingTemplateType, setEditingTemplateType] = useState('create');
    const [filterFrom, setFilterFrom] = useState(''); const [filterTo, setFilterTo] = useState(''); const [showNoDateProperties, setShowNoDateProperties] = useState(true); const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
    const [branchAssignments, setBranchAssignments] = useState([]);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [branchCategoryFilter, setBranchCategoryFilter] = useState('共通');
    const [newMunicipality, setNewMunicipality] = useState({});
    const [newBranchName, setNewBranchName] = useState('');

    const [reqSearch, setReqSearch] = useState({ keyword: '', category: '', staff: '', contractFrom: '', contractTo: '', handoverFrom: '', handoverTo: '' });
    const timeOptions = useMemo(() => Array.from({ length: 49 }, (_, i) => `${Math.floor((480 + (i * 15)) / 60).toString().padStart(2, '0')}:${((480 + (i * 15)) % 60).toString().padStart(2, '0')}`), []);
    const vehicleOptions = useMemo(() => equipments.filter(e => e.type === '車輛'), [equipments]);

    const [form, setForm] = useState({
        name: '', address: '', category: '新築', furnitureSetup: 'なし', customerName: '', customerLat: '', customerLon: '', mainStore: '',
        setupDate_date: '', setupDate_time: '', setupEndTime: '', teardownDate_date: '', teardownDate_time: '', teardownEndTime: '', setupVehicle: '', setupVehicle2: '', teardownVehicle: '', teardownVehicle2: '',
        shootingRange_from_date: '', shootingRange_from_time: '', shootingRange_to_date: '', shootingRange_to_time: '',
        eventName: '', eventDates: ['', ''], openHouseDate: '', openHouseDates: ['', ''], handoverDate: '', handoverSource: '',
        youtubeDates: [''], youtubeStartTime: '', youtubeEndTime: '', youtubeStaff: [], youtubeRequested: false, youtubeNote: '',
        photoDates: [''], photoStartTime: '', photoEndTime: '', photoStaff: [], photoRequested: false, photoNote: '',
        exteriorPhotoDates: [''], exteriorPhotoStartTime: '', exteriorPhotoEndTime: '', exteriorPhotoStaff: [], exteriorPhotoRequested: false, exteriorPhotoNote: '',
        instaLiveDates: [''], instaLiveStartTime: '', instaLiveEndTime: '', instaLiveStaff: [], instaLiveRequested: false, instaLiveNote: '',
        instaRegularDates: [''], instaRegularStartTime: '', instaRegularEndTime: '', instaRegularStaff: [], instaRegularRequested: false, instaRegularNote: '',
        instaPromoDates: [''], instaPromoStartTime: '', instaPromoEndTime: '', instaPromoStaff: [], instaPromoRequested: false, instaPromoNote: '',
        otherDates: [''], otherStartTime: '', otherEndTime: '', otherStaff: [], otherRequested: false, otherNote: '',
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
            const toYM = (d) => { if (!d) return ''; return (d.split('T')[0]).substring(0, 7); };
            const ymInRange = (ym) => ym && (!filterFrom || ym >= filterFrom) && (!filterTo || ym <= filterTo);
            const allDates = [p.setupDate, p.teardownDate, p.photoDate, p.exteriorPhotoDate, p.youtubeDate, p.instaLiveDate, p.instaRegularDate, p.instaPromoDate, p.otherDate, ...(Array.isArray(p.youtubeDates) ? p.youtubeDates : []), ...(Array.isArray(p.photoDates) ? p.photoDates : []), ...(Array.isArray(p.exteriorPhotoDates) ? p.exteriorPhotoDates : []), ...(Array.isArray(p.instaLiveDates) ? p.instaLiveDates : []), ...(Array.isArray(p.instaRegularDates) ? p.instaRegularDates : []), ...(Array.isArray(p.instaPromoDates) ? p.instaPromoDates : []), ...(Array.isArray(p.otherDates) ? p.otherDates : []), ...(Array.isArray(p.openHouseDates) ? p.openHouseDates : []), ...(Array.isArray(p.eventDates) ? p.eventDates : [])];
            const hasAnyDate = allDates.some(d => d);
            const dateMatch = viewMode === 'calendar' ? true : (!hasAnyDate ? showNoDateProperties : allDates.some(d => ymInRange(toYM(d))));
            const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
            let branchMatch = true; if (selectedBranches.length > 0) { const branchInfo = getAreaBranchDynamic(p.address, p.category); branchMatch = branchInfo && selectedBranches.includes(branchInfo.name); }
            let keywordMatch = true; if (searchKeyword.trim()) { const keywords = searchKeyword.toLowerCase().replace(/　/g, ' ').split(' ').filter(k => k); const targetString = [p.name, p.customerName, p.address, p.eventName, p.salesRep, p.icRep, p.constructionRep, p.systemId, ...(p.youtubeStaff || []), ...(p.photoStaff || []), ...(p.instaLiveStaff || [])].join(' ').toLowerCase(); keywordMatch = keywords.every(k => targetString.includes(k)); }
            const hasEvent = p.eventDates && p.eventDates.filter(Boolean).length > 0;
            const hasShooting = !!p.shootingRangeFrom || (p.youtubeDates && p.youtubeDates.filter(Boolean).length > 0) || !!p.youtubeDate || (p.photoDates && p.photoDates.filter(Boolean).length > 0) || !!p.photoDate || (p.exteriorPhotoDates && p.exteriorPhotoDates.filter(Boolean).length > 0) || !!p.exteriorPhotoDate || (p.instaLiveDates && p.instaLiveDates.filter(Boolean).length > 0) || !!p.instaLiveDate || (p.instaRegularDates && p.instaRegularDates.filter(Boolean).length > 0) || !!p.instaRegularDate || (p.instaPromoDates && p.instaPromoDates.filter(Boolean).length > 0) || !!p.instaPromoDate || (p.otherDates && p.otherDates.filter(Boolean).length > 0) || !!p.otherDate;
            let scheduleMatch = true; if (selectedScheduleTypes.length > 0) { if (selectedScheduleTypes.includes('撮影') && !selectedScheduleTypes.includes('イベント')) { scheduleMatch = hasShooting; } else if (selectedScheduleTypes.includes('イベント') && !selectedScheduleTypes.includes('撮影')) { scheduleMatch = hasEvent; } }
            return dateMatch && categoryMatch && branchMatch && keywordMatch && scheduleMatch;
        });
    }, [properties, filterFrom, filterTo, selectedCategories, selectedBranches, selectedScheduleTypes, searchKeyword, viewMode, showNoDateProperties, branchAssignments]);

    const [requestResults, setRequestResults] = useState([]);
    const [requestLoading, setRequestLoading] = useState(false);
    useEffect(() => {
        const hasFilter = reqSearch.keyword || reqSearch.category || reqSearch.staff || reqSearch.contractFrom || reqSearch.contractTo || reqSearch.handoverFrom || reqSearch.handoverTo;
        if (!hasFilter) { setRequestResults([]); return; }
        const timer = setTimeout(async () => {
            setRequestLoading(true);
            let query = supabase.from('deals').select('id,andpad_id,customer_andpad_id,name,customer_name,deal_category,category,role_sales,role_ic,role_construction,order_date,handover_date_actual,handover_date_planned,order_amount,label_office').in('deal_category', ['新築', 'リフォーム']).limit(50);
            if (reqSearch.keyword) {
                const k = reqSearch.keyword.trim();
                query = query.or(`name.ilike.%${k}%,customer_name.ilike.%${k}%`);
            }
            if (reqSearch.category) query = query.eq('deal_category', reqSearch.category);
            if (reqSearch.staff) {
                const s = reqSearch.staff;
                query = query.or(`role_sales.ilike.*${s}*,role_ic.ilike.*${s}*,role_construction.ilike.*${s}*`);
            }
            if (reqSearch.contractFrom) query = query.gte('order_date', reqSearch.contractFrom + '-01');
            if (reqSearch.contractTo) query = query.lte('order_date', reqSearch.contractTo + '-31');
            if (reqSearch.handoverFrom) query = query.gte('handover_date_actual', reqSearch.handoverFrom + '-01');
            if (reqSearch.handoverTo) query = query.lte('handover_date_actual', reqSearch.handoverTo + '-31');
            const { data, error } = await query;
            if (error) console.error('deals search error:', error);
            setRequestResults(data || []);
            setRequestLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [reqSearch]);
    const requestSuggestions = requestResults;

    // Event property search (debounced) - deals table from andpad-expansion
    useEffect(() => {
        if (!eventPropertySearch.trim()) { setEventPropertyResults([]); return; }
        const timer = setTimeout(async () => {
            setEventPropertyLoading(true);
            const k = eventPropertySearch.trim();
            const { data } = await supabase.from('deals').select('id,andpad_id,name,customer_name,deal_category,category').in('deal_category', ['新築', 'リフォーム']).or(`name.ilike.%${k}%,customer_name.ilike.%${k}%`).limit(20);
            setEventPropertyResults(data || []);
            setEventPropertyLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [eventPropertySearch]);


    const groupedProperties = useMemo(() => {
        const groups = {};
        filteredProperties.forEach(p => {
            const hasEvent = p.eventDates && p.eventDates.filter(Boolean).length > 0;
            const hasShooting = (p.shootingTypes && p.shootingTypes.length > 0) || p.shootingRangeFrom || (p.youtubeDates && p.youtubeDates.filter(Boolean).length > 0) || p.youtubeDate || (p.photoDates && p.photoDates.filter(Boolean).length > 0) || p.photoDate || (p.exteriorPhotoDates && p.exteriorPhotoDates.filter(Boolean).length > 0) || p.exteriorPhotoDate || (p.instaLiveDates && p.instaLiveDates.filter(Boolean).length > 0) || p.instaLiveDate || (p.instaRegularDates && p.instaRegularDates.filter(Boolean).length > 0) || p.instaRegularDate || (p.instaPromoDates && p.instaPromoDates.filter(Boolean).length > 0) || p.instaPromoDate || (p.otherDates && p.otherDates.filter(Boolean).length > 0) || p.otherDate;
            const _type = hasEvent ? 'event' : (hasShooting ? 'property' : 'event');
            let key = "設営日未定";
            if (hasEvent && !p.setupDate) {
                const earliest = [...(p.eventDates || []), p.setupDate].filter(Boolean).sort()[0];
                if (earliest) { const d = new Date(earliest.split('T')[0]); if (!isNaN(d.getTime())) key = `${d.getFullYear()}年${d.getMonth() + 1}月 設営`; } else { key = "日程未定"; }
            } else if (p.setupDate) { const d = new Date(p.setupDate); if (!isNaN(d.getTime())) key = `${d.getFullYear()}年${d.getMonth() + 1}月 設営`; }
            if (!groups[key]) groups[key] = [];
            groups[key].push({ ...p, _type });
        });
        const sortedKeys = Object.keys(groups).sort((a, b) => { if (a === "設営日未定" || a === "日程未定") return 1; if (b === "設営日未定" || b === "日程未定") return -1; const dateA = new Date(a.replace(' 設営', '').replace('年', '/').replace('月', '/1')); const dateB = new Date(b.replace(' 設営', '').replace('年', '/').replace('月', '/1')); return dateA - dateB; });
        return sortedKeys.map(key => ({ title: key, items: groups[key] }));
    }, [filteredProperties]);

    const calendarEvents = useMemo(() => {
        const calItems = [];
        filteredProperties.forEach(prop => {
            const rawName = prop.customerName || prop.name || ''; const cleanName = rawName.replace(/[\s\u3000]+/g, ''); const categorySuffix = prop.category ? ` ${prop.category}` : '';
            const addEvent = (dateStr, type, label, colorClass) => { if (!dateStr || !visibleEventTypes.includes(type)) return; const ymd = dateStr.split('T')[0]; if (!calItems[ymd]) calItems[ymd] = []; calItems[ymd].push({ type, label, title: `【${label}】${cleanName}${categorySuffix}`, colorClass, prop }); };
            addEvent(prop.setupDate, 'setup', '設営', 'bg-blue-100 text-blue-800 border-blue-200'); addEvent(prop.teardownDate, 'teardown', '撤収', 'bg-orange-100 text-orange-800 border-orange-200');
            addEvent(prop.handoverDate, 'handover', '引渡', 'bg-emerald-100 text-emerald-800 border-emerald-200');
            (prop.youtubeDates && prop.youtubeDates.length > 0 ? prop.youtubeDates : (prop.youtubeDate ? [prop.youtubeDate] : [])).forEach(d => { if(d) addEvent(d, 'youtube', 'YouTube', 'bg-red-100 text-red-800 border-red-200'); });
            (prop.photoDates && prop.photoDates.length > 0 ? prop.photoDates : (prop.photoDate ? [prop.photoDate] : [])).forEach(d => { if(d) addEvent(d, 'photo', 'スチール', 'bg-blue-50 text-blue-600 border-blue-200'); });
            (prop.exteriorPhotoDates && prop.exteriorPhotoDates.length > 0 ? prop.exteriorPhotoDates : (prop.exteriorPhotoDate ? [prop.exteriorPhotoDate] : [])).forEach(d => { if(d) addEvent(d, 'photo', '外観', 'bg-blue-50 text-blue-600 border-blue-200'); });
            (prop.instaLiveDates && prop.instaLiveDates.length > 0 ? prop.instaLiveDates : (prop.instaLiveDate ? [prop.instaLiveDate] : [])).forEach(d => { if(d) addEvent(d, 'instalive', 'インスタ', 'bg-pink-100 text-pink-800 border-pink-200'); });
            (prop.instaRegularDates && prop.instaRegularDates.length > 0 ? prop.instaRegularDates : (prop.instaRegularDate ? [prop.instaRegularDate] : [])).forEach(d => { if(d) addEvent(d, 'instalive', 'インスタ投稿', 'bg-pink-100 text-pink-800 border-pink-200'); });
            (prop.instaPromoDates && prop.instaPromoDates.length > 0 ? prop.instaPromoDates : (prop.instaPromoDate ? [prop.instaPromoDate] : [])).forEach(d => { if(d) addEvent(d, 'instalive', 'インスタ広告', 'bg-pink-100 text-pink-800 border-pink-200'); });
            (prop.otherDates && prop.otherDates.length > 0 ? prop.otherDates : (prop.otherDate ? [prop.otherDate] : [])).forEach(d => { if(d) addEvent(d, 'photo', 'その他', 'bg-gray-100 text-gray-600 border-gray-200'); });
            (prop.eventDates || []).forEach(d => { if(d) addEvent(d, 'event_date', 'イベント', 'bg-purple-100 text-purple-800 border-purple-200'); });
        });
        return calItems;
    }, [filteredProperties, visibleEventTypes]);

    const toggleEventType = (type) => { if (type === 'setup_teardown') setVisibleEventTypes(prev => (prev.includes('setup')||prev.includes('teardown')) ? prev.filter(t => t !== 'setup' && t !== 'teardown') : [...prev, 'setup', 'teardown']); else if (type === 'media') setVisibleEventTypes(prev => { const targets = ['youtube', 'photo', 'instalive']; if (targets.some(t => prev.includes(t))) return prev.filter(t => !targets.includes(t)); const newTypes = [...prev]; targets.forEach(t => { if (!newTypes.includes(t)) newTypes.push(t); }); return newTypes; }); else if (type === 'event') setVisibleEventTypes(prev => { const targets = ['event_setup', 'event_teardown', 'event_date']; if (targets.some(t => prev.includes(t))) return prev.filter(t => !targets.includes(t)); const newTypes = [...prev]; targets.forEach(t => { if (!newTypes.includes(t)) newTypes.push(t); }); return newTypes; }); else setVisibleEventTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); };
    const calendarMonths = useMemo(() => { const months = []; for (let i = 0; i < 4; i++) { const d = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + i, 1); const start = new Date(d); start.setDate(start.getDate() - start.getDay()); const days = []; for(let j=0; j<42; j++){ const cur = new Date(start); cur.setDate(start.getDate()+j); days.push({ date: cur, ymd: toYMD(cur), isCurrentMonth: cur.getMonth() === d.getMonth(), isToday: toYMD(cur) === toYMD(new Date()) }); } months.push({ year: d.getFullYear(), month: d.getMonth(), days }); } return months; }, [currentCalendarDate]);
    const toggleFilterCategory = (cat) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); const toggleFilterBranch = (branch) => setSelectedBranches(prev => prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]); const toggleFilterScheduleType = (t) => setSelectedScheduleTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    const setQuickFilter = (offset) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; setFilterFrom(ym); setFilterTo(ym); };
    const setFourMonthsFilter = () => { const start = new Date(); start.setDate(1); const end = new Date(); end.setDate(1); end.setMonth(end.getMonth() + 3); setFilterFrom(`${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`); setFilterTo(`${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}`); };
    const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

    const getAreaBranchDynamic = (address, category) => {
        if (!address || branchAssignments.length === 0) return null;
        const candidates = category
            ? branchAssignments.filter(a => a.category === category || a.category === '共通')
            : branchAssignments;
        const sorted = [...candidates].sort((a, b) => {
            // カテゴリ優先: 特定カテゴリ > 共通
            if (a.category === category && b.category === '共通') return -1;
            if (a.category === '共通' && b.category === category) return 1;
            // 長い市町村名を先にマッチ（「下諏訪」が「諏訪」より先にマッチ）
            return b.municipality.length - a.municipality.length;
        });
        // 「長野県」等の都道府県名を除去してからマッチ
        const addrBody = address.replace(/^.+?[都道府県]/, '');
        for (const a of sorted) {
            if (addrBody.includes(a.municipality)) {
                return { name: a.branch_name, class: a.branch_class };
            }
        }
        return null;
    };

    const fetchBranchAssignmentsTop = async () => {
        const { data, error } = await supabase.from('branch_assignments').select('*').order('sort_order');
        if (error) { console.error(error); return; }
        setBranchAssignments(data || []);
    };

    const addBranchAssignment = async (branchName, branchClass, municipality, category) => {
        const { error } = await supabase.from('branch_assignments').insert({
            branch_name: branchName, branch_class: branchClass,
            municipality, category,
            sort_order: branchAssignments.find(a => a.branch_name === branchName)?.sort_order || 0
        });
        if (!error) { fetchBranchAssignmentsTop(); showNotification('追加しました'); }
    };

    const deleteBranchAssignment = async (id) => {
        const { error } = await supabase.from('branch_assignments').delete().eq('id', id);
        if (!error) { fetchBranchAssignmentsTop(); showNotification('削除しました'); }
    };

    useEffect(() => { const now = new Date(); const future = new Date(); future.setMonth(future.getMonth() + 3); const formatYM = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; setFilterFrom(formatYM(now)); setFilterTo(formatYM(future)); setUser({ id: 'anon' }); const cleanup = listenToData(); return () => { if (cleanup) cleanup(); }; }, []);
    useEffect(() => { if (isModalOpen && scrollToRequest) { setTimeout(() => { const s = document.getElementById('shooting-request-section'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); setScrollToRequest(false); }, 300); } }, [isModalOpen, scrollToRequest]);

    const realtimePausedRef = useRef(false);
    const listenToData = () => {
        const fetchProperties = async () => {
            const { data, error } = await supabase.from('events').select('*');
            if (error) { console.error('events fetch error:', error); setLoading(false); return; }
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
        const fetchBranchAssignments = async () => {
            const { data, error } = await supabase.from('branch_assignments').select('*').order('sort_order');
            if (error) { console.error(error); return; }
            setBranchAssignments(data || []);
        };
        fetchProperties(); fetchStaffs(); fetchEquipments(); fetchSettings(); fetchBranchAssignments();
        const ch1 = supabase.channel('events-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, debouncedFetchProperties).subscribe();
        const ch2 = supabase.channel('staffs-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, () => fetchStaffs()).subscribe();
        const ch3 = supabase.channel('equipments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'equipments' }, () => fetchEquipments()).subscribe();
        const ch4 = supabase.channel('branch-assignments-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'branch_assignments' }, () => fetchBranchAssignments()).subscribe();
        return () => { clearTimeout(propTimer); supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); };
    };

    const submitRequest = (e) => { e.preventDefault(); if (!requestForm.propertyId) { alert("案件選択必須"); return; } const p = properties.find(p => p.id === requestForm.propertyId); if (p) { setIsRequestModalOpen(false); openShootingRequestModal(p); } else { alert("データなし"); } };
    const getCalendarEmail = (name) => { const cal = equipments.find(e => e.name === name && e.type === 'カレンダー'); return cal ? cal.email : null; };
    const getGuestEmails = (p) => { const names = [...(p.youtubeStaff||[]), ...(p.photoStaff||[]), ...(p.instaLiveStaff||[]), ...(p.notificationStaff||[])]; if(p.requester) names.push(p.requester); return [...new Set(names)].map(n => { const s = staffs.find(st => st.name === n); return s ? s.email : null; }).filter(e=>e).join(','); };
    const getVehicleEmail = (n) => { const v = equipments.find(e => e.name === n && e.type === '車輛'); return v ? v.email : null; };
    const calculateTimeRange = (d, s, e, all=false) => { if(!d) return null; const ymd = d.split('T')[0]; let start, end; if(all) { start=new Date(`${ymd}T10:00:00`); end=new Date(`${ymd}T17:00:00`); } else { let sStr = d; if(s) sStr = `${ymd}T${s}:00`; else if(!d.includes('T')) sStr = `${ymd}T09:00:00`; start = new Date(sStr); if(e) end=new Date(`${ymd}T${e}:00`); else end=new Date(start.getTime()+7200000); if(!e && d.includes('T') && !isNaN(new Date(d).getTime())) { start=new Date(d); end=new Date(start.getTime()+7200000); } } return {start, end}; };

    const generatePropertyEvents = (p) => {
        const events = []; const guests = getGuestEmails(p);
        const desc = `【シューログ 現場撮影管理より登録】\n\n担当: ${p.salesRep||'-'}\n種別: ${p.category}\n住所: ${p.address||'-'}`;
        const cat = p.category; const hasF = p.furnitureSetup==='あり'; const hasOh = (p.openHouseDates&&p.openHouseDates.some(d=>d))||!!p.openHouseDate;
        const type = hasF?(hasOh?'ohirome':'satsuei'):(hasOh?'ohirome_nashi':'satsuei_nashi');
        const loc = p.googleMapUrl || p.address || '';

        // タイトル生成: [RF/松本市]△△邸_撮影種類_担当スタッフ
        const catCode = cat === 'リフォーム' ? 'RF' : 'NK';
        const cityMatch = (p.address || '').match(/[都道府県](.+?[市区町村郡])/);
        const city = cityMatch ? cityMatch[1] : '';
        const custName = (p.customerName || p.name || '').replace(/[\s\u3000]+/g, '');
        const prefix = `[${catCode}${city ? '/' + city : ''}]${custName}${custName ? '邸' : ''}`;
        const makeTitle = (typeLabel, staffArr) => {
            const parts = [prefix, typeLabel];
            if (staffArr && staffArr.length > 0) parts.push(staffArr.map(s => typeof s === 'string' ? s.split(' ').pop() : s).join('・'));
            return parts.join('_');
        };

        const setupTeardownCal = getCalendarEmail('設営・撤収カレンダー');
        const commonEventCal = getCalendarEmail('イベントカレンダー');
        const shinchikuCal = getCalendarEmail('新築イベントカレンダー');
        const reformCal = getCalendarEmail('リフォームイベントカレンダー');

        const addSetupTeardownGuests = (baseGuests) => { let g = baseGuests || ''; if (setupTeardownCal) g = g ? `${g},${setupTeardownCal}` : setupTeardownCal; return g; };
        const addEventGuests = (baseGuests) => { let g = baseGuests || ''; if (commonEventCal) g = g ? `${g},${commonEventCal}` : commonEventCal; if (cat === '新築' && shinchikuCal) g = g ? `${g},${shinchikuCal}` : shinchikuCal; if (cat === 'リフォーム' && reformCal) g = g ? `${g},${reformCal}` : reformCal; return g; };

        if(p.setupDate){ const r = calculateTimeRange(p.setupDate, null, p.setupEndTime); if(r){ const ve = getVehicleEmail(p.setupVehicle); const ve2 = getVehicleEmail(p.setupVehicle2); let g = ve ? (guests ? `${guests},${ve}` : ve) : guests; if(ve2) g = g ? `${g},${ve2}` : ve2; g = addSetupTeardownGuests(g); const vDesc = [p.setupVehicle,p.setupVehicle2].filter(Boolean).join(', '); events.push({id:p.id, title:makeTitle('設営'), startTime:r.start, endTime:r.end, location:loc, description:desc+(vDesc?`\n車両: ${vDesc}`:''), category:cat, guests:g, eventType:type, vehicleEmail:ve, vehicleName:p.setupVehicle}); } }
        if(p.teardownDate){ const r = calculateTimeRange(p.teardownDate, null, p.teardownEndTime); if(r){ const ve = getVehicleEmail(p.teardownVehicle); const ve2 = getVehicleEmail(p.teardownVehicle2); let g = ve ? (guests ? `${guests},${ve}` : ve) : guests; if(ve2) g = g ? `${g},${ve2}` : ve2; g = addSetupTeardownGuests(g); const vDesc = [p.teardownVehicle,p.teardownVehicle2].filter(Boolean).join(', '); events.push({id:p.id, title:makeTitle('撤収'), startTime:r.start, endTime:r.end, location:loc, description:desc+(vDesc?`\n車両: ${vDesc}`:''), category:cat, guests:g, eventType:type, vehicleEmail:ve, vehicleName:p.teardownVehicle}); } }
        // 見学会
        (p.openHouseDates&&p.openHouseDates.length>0?p.openHouseDates:(p.openHouseDate?[p.openHouseDate]:[])).forEach(d=>{
            if(!d)return;
            const r=calculateTimeRange(d,null,null,true);
            if(r) { let g = addEventGuests(guests); events.push({id:`${p.id}_oh_${d}`, title:makeTitle('見学会'), startTime:r.start, endTime:r.end, location:loc, description:desc, category:cat, guests:g, eventType:type}); }
        });
        // イベント日
        (p.eventDates||[]).forEach(d=>{
            if(!d)return;
            const r=calculateTimeRange(d,null,null,true);
            if(r) { let g = addEventGuests(guests); events.push({id:`${p.id}_ev_${d}`, title:makeTitle('イベント'), startTime:r.start, endTime:r.end, location:loc, description:desc, category:cat, guests:g, eventType:type}); }
        });
        // 撮影種別
        (p.youtubeDates && p.youtubeDates.length > 0 ? p.youtubeDates : (p.youtubeDate ? [p.youtubeDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.youtubeStartTime,p.youtubeEndTime); if(r) events.push({id:`${p.id}_yt_${i}`, title:makeTitle('YouTube', p.youtubeStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.youtubeStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.photoDates && p.photoDates.length > 0 ? p.photoDates : (p.photoDate ? [p.photoDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.photoStartTime,p.photoEndTime); if(r) events.push({id:`${p.id}_ph_${i}`, title:makeTitle('スチール', p.photoStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.photoStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.exteriorPhotoDates && p.exteriorPhotoDates.length > 0 ? p.exteriorPhotoDates : (p.exteriorPhotoDate ? [p.exteriorPhotoDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.exteriorPhotoStartTime,p.exteriorPhotoEndTime); if(r) events.push({id:`${p.id}_ep_${i}`, title:makeTitle('外観撮影', p.exteriorPhotoStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.exteriorPhotoStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.instaLiveDates && p.instaLiveDates.length > 0 ? p.instaLiveDates : (p.instaLiveDate ? [p.instaLiveDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.instaLiveStartTime,p.instaLiveEndTime); if(r) events.push({id:`${p.id}_il_${i}`, title:makeTitle('InstaLive', p.instaLiveStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.instaLiveStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.instaRegularDates && p.instaRegularDates.length > 0 ? p.instaRegularDates : (p.instaRegularDate ? [p.instaRegularDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.instaRegularStartTime,p.instaRegularEndTime); if(r) events.push({id:`${p.id}_ir_${i}`, title:makeTitle('インスタ投稿', p.instaRegularStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.instaRegularStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.instaPromoDates && p.instaPromoDates.length > 0 ? p.instaPromoDates : (p.instaPromoDate ? [p.instaPromoDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.instaPromoStartTime,p.instaPromoEndTime); if(r) events.push({id:`${p.id}_ip_${i}`, title:makeTitle('インスタ広告', p.instaPromoStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.instaPromoStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
        (p.otherDates && p.otherDates.length > 0 ? p.otherDates : (p.otherDate ? [p.otherDate] : [])).filter(Boolean).forEach((d,i) => { const r=calculateTimeRange(d,p.otherStartTime,p.otherEndTime); if(r) events.push({id:`${p.id}_ot_${i}`, title:makeTitle('その他', p.otherStaff), startTime:r.start, endTime:r.end, location:loc, description:desc+`\n担当: ${(p.otherStaff||[]).join(', ')}`, category:cat, guests:guests, eventType:type}); });
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
        create: `{メンション}\n[info][title]シューログ 物件新規登録通知[/title]\n案件名: {案件名}\n種別: {種別}\n住所: {住所}\n設営日: {設営日}\n撤収日: {撤収日}\n撮影種類: {撮影種類}\n[/info]`,
        update: `{メンション}\n[info][title]シューログ 物件更新通知[/title]\n案件名: {案件名}\n種別: {種別}\n住所: {住所}\n設営日: {設営日}\n撤収日: {撤収日}\n撮影種類: {撮影種類}\n[/info]`,
        remind: `{メンション}\n[info][title]シューログ 明日の撮影リマインド[/title]\n案件名: {案件名}\n撮影タイプ: {撮影タイプ}\n撮影日: {撮影日}\n住所: {住所}\n担当: {撮影担当}\n駐車場: {駐車場}\n[/info]`
    };
    const CW_TAGS = [
        { tag: '{案件名}', label: '案件名' }, { tag: '{住所}', label: '住所' }, { tag: '{種別}', label: '種別' },
        { tag: '{設営日}', label: '設営日' }, { tag: '{撤収日}', label: '撤収日' }, { tag: '{引渡日}', label: '引渡日' },
        { tag: '{YouTube日}', label: 'YouTube日' }, { tag: '{スチール日}', label: 'スチール日' }, { tag: '{インスタライブ日}', label: 'インスタライブ日' },
        { tag: '{撮影種類}', label: '撮影種類' }, { tag: '{営業担当}', label: '営業担当' }, { tag: '{IC担当}', label: 'IC担当' }, { tag: '{工事担当}', label: '工事担当' },
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
            '{案件名}': (prop.customerName || prop.name || '').replace(/[\s\u3000]+/g, ''), '{住所}': prop.address || '', '{種別}': prop.category || '',
            '{営業担当}': prop.salesRep || '', '{IC担当}': prop.icRep || '', '{工事担当}': prop.constructionRep || '',
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

    const handleClearData = async () => {
        if (!confirm('全物件データを削除しますか？この操作は取り消せません。')) return;
        if (!confirm('本当に全て削除しますか？')) return;
        try {
            const { count } = await supabase.from('events').select('*', { count: 'exact', head: true });
            const { error } = await supabase.from('events').delete().gte('createdAt', '1970-01-01');
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
            eventName: prop.eventName||'', eventDates: (() => { let ed = prop.eventDates && prop.eventDates.length > 0 ? [...prop.eventDates] : []; ed = ed.map(d => (d||'').split('T')[0].replace(/\//g,'-')); if(ed.length < 2) { while(ed.length < 2) ed.push(''); } return ed; })(), openHouseDates: editOhDates, handoverDate: hDate,
            youtubeDates: (() => { let d = prop.youtubeDates && prop.youtubeDates.length > 0 ? [...prop.youtubeDates].map(x => (x||'').split('T')[0]) : (prop.youtubeDate ? [(prop.youtubeDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), youtubeStartTime: prop.youtubeStartTime||'', youtubeEndTime: prop.youtubeEndTime||'', youtubeStaff: prop.youtubeStaff||[], youtubeRequested: prop.youtubeRequested||false, youtubeNote: prop.youtubeNote||'',
            photoDates: (() => { let d = prop.photoDates && prop.photoDates.length > 0 ? [...prop.photoDates].map(x => (x||'').split('T')[0]) : (prop.photoDate ? [(prop.photoDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), photoStartTime: prop.photoStartTime||'', photoEndTime: prop.photoEndTime||'', photoStaff: prop.photoStaff||[], photoRequested: prop.photoRequested||false, photoNote: prop.photoNote||'',
            exteriorPhotoDates: (() => { let d = prop.exteriorPhotoDates && prop.exteriorPhotoDates.length > 0 ? [...prop.exteriorPhotoDates].map(x => (x||'').split('T')[0]) : (prop.exteriorPhotoDate ? [(prop.exteriorPhotoDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), exteriorPhotoStartTime: prop.exteriorPhotoStartTime||'', exteriorPhotoEndTime: prop.exteriorPhotoEndTime||'', exteriorPhotoStaff: prop.exteriorPhotoStaff||[], exteriorPhotoRequested: prop.exteriorPhotoRequested||false, exteriorPhotoNote: prop.exteriorPhotoNote||'',
            instaLiveDates: (() => { let d = prop.instaLiveDates && prop.instaLiveDates.length > 0 ? [...prop.instaLiveDates].map(x => (x||'').split('T')[0]) : (prop.instaLiveDate ? [(prop.instaLiveDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), instaLiveStartTime: prop.instaLiveStartTime||'', instaLiveEndTime: prop.instaLiveEndTime||'', instaLiveStaff: prop.instaLiveStaff||[], instaLiveRequested: prop.instaLiveRequested||false, instaLiveNote: prop.instaLiveNote||'',
            instaRegularDates: (() => { let d = prop.instaRegularDates && prop.instaRegularDates.length > 0 ? [...prop.instaRegularDates].map(x => (x||'').split('T')[0]) : (prop.instaRegularDate ? [(prop.instaRegularDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), instaRegularStartTime: prop.instaRegularStartTime||'', instaRegularEndTime: prop.instaRegularEndTime||'', instaRegularStaff: prop.instaRegularStaff||[], instaRegularRequested: prop.instaRegularRequested||false, instaRegularNote: prop.instaRegularNote||'',
            instaPromoDates: (() => { let d = prop.instaPromoDates && prop.instaPromoDates.length > 0 ? [...prop.instaPromoDates].map(x => (x||'').split('T')[0]) : (prop.instaPromoDate ? [(prop.instaPromoDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), instaPromoStartTime: prop.instaPromoStartTime||'', instaPromoEndTime: prop.instaPromoEndTime||'', instaPromoStaff: prop.instaPromoStaff||[], instaPromoRequested: prop.instaPromoRequested||false, instaPromoNote: prop.instaPromoNote||'',
            otherDates: (() => { let d = prop.otherDates && prop.otherDates.length > 0 ? [...prop.otherDates].map(x => (x||'').split('T')[0]) : (prop.otherDate ? [(prop.otherDate||'').split('T')[0]] : ['']); if (d.length === 0) d = ['']; return d; })(), otherStartTime: prop.otherStartTime||'', otherEndTime: prop.otherEndTime||'', otherStaff: prop.otherStaff||[], otherRequested: prop.otherRequested||false, otherNote: prop.otherNote||'',
            notificationStaff: prop.notificationStaff||[], requester: prop.requester||'', shootingTypes: currentTypes, parkingInfo: prop.parkingInfo||'', shootingPoints: prop.shootingPoints||'', witnessStaff: prop.witnessStaff||'', ownerPresence: prop.ownerPresence||'', instructionFileUrl: prop.instructionFileUrl||'', instructionFileName: prop.instructionFileName||'', overviewFileUrl: prop.overviewFileUrl||'', overviewFileName: prop.overviewFileName||'', shootingNotes: prop.shootingNotes||'', contractDate: prop.contractDate||'', contractAmount: prop.contractAmount||'', originalUpdatedAt: prop.updatedAt
        });
        setIsModalOpen(true);
    };
    const handleCategoryChange = (cat) => { let newTypes = []; if (cat === '新築') newTypes = ['スチール', 'YouTube', 'インスタライブ']; else if (cat === 'リフォーム') newTypes = ['スチール', 'YouTube', 'インスタ通常投稿用', 'インスタ宣伝用']; setForm(prev => ({ ...prev, category: cat, shootingTypes: newTypes })); };
    const addFormEventDate = () => setForm(p => ({...p, eventDates: [...(p.eventDates||[]), '']}));
    const updateFormEventDate = (i, v) => { const n = [...(form.eventDates||[])]; n[i] = v; setForm({...form, eventDates: n}); };
    const removeFormEventDate = (i) => { setForm(p => ({...p, eventDates: (p.eventDates||[]).filter((_, idx) => idx !== i)})); };
    const addOpenHouseDate = () => setForm(p => ({...p, openHouseDates: [...p.openHouseDates, '']}));
    const updateOpenHouseDate = (i, v) => { const n = [...form.openHouseDates]; n[i] = v; setForm({...form, openHouseDates: n}); };
    const removeOpenHouseDate = (i) => { setForm(p => ({...p, openHouseDates: p.openHouseDates.filter((_, idx) => idx !== i)})); };
    const addShootingDate = (type) => setForm(prev => ({...prev, [`${type}Dates`]: [...(prev[`${type}Dates`]||[]), '']}));
    const removeShootingDate = (type, idx) => setForm(prev => ({...prev, [`${type}Dates`]: (prev[`${type}Dates`]||[]).filter((_,i) => i !== idx)}));
    const updateShootingDate = (type, idx, val) => setForm(prev => { const dates = [...(prev[`${type}Dates`]||[])]; dates[idx] = val; return {...prev, [`${type}Dates`]: dates}; });
    const resetEventForm = () => { setEventForm({ name:'', category:'新築', customerName:'', address:'', googleMapUrl:'', setupDate_date:'', setupDate_time:'', setupEndTime:'', setupVehicle:'', setupVehicle2:'', teardownDate_date:'', teardownDate_time:'', teardownEndTime:'', teardownVehicle:'', teardownVehicle2:'', eventName:'', eventDates:['',''], handoverDate:'', notificationStaff:[], propertyId:'', propertyName:'', requester:'', shootingTypes:[], shootingRange_from_date:'', shootingRange_from_time:'', shootingRange_to_date:'', shootingRange_to_time:'', instructionFileUrl:'', instructionFileName:'', overviewFileUrl:'', overviewFileName:'', witnessStaff:'', ownerPresence:'', shootingNotes:'', systemId:'', salesRep:'', icRep:'', constructionRep:'' }); setShowEventPropertySearch(false); setEventPropertySearch(''); };
    const openNewEventModal = () => { setRequestMode('event'); setIsRequestModalOpen(true); setReqSearch({keyword:'', category:'新築', staff:'', contractFrom:'2020-01', contractTo:'', handoverFrom:'', handoverTo:''}); };
    const selectPropertyForEvent = async (deal) => {
        setIsRequestModalOpen(false);
        const cat = deal.deal_category || deal.category || '新築';
        const mappedCategory = cat === 'リフォーム' ? 'リフォーム' : '新築';
        let address = deal.construction_location || '';
        if (!address && deal.customer_andpad_id) {
            const { data: custData } = await supabase.from('customers').select('address,prefecture').eq('andpad_id', String(deal.customer_andpad_id)).limit(1);
            if (custData && custData[0]) { address = [custData[0].prefecture, custData[0].address].filter(Boolean).join(''); }
        }
        const sysId = deal.andpad_id ? String(deal.andpad_id) : '';
        if (sysId) {
            const existing = properties.find(p => p.systemId === sysId);
            if (existing) { openEditEventModal(existing); return; }
        }
        setEditingEventId(null); resetEventForm();
        setEventForm(prev => ({ ...prev, propertyId: deal.id || '', propertyName: `${deal.customer_name||''} ${deal.name||''}`.trim(), name: deal.name || '', category: mappedCategory, customerName: deal.customer_name || '', address: address, googleMapUrl: deal.google_map_url || '', systemId: deal.andpad_id ? String(deal.andpad_id) : '', salesRep: deal.role_sales || '', icRep: deal.role_ic || '', constructionRep: deal.role_construction || '', handoverDate: deal.handover_date_actual || deal.handover_date_planned || '' }));
        setShowEventPropertySearch(false); setEventPropertySearch('');
        setIsEventModalOpen(true);
    };
    const openEditEventModal = (evt) => {
        setEditingEventId(evt.id);
        const [sd, st] = (evt.setupDate || '').split('T'); const [td, tt] = (evt.teardownDate || '').split('T');
        let eDates = evt.eventDates && evt.eventDates.length > 0 ? [...evt.eventDates] : ['', ''];
        eDates = eDates.map(d => (d || '').split('T')[0].replace(/\//g, '-')); if (eDates.length < 2) eDates.push('');
        const [srfd, srft] = (evt.shootingRangeFrom || '').split('T'); const [srtd, srtt] = (evt.shootingRangeTo || '').split('T');
        setEventForm({ name: evt.name||'', category: evt.category||'新築', customerName: evt.customerName||'', address: evt.address||'', googleMapUrl: evt.googleMapUrl||'', eventName: evt.eventName||'', handoverDate: evt.handoverDate||'', systemId: evt.systemId||'', salesRep: evt.salesRep||'', icRep: evt.icRep||'', constructionRep: evt.constructionRep||'', setupDate_date: sd||'', setupDate_time: st?.substring(0,5)||'', setupEndTime: evt.setupEndTime||'', setupVehicle: evt.setupVehicle||'', setupVehicle2: evt.setupVehicle2||'', teardownDate_date: td||'', teardownDate_time: tt?.substring(0,5)||'', teardownEndTime: evt.teardownEndTime||'', teardownVehicle: evt.teardownVehicle||'', teardownVehicle2: evt.teardownVehicle2||'', eventDates: eDates, notificationStaff: evt.notificationStaff||[], propertyId: evt.propertyId||'', propertyName: evt.propertyName||'', requester: evt.requester||'', shootingTypes: evt.shootingTypes||[], shootingRange_from_date: srfd||'', shootingRange_from_time: srft?.substring(0,5)||'', shootingRange_to_date: srtd||'', shootingRange_to_time: srtt?.substring(0,5)||'', instructionFileUrl: evt.instructionFileUrl||'', instructionFileName: evt.instructionFileName||'', overviewFileUrl: evt.overviewFileUrl||'', overviewFileName: evt.overviewFileName||'', witnessStaff: evt.witnessStaff||'', ownerPresence: evt.ownerPresence||'', shootingNotes: evt.shootingNotes||'' });
        setShowEventPropertySearch(false); setEventPropertySearch('');
        setIsEventModalOpen(true);
    };
    const saveEvent = async (e) => {
        e.preventDefault(); if(!eventForm.name){alert("イベント名必須");return;}
        const setup = eventForm.setupDate_date ? `${eventForm.setupDate_date}T${eventForm.setupDate_time || '00:00'}` : '';
        const teardown = eventForm.teardownDate_date ? `${eventForm.teardownDate_date}T${eventForm.teardownDate_time || '00:00'}` : '';
        const validDates = eventForm.eventDates.filter(d => d);
        const srFrom = eventForm.shootingRange_from_date ? `${eventForm.shootingRange_from_date}T${eventForm.shootingRange_from_time || '00:00'}` : '';
        const srTo = eventForm.shootingRange_to_date ? `${eventForm.shootingRange_to_date}T${eventForm.shootingRange_to_time || '00:00'}` : '';
        const data = { name: eventForm.name, category: eventForm.category, "customerName": eventForm.customerName, address: eventForm.address, "googleMapUrl": eventForm.googleMapUrl, setupDate: setup, setupEndTime: eventForm.setupEndTime, setupVehicle: eventForm.setupVehicle, setupVehicle2: eventForm.setupVehicle2, teardownDate: teardown, teardownEndTime: eventForm.teardownEndTime, teardownVehicle: eventForm.teardownVehicle, teardownVehicle2: eventForm.teardownVehicle2, "eventName": eventForm.eventName, eventDates: validDates, "handoverDate": eventForm.handoverDate, notificationStaff: eventForm.notificationStaff, "systemId": eventForm.systemId, "salesRep": eventForm.salesRep, "icRep": eventForm.icRep, "constructionRep": eventForm.constructionRep, updatedAt: new Date().toISOString() };
        try { if(editingEventId) { const{error}=await supabase.from('events').update(data).eq('id',editingEventId); if(error) throw error; } else { const{error}=await supabase.from('events').insert(data); if(error) throw error; } setIsEventModalOpen(false); showNotification('イベント保存完了'); } catch(err) { alert('保存失敗: '+err.message); }
    };
    const deleteEvent = async (id) => { const item = properties.find(p=>p.id===id); const name = item ? (item.customerName ? `${item.customerName} ${item.name||''}`.trim() : item.name||'') : ''; const ok = await showConfirm('データの削除', `「${name || 'この項目'}」を削除しますか？\nこの操作は取り消せません。`); if(!ok) return; const{error}=await supabase.from('events').delete().eq('id',id); if(error){alert('削除失敗');return;} showNotification('削除完了'); if(editingEventId===id) setIsEventModalOpen(false); if(editingId===id) setIsModalOpen(false); };
    const addEventDate = () => setEventForm(p => ({...p, eventDates: [...p.eventDates, '']}));
    const updateEventDate = (i, v) => { const n = [...eventForm.eventDates]; n[i] = v; setEventForm({...eventForm, eventDates: n}); };
    const removeEventDate = (i) => { setEventForm(p => ({...p, eventDates: p.eventDates.filter((_, idx) => idx !== i)})); };
    const openRequestModal = () => { setRequestMode('shoot'); setIsRequestModalOpen(true); setReqSearch({keyword:'', category:'新築', staff:'', contractFrom:'2020-01', contractTo:'', handoverFrom:'', handoverTo:''}); };
    const selectPropertyForRequest = async (deal) => {
        setIsRequestModalOpen(false);
        const cat = deal.deal_category || deal.category || '新築';
        const mappedCategory = cat === 'リフォーム' ? 'リフォーム' : '新築';
        const sysId = deal.andpad_id ? String(deal.andpad_id) : '';
        if (sysId) {
            const existing = properties.find(p => p.systemId === sysId);
            if (existing) { openEditModal(existing); setScrollToRequest(true); return; }
        }
        // customersテーブルから住所を取得（deals.customer_andpad_id → customers.andpad_id）
        let address = deal.construction_location || '';
        if (!address && deal.customer_andpad_id) {
            const { data: custData } = await supabase.from('customers').select('address,prefecture').eq('andpad_id', String(deal.customer_andpad_id)).limit(1);
            if (custData && custData[0]) {
                const c = custData[0];
                address = [c.prefecture, c.address].filter(Boolean).join('');
            }
        }
        const dealAsProp = {
            id: null, name: deal.name || '', customerName: deal.customer_name || '', address,
            category: mappedCategory, salesRep: deal.role_sales || '', icRep: deal.role_ic || '', constructionRep: deal.role_construction || '',
            contractDate: deal.order_date || '', handoverDate: deal.handover_date_actual || deal.handover_date_planned || '',
            contractAmount: deal.order_amount || '', systemId: String(deal.andpad_id || ''), mainStore: deal.label_office || ''
        };
        openEditModal(dealAsProp); setScrollToRequest(true);
    };
    const saveProperty = async (e) => {
        e.preventDefault(); const setup = form.setupDate_date ? `${form.setupDate_date}T${form.setupDate_time || '00:00'}` : ''; const teardown = form.teardownDate_date ? `${form.teardownDate_date}T${form.teardownDate_time || '00:00'}` : ''; const sFrom = form.shootingRange_from_date ? `${form.shootingRange_from_date}T${form.shootingRange_from_time || '00:00'}` : ''; const sTo = form.shootingRange_to_date ? `${form.shootingRange_to_date}T${form.shootingRange_to_time || '00:00'}` : ''; const validOh = form.openHouseDates.filter(d => d);
        const buildMediaDate = (d, t) => d ? (t ? `${d}T${t}:00` : d) : '';
        const SHOOT_LOG_COLS = ['name','address','category','furnitureSetup','customerName','customerLat','customerLon','mainStore','googleMapUrl','eventName','eventDates','setupEndTime','setupVehicle','setupVehicle2','teardownEndTime','teardownVehicle','teardownVehicle2','openHouseDate','openHouseDates','handoverDate','handoverSource','youtubeStartTime','youtubeEndTime','youtubeStaff','youtubeRequested','youtubeNote','photoStartTime','photoEndTime','photoStaff','photoRequested','photoNote','exteriorPhotoStartTime','exteriorPhotoEndTime','exteriorPhotoStaff','exteriorPhotoRequested','exteriorPhotoNote','instaLiveStartTime','instaLiveEndTime','instaLiveStaff','instaLiveRequested','instaLiveNote','instaRegularStartTime','instaRegularEndTime','instaRegularStaff','instaRegularRequested','instaRegularNote','instaPromoStartTime','instaPromoEndTime','instaPromoStaff','instaPromoRequested','instaPromoNote','otherStartTime','otherEndTime','otherStaff','otherRequested','otherNote','notificationStaff','systemId','salesRep','icRep','constructionRep','requester','shootingTypes','parkingInfo','shootingPoints','witnessStaff','ownerPresence','instructionFileUrl','instructionFileName','overviewFileUrl','overviewFileName','shootingNotes','contractDate','contractAmount','youtubeDates','photoDates','exteriorPhotoDates','instaLiveDates','instaRegularDates','instaPromoDates','otherDates'];
        const data = {};
        SHOOT_LOG_COLS.forEach(k => { if (form[k] !== undefined) data[k] = form[k]; });
        const validEventDates = (form.eventDates||[]).filter(d => d);
        const firstDate = (arr) => (arr && arr.length > 0) ? arr.find(d => d) || '' : '';
        Object.assign(data, { setupDate: setup, teardownDate: teardown, shootingRangeFrom: sFrom, shootingRangeTo: sTo, eventDates: validEventDates, openHouseDates: validOh, openHouseDate: validOh[0]||'', youtubeDate: buildMediaDate(firstDate(form.youtubeDates), form.youtubeStartTime), photoDate: buildMediaDate(firstDate(form.photoDates), form.photoStartTime), exteriorPhotoDate: buildMediaDate(firstDate(form.exteriorPhotoDates), form.exteriorPhotoStartTime), instaLiveDate: buildMediaDate(firstDate(form.instaLiveDates), form.instaLiveStartTime), instaRegularDate: buildMediaDate(firstDate(form.instaRegularDates), form.instaRegularStartTime), instaPromoDate: buildMediaDate(firstDate(form.instaPromoDates), form.instaPromoStartTime), otherDate: buildMediaDate(firstDate(form.otherDates), form.otherStartTime), youtubeDates: (form.youtubeDates||[]).filter(d => d), photoDates: (form.photoDates||[]).filter(d => d), exteriorPhotoDates: (form.exteriorPhotoDates||[]).filter(d => d), instaLiveDates: (form.instaLiveDates||[]).filter(d => d), instaRegularDates: (form.instaRegularDates||[]).filter(d => d), instaPromoDates: (form.instaPromoDates||[]).filter(d => d), otherDates: (form.otherDates||[]).filter(d => d), updatedAt: new Date().toISOString() });
        try {
            let tid = editingId;
            if(editingId) { const { data: result, error } = await supabase.from('events').update(data).eq('id', editingId).eq('updatedAt', form.originalUpdatedAt).select(); if(error) throw error.message; if(!result || result.length === 0) throw "他者が更新しました"; }
            else { const { data: result, error } = await supabase.from('events').insert(data).select(); if(error) throw error.message; tid = result[0].id; }
            const oldProp = editingId ? properties.find(x=>x.id===editingId) : null;
            const isNew = !editingId;
            setIsModalOpen(false); showNotification('保存完了'); autoSyncCalendar({...data, id: tid}, oldProp); sendChatworkNotification({...data, id: tid}, isNew);
        } catch(err) { alert(typeof err==='string'?err:err.message); }
    };
    const clearPropertySchedule = async (id) => {
        if(!confirm('スケジュール情報を削除しますか？'))return;
        try {
            const up={setupDate:'',teardownDate:'',setupEndTime:'',teardownEndTime:'',setupVehicle:'',setupVehicle2:'',teardownVehicle:'',teardownVehicle2:'',shootingRangeFrom:'',shootingRangeTo:'',openHouseDate:'',openHouseDates:[],youtubeDate:'',youtubeDates:[],youtubeStartTime:'',youtubeEndTime:'',youtubeStaff:[],youtubeRequested:false,youtubeNote:'',photoDate:'',photoDates:[],photoStartTime:'',photoEndTime:'',photoStaff:[],photoRequested:false,photoNote:'',exteriorPhotoDate:'',exteriorPhotoDates:[],exteriorPhotoStartTime:'',exteriorPhotoEndTime:'',exteriorPhotoStaff:[],exteriorPhotoRequested:false,exteriorPhotoNote:'',instaLiveDate:'',instaLiveDates:[],instaLiveStartTime:'',instaLiveEndTime:'',instaLiveStaff:[],instaLiveRequested:false,instaLiveNote:'',instaRegularDate:'',instaRegularDates:[],instaRegularStartTime:'',instaRegularEndTime:'',instaRegularStaff:[],instaRegularRequested:false,instaRegularNote:'',instaPromoDate:'',instaPromoDates:[],instaPromoStartTime:'',instaPromoEndTime:'',instaPromoStaff:[],instaPromoRequested:false,instaPromoNote:'',otherDate:'',otherDates:[],otherStartTime:'',otherEndTime:'',otherStaff:[],otherRequested:false,otherNote:'',notificationStaff:[],furnitureSetup:'なし',requester:'',shootingTypes:[],parkingInfo:'',shootingPoints:'',witnessStaff:'',ownerPresence:'',instructionFileUrl:'',instructionFileName:'',overviewFileUrl:'',overviewFileName:'',shootingNotes:''};
            const { error } = await supabase.from('events').update(up).eq('id', id); if(error) throw error.message;
            showNotification('クリア完了'); if(editingId===id)setIsModalOpen(false);
            const p = properties.find(x=>x.id===id); if(p) autoSyncCalendar({...p, ...up}, p);
        } catch(e){ alert('失敗:'+e.message); }
    };

    const DEFAULT_HELP = `## ヘッダーボタン一覧

![ヘッダーボタン](https://vkovflhltggyrgimeabp.supabase.co/storage/v1/object/public/documents/help/header-buttons.png)

## 撮影依頼の手順

1. ヘッダー右上の「撮影依頼」ボタンをクリック
2. 物件検索画面が開きます。フリーワード・事業部・担当者・契約日・引渡日で物件を検索

![撮影依頼 案件選択](https://vkovflhltggyrgimeabp.supabase.co/storage/v1/object/public/documents/help/request-modal.png)

3. 該当する物件をクリックして選択
4. 物件編集画面の「撮影依頼」セクションが表示されます
5. 依頼者・撮影種類・撮影可能期間・撮影指示書などを入力
6. 「保存する」をクリックして完了

## イベント追加の手順

1. ヘッダー右上の「イベント追加」ボタンをクリック
2. イベント名を入力し、事業部を選択

![イベント登録 物件検索](https://vkovflhltggyrgimeabp.supabase.co/storage/v1/object/public/documents/help/event-property-search.png)

3. 開催物件がある場合は「開催物件を選択」ボタンから物件を検索・選択
4. 物件を選択すると、撮影依頼の入力項目が表示されます

![イベント登録 撮影依頼付き](https://vkovflhltggyrgimeabp.supabase.co/storage/v1/object/public/documents/help/event-with-shooting.png)

5. スケジュール（設営日・撤収日・イベント日程）を入力
6. 必要に応じて通知スタッフを設定
7. 「保存する」をクリックして完了

## その他のヒント

- リスト表示では年月フィルタで絞り込みが可能です
- カレンダー表示では月ごとのスケジュールを確認できます
- ANDPAD取込でANDPADの案件データを一括インポートできます
- チャットワーク通知は設定画面から有効化できます`;

    const loadHelpContent = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'help_content').single();
        setHelpContent(data?.value || DEFAULT_HELP);
    };
    const saveHelpContent = async () => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'help_content', value: helpContent }, { onConflict: 'key' });
        if (error) { alert('保存失敗: ' + error.message); return; }
        showNotification('ヘルプ内容を保存しました');
    };
    const [isEditingHelp, setIsEditingHelp] = useState(false);

    const DEFAULT_FAQ = `## 撮影依頼について

Q. 撮影依頼はどこからできますか？
A. ヘッダー右上の「撮影依頼」ボタンから物件を検索・選択して依頼できます。

Q. 撮影種類は複数選択できますか？
A. はい、スチール・YouTube・インスタライブなど複数選択可能です。

## イベントについて

Q. イベントに物件を紐付けるには？
A. イベント登録画面の「開催物件を選択」ボタンから検索・選択してください。

Q. イベント日程は複数設定できますか？
A. はい、「+ 追加」ボタンで複数日程を設定できます。

## ANDPAD連携

Q. ANDPAD取込で物件が見つかりません
A. 引渡日の年月範囲を広げて再度取込みをお試しください。

## 通知について

Q. チャットワーク通知はどう設定しますか？
A. ヘッダーのチャットワーク設定アイコンからルームIDと通知タイミングを設定してください。`;

    const loadFaqContent = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'faq_content').single();
        setFaqContent(data?.value || DEFAULT_FAQ);
    };
    const saveFaqContent = async () => {
        const { error } = await supabase.from('app_settings').upsert({ key: 'faq_content', value: faqContent }, { onConflict: 'key' });
        if (error) { alert('保存失敗: ' + error.message); return; }
        showNotification('FAQ内容を保存しました');
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>;

    return (
        <div className="min-h-screen pb-20">
            {/* Header, Main Content same as before */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3"><svg width="38" height="38" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="6" fill="#C5A070"/><rect y="14.5" width="40" height="3" fill="white"/><circle cx="20" cy="20" r="11" fill="white"/><circle cx="20" cy="20" r="7.5" fill="#C5A070"/><circle cx="20" cy="20" r="4" fill="white"/><circle cx="20" cy="20" r="2" fill="white"/><circle cx="31" cy="8" r="2.8" fill="white"/></svg><div><h1 className="text-lg font-bold tracking-tight text-primary leading-none">シューログ 現場撮影管理</h1><p className="text-xs text-gray-400 font-medium tracking-wider">SUNPRO SHOOT LOG</p></div><div className="flex gap-1 ml-1"><button onClick={()=>{loadHelpContent();setIsHelpModalOpen(true);}} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-primary px-2 py-0.5 hover:bg-gray-100 rounded transition-colors border border-gray-200" title="使い方ガイド"><Icon name="book-open" size={11}/><span className="hidden sm:inline">使い方</span></button><button onClick={()=>{loadFaqContent();setIsFaqModalOpen(true);}} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-primary px-2 py-0.5 hover:bg-gray-100 rounded transition-colors border border-gray-200" title="よくあるご質問"><Icon name="message-circle" size={11}/><span className="hidden sm:inline">FAQ</span></button></div></div>
                    <div className="flex items-center gap-2">
                        <button onClick={openNewEventModal} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"><Icon name="calendar-plus" size={16} className="text-purple-500" /> イベント追加</button>
                        <button onClick={openRequestModal} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"><Icon name="camera" size={16} className="text-accent" /> 撮影依頼</button>
                        <div className="relative"><button onClick={()=>setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-full transition-colors" title="メニュー"><Icon name="menu" size={22}/></button>{isMenuOpen && (<><div className="fixed inset-0 z-40" onClick={()=>setIsMenuOpen(false)}/><div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-56 z-50 animate-enter">{[{label:'スタッフ管理',icon:'users',action:()=>{setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''});setIsStaffModalOpen(true);}},{label:'設備管理',icon:'package',action:()=>{setEquipmentForm({id:'',name:'',email:'',type:'設備'});setIsEquipmentModalOpen(true);}},{label:'チャットワーク設定',icon:'message-square',action:()=>setIsSettingsModalOpen(true)},{label:'支店振分管理',icon:'map-pin',action:()=>setIsBranchModalOpen(true)}].map(item=>(<button key={item.label} onClick={()=>{item.action();setIsMenuOpen(false);}} disabled={item.disabled} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors disabled:opacity-50"><Icon name={item.icon} size={18}/>{item.label}</button>))}</div></>)}</div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-1 mb-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-2 bg-gray-200 rounded-xl px-3 py-2 border border-gray-300"><span className="text-sm font-bold text-gray-600 whitespace-nowrap">設営日:</span><Icon name="calendar-days" size={18} className="text-gray-500" /><input type="month" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="bg-transparent text-sm font-semibold outline-none text-gray-700 w-28" /><span className="text-gray-300">→</span><input type="month" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="bg-transparent text-sm font-semibold outline-none text-gray-700 w-28" /></div>
                            <div className="flex items-center gap-1 flex-wrap">{[0, 1, 2].map(o => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + o); const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; const isActive = filterFrom === ym && filterTo === ym; return (<button key={o} onClick={() => setQuickFilter(o)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isActive ? 'bg-accent text-white' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>{o === 0 ? '今月' : o === 1 ? '来月' : '再来月'}</button>); })}{(() => { const s = new Date(); s.setDate(1); const e = new Date(); e.setDate(1); e.setMonth(e.getMonth() + 3); const sf = `${s.getFullYear()}-${(s.getMonth() + 1).toString().padStart(2, '0')}`; const ef = `${e.getFullYear()}-${(e.getMonth() + 1).toString().padStart(2, '0')}`; const isActive = filterFrom === sf && filterTo === ef; return <button onClick={setFourMonthsFilter} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isActive ? 'bg-accent text-white' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}>4ヶ月分</button>; })()}<button type="button" onClick={() => setShowNoDateProperties(!showNoDateProperties)} className="flex items-center gap-1.5 cursor-pointer ml-2"><span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${showNoDateProperties ? 'bg-accent border-accent' : 'border-gray-400 bg-white'}`}>{showNoDateProperties && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</span><span className="text-xs font-bold text-gray-500 whitespace-nowrap">日程未設定を表示</span></button></div>
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            <div className="flex bg-gray-100/50 p-1 rounded-xl">{['list', 'calendar'].map(m => (<button key={m} onClick={() => setViewMode(m)} className={`p-2 rounded-lg transition-all ${viewMode === m ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Icon name={m === 'list' ? 'list' : 'calendar'} size={20} /></button>))}</div>
                            <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${isFilterExpanded ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}><Icon name="list-filter" size={16} /> フィルター</button>
                        </div>
                    </div>
                    {isFilterExpanded && (
                        <div className="border-t border-gray-100 p-6 grid grid-cols-1 md:grid-cols-[0.7fr_1.3fr_0.7fr_1.3fr] gap-6 animate-enter">
                            <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">事業部</h3><div className="flex flex-wrap gap-1.5">{CATEGORIES.map(c=><button key={c} onClick={()=>toggleFilterCategory(c)} className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${selectedCategories.includes(c)?'bg-accent text-white shadow-sm':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{c}</button>)}</div></div>
                            <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">支店</h3><div className="flex flex-wrap gap-1.5">{BRANCHES.map(b=><button key={b} onClick={()=>toggleFilterBranch(b)} className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${selectedBranches.includes(b)?'bg-accent text-white shadow-sm':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{BRANCH_LABELS[b]}</button>)}</div></div>
                            <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">種別</h3><div className="flex flex-wrap gap-1.5">{['イベント','撮影'].map(t=><button key={t} onClick={()=>toggleFilterScheduleType(t)} className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${selectedScheduleTypes.includes(t)?'bg-accent text-white shadow-sm':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{t}</button>)}</div></div>
                            <div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">キーワード</h3><div className="relative"><Icon name="search" size={18} className="absolute left-3 top-3 text-gray-300" /><input type="text" value={searchKeyword} onChange={e=>setSearchKeyword(e.target.value)} placeholder="案件名, 担当者..." className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent"/></div></div>
                        </div>
                    )}
                </div>

                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase font-bold tracking-wider"><th className="px-2 py-3 w-[12%]">ステータス</th><th className="px-2 py-3 w-[31%]">案件情報</th><th className="px-2 py-3 w-[25%]">スケジュール</th><th className="px-2 py-3 w-[25%]">撮影</th><th className="px-2 py-3 text-center w-[7%]">操作</th></tr></thead>
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
                                            {group.items.map(item => {
                                                if (item._type === 'event') {
                                                    const evt = item;
                                                    const evtSchedule = [
                                                        { label: '設営', date: evt.setupDate, endTime: evt.setupEndTime, color: 'text-indigo-600' },
                                                        { label: '撤収', date: evt.teardownDate, endTime: evt.teardownEndTime, color: 'text-amber-600' },
                                                        ...(evt.eventDates || []).filter(Boolean).map(d => ({ label: 'イベント', date: d, endTime: '', color: 'text-purple-600' })),
                                                        { label: '引渡', date: evt.handoverDate, color: 'text-emerald-600' }
                                                    ].filter(i => i.date).sort((a,b) => new Date(a.date) - new Date(b.date));
                                                    return (
                                                        <tr key={`evt-${evt.id}`} className="hover:bg-teal-50 transition-colors border-b-2 border-gray-300 bg-teal-50/30">
                                                            <td className="px-2 py-3 align-top">{(() => { const evtBranch = getAreaBranchDynamic(evt.address, evt.category); return (<div className="flex flex-col gap-1 items-start"><span className="px-1.5 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">イベント</span>{((evt.shootingTypes && evt.shootingTypes.length > 0) || evt.shootingRangeFrom || (evt.youtubeDates && evt.youtubeDates.filter(Boolean).length > 0) || evt.youtubeDate || (evt.photoDates && evt.photoDates.filter(Boolean).length > 0) || evt.photoDate || (evt.exteriorPhotoDates && evt.exteriorPhotoDates.filter(Boolean).length > 0) || evt.exteriorPhotoDate || (evt.instaLiveDates && evt.instaLiveDates.filter(Boolean).length > 0) || evt.instaLiveDate || (evt.instaRegularDates && evt.instaRegularDates.filter(Boolean).length > 0) || evt.instaRegularDate || (evt.instaPromoDates && evt.instaPromoDates.filter(Boolean).length > 0) || evt.instaPromoDate || (evt.otherDates && evt.otherDates.filter(Boolean).length > 0) || evt.otherDate) && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">撮影</span>}<span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">{evt.category}</span>{evtBranch && <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${evtBranch.class}`}>{evtBranch.name}</span>}</div>); })()}</td>
                                                            <td className="px-2 py-3 align-top">
                                                                {(() => { const hasCustomer = evt.customerName && evt.customerName !== '顧客なし'; const hasName = evt.name && evt.name !== '案件なし'; if (hasCustomer) return <><div className="font-bold text-sm text-gray-900 mb-0.5">{evt.customerName}<span className="text-xs font-normal ml-1 text-gray-600">様</span></div><div className="text-xs text-gray-500 font-medium mb-1">{hasName ? evt.name : ''}</div></>; return <div className="font-bold text-sm text-gray-900 mb-0.5">{evt.eventName || <span className="text-gray-400 font-normal">イベント名未設定</span>}</div>; })()}
                                                                {evt.address && <div className="text-sm text-gray-500 flex items-center gap-1 mb-2"><Icon name="map-pin" size={14}/> {evt.address}</div>}
                                                                <div className="flex flex-wrap gap-2 text-sm text-gray-400 font-medium">{evt.salesRep && <span>営:{formatRepName(evt.salesRep)}</span>}{evt.icRep && <span>IC:{formatRepName(evt.icRep)}</span>}</div>
                                                            </td>
                                                            <td className="px-2 py-3 align-top">
                                                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-start">
                                                                    {evtSchedule.map((s, idx) => (
                                                                        <React.Fragment key={idx}>
                                                                            <span className={`font-bold ${s.color} pt-0.5 whitespace-nowrap`}>{s.label}</span>
                                                                            {s.isRange ? (
                                                                                <span className="font-normal text-gray-700 whitespace-nowrap">{formatDateTime(s.date)}<span className="text-[10px] text-gray-400"> → </span>{formatDateTime(s.to)}</span>
                                                                            ) : (
                                                                                <span className="font-normal text-gray-700">{formatDateTime(s.date)}{s.endTime && <span className="text-[10px] text-gray-400 font-normal"> → <span className="text-[11px]">{s.endTime}</span></span>}</span>
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3 align-top">
                                                                <div className="space-y-1">
                                                                    {evt.shootingRangeFrom && <><div className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20 font-bold text-amber-600 text-sm">撮影可能</span><span className="font-normal text-gray-700">{formatDateTime(evt.shootingRangeFrom)}</span></div><div className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20"></span><span className="font-normal text-gray-700"><span className="text-[10px] text-gray-400">→ </span>{formatDateTime(evt.shootingRangeTo)}</span></div></>}
                                                                    {[...((evt.youtubeDates && evt.youtubeDates.length > 0 ? evt.youtubeDates : (evt.youtubeDate ? [evt.youtubeDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'YouTube' : '', d, s: i===0 ? evt.youtubeStartTime : '', e: i===0 ? evt.youtubeEndTime : '', r: i===0 ? evt.youtubeRequested : false}))), ...((evt.photoDates && evt.photoDates.length > 0 ? evt.photoDates : (evt.photoDate ? [evt.photoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'スチール' : '', d, s: i===0 ? evt.photoStartTime : '', e: i===0 ? evt.photoEndTime : '', r: i===0 ? evt.photoRequested : false}))), ...((evt.exteriorPhotoDates && evt.exteriorPhotoDates.length > 0 ? evt.exteriorPhotoDates : (evt.exteriorPhotoDate ? [evt.exteriorPhotoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? '外観撮影' : '', d, s: i===0 ? evt.exteriorPhotoStartTime : '', e: i===0 ? evt.exteriorPhotoEndTime : '', r: i===0 ? evt.exteriorPhotoRequested : false}))), ...((evt.instaLiveDates && evt.instaLiveDates.length > 0 ? evt.instaLiveDates : (evt.instaLiveDate ? [evt.instaLiveDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'InstaLive' : '', d, s: i===0 ? evt.instaLiveStartTime : '', e: i===0 ? evt.instaLiveEndTime : '', r: i===0 ? evt.instaLiveRequested : false}))), ...((evt.instaRegularDates && evt.instaRegularDates.length > 0 ? evt.instaRegularDates : (evt.instaRegularDate ? [evt.instaRegularDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'インスタ投稿' : '', d, s: i===0 ? evt.instaRegularStartTime : '', e: i===0 ? evt.instaRegularEndTime : '', r: i===0 ? evt.instaRegularRequested : false}))), ...((evt.instaPromoDates && evt.instaPromoDates.length > 0 ? evt.instaPromoDates : (evt.instaPromoDate ? [evt.instaPromoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'インスタ広告' : '', d, s: i===0 ? evt.instaPromoStartTime : '', e: i===0 ? evt.instaPromoEndTime : '', r: i===0 ? evt.instaPromoRequested : false}))), ...((evt.otherDates && evt.otherDates.length > 0 ? evt.otherDates : (evt.otherDate ? [evt.otherDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'その他' : '', d, s: i===0 ? evt.otherStartTime : '', e: i===0 ? evt.otherEndTime : '', r: i===0 ? evt.otherRequested : false})))].map((m,idx)=>(
                                                                        <div key={idx} className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20 font-bold text-gray-400 text-sm flex items-center gap-0.5">{m.l}{m.r && <Icon name="circle-check" size={14} className="text-green-500 flex-shrink-0"/>}</span><span className="font-normal text-gray-700">{formatDateTime(m.d)}{m.e && <span className="text-[10px] text-gray-400 font-normal"> → <span className="text-[11px]">{m.e}</span></span>}</span></div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3 align-top text-center w-20">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="flex justify-center gap-2"><button onClick={() => openEditModal(evt)} className="text-gray-400 hover:text-primary transition-colors"><Icon name="pencil" size={20} /></button><button onClick={() => deleteEvent(evt.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Icon name="trash-2" size={20} /></button></div>
                                                                    {evt.googleMapUrl && <a href={evt.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 bg-blue-50 w-full">MAP <Icon name="external-link" size={11}/></a>}
                                                                    {evt.systemId && <a href={`https://andpad.jp/manager/my/orders/${evt.systemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 bg-red-50 w-full">ANDPAD <Icon name="external-link" size={11}/></a>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                const prop = item;
                                                const branch = getAreaBranchDynamic(prop.address, prop.category);
                                                const scheduleItems = [
                                                    { type: 'setup', date: prop.setupDate, endTime: prop.setupEndTime, label: '設営', color: 'text-blue-500' },
                                                    { type: 'teardown', date: prop.teardownDate, endTime: prop.teardownEndTime, label: '撤収', color: 'text-orange-500' },
                                                    ...(prop.eventDates && prop.eventDates.length > 0 ? prop.eventDates : []).filter(Boolean).map(d => ({ type: 'event', date: d, label: 'イベント', color: 'text-purple-600' })),
                                                    { type: 'handover', date: prop.handoverDate, label: '引渡', color: 'text-emerald-600', extra: prop.handoverSource }
                                                ].filter(i => i.date).sort((a,b) => new Date(a.date) - new Date(b.date));

                                                const hasShooting = !!(prop.shootingRangeFrom || (prop.youtubeDates && prop.youtubeDates.filter(Boolean).length > 0) || prop.youtubeDate || (prop.photoDates && prop.photoDates.filter(Boolean).length > 0) || prop.photoDate || (prop.exteriorPhotoDates && prop.exteriorPhotoDates.filter(Boolean).length > 0) || prop.exteriorPhotoDate || (prop.instaLiveDates && prop.instaLiveDates.filter(Boolean).length > 0) || prop.instaLiveDate || (prop.instaRegularDates && prop.instaRegularDates.filter(Boolean).length > 0) || prop.instaRegularDate || (prop.instaPromoDates && prop.instaPromoDates.filter(Boolean).length > 0) || prop.instaPromoDate || (prop.otherDates && prop.otherDates.filter(Boolean).length > 0) || prop.otherDate);
                                                return (
                                                    <tr key={prop.id} className="hover:bg-yellow-50 transition-colors border-b-2 border-gray-300">
                                                        <td className="px-2 py-3 align-top"><div className="flex flex-col gap-1 items-start">{hasShooting && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">撮影</span>}<span className="px-1.5 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">{prop.category}</span>{branch && <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${branch.class}`}>{branch.name}</span>}</div></td>
                                                        <td className="px-2 py-3 align-top">
                                                            <div className="font-bold text-sm text-gray-900 mb-0.5">{prop.customerName ? <>{prop.customerName}<span className="text-xs font-normal ml-1 text-gray-600">様</span></> : <span className="text-gray-400 font-normal">顧客名未設定</span>}</div>
                                                            <div className="text-xs text-gray-500 font-medium mb-1">{prop.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1 mb-2"><Icon name="map-pin" size={14}/> {prop.address}</div>
                                                            <div className="flex flex-wrap gap-2 text-sm text-gray-400 font-medium">{prop.salesRep && <span>営:{formatRepName(prop.salesRep)}</span>}{prop.icRep && <span>IC:{formatRepName(prop.icRep)}</span>}</div>
                                                        </td>
                                                        <td className="px-2 py-3 align-top">
                                                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-start">
                                                                {scheduleItems.map((si, idx) => (
                                                                    <React.Fragment key={idx}>
                                                                        <span className={`font-bold ${si.color} pt-0.5 whitespace-nowrap`}>{si.label}</span>
                                                                        {si.isRange ? (
                                                                            <span className="font-normal text-gray-700 whitespace-nowrap">{formatDateTime(si.date)}<span className="text-[10px] text-gray-400"> → </span>{formatDateTime(si.to)}</span>
                                                                        ) : (
                                                                            <span className="font-normal text-gray-700 whitespace-nowrap">
                                                                                {si.type === 'openhouse' || si.type === 'handover' ? formatDate(si.date) : formatDateTime(si.date)}
                                                                                {si.endTime && <span className="text-[10px] text-gray-400 font-normal"> → <span className="text-[11px]">{si.endTime}</span></span>}
                                                                                {si.extra && <span className="text-sm text-emerald-400 ml-1">({si.extra})</span>}
                                                                            </span>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 align-top">
                                                            <div className="space-y-1">
                                                                {prop.shootingRangeFrom && <><div className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20 font-bold text-amber-600 text-sm">撮影可能</span><span className="font-normal text-gray-700">{formatDateTime(prop.shootingRangeFrom)}</span></div><div className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20"></span><span className="font-normal text-gray-700"><span className="text-[10px] text-gray-400">→ </span>{formatDateTime(prop.shootingRangeTo)}</span></div></>}
                                                                {[...((prop.youtubeDates && prop.youtubeDates.length > 0 ? prop.youtubeDates : (prop.youtubeDate ? [prop.youtubeDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'YouTube' : '', d, s: i===0 ? prop.youtubeStartTime : '', e: i===0 ? prop.youtubeEndTime : '', r: i===0 ? prop.youtubeRequested : false}))), ...((prop.photoDates && prop.photoDates.length > 0 ? prop.photoDates : (prop.photoDate ? [prop.photoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'スチール' : '', d, s: i===0 ? prop.photoStartTime : '', e: i===0 ? prop.photoEndTime : '', r: i===0 ? prop.photoRequested : false}))), ...((prop.exteriorPhotoDates && prop.exteriorPhotoDates.length > 0 ? prop.exteriorPhotoDates : (prop.exteriorPhotoDate ? [prop.exteriorPhotoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? '外観撮影' : '', d, s: i===0 ? prop.exteriorPhotoStartTime : '', e: i===0 ? prop.exteriorPhotoEndTime : '', r: i===0 ? prop.exteriorPhotoRequested : false}))), ...((prop.instaLiveDates && prop.instaLiveDates.length > 0 ? prop.instaLiveDates : (prop.instaLiveDate ? [prop.instaLiveDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'InstaLive' : '', d, s: i===0 ? prop.instaLiveStartTime : '', e: i===0 ? prop.instaLiveEndTime : '', r: i===0 ? prop.instaLiveRequested : false}))), ...((prop.instaRegularDates && prop.instaRegularDates.length > 0 ? prop.instaRegularDates : (prop.instaRegularDate ? [prop.instaRegularDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'インスタ投稿' : '', d, s: i===0 ? prop.instaRegularStartTime : '', e: i===0 ? prop.instaRegularEndTime : '', r: i===0 ? prop.instaRegularRequested : false}))), ...((prop.instaPromoDates && prop.instaPromoDates.length > 0 ? prop.instaPromoDates : (prop.instaPromoDate ? [prop.instaPromoDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'インスタ広告' : '', d, s: i===0 ? prop.instaPromoStartTime : '', e: i===0 ? prop.instaPromoEndTime : '', r: i===0 ? prop.instaPromoRequested : false}))), ...((prop.otherDates && prop.otherDates.length > 0 ? prop.otherDates : (prop.otherDate ? [prop.otherDate] : [])).filter(Boolean).map((d,i) => ({l: i===0 ? 'その他' : '', d, s: i===0 ? prop.otherStartTime : '', e: i===0 ? prop.otherEndTime : '', r: i===0 ? prop.otherRequested : false})))].map((m,idx)=>(
                                                                    <div key={idx} className="flex items-center gap-2 text-sm whitespace-nowrap"><span className="w-20 font-bold text-gray-400 text-sm flex items-center gap-0.5">{m.l}{m.r && <Icon name="circle-check" size={14} className="text-green-500 flex-shrink-0"/>}</span><span className="font-normal text-gray-700">{formatDateTime(m.d)}{m.e && <span className="text-[10px] text-gray-400 font-normal"> → <span className="text-[11px]">{m.e}</span></span>}</span></div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 align-top text-center w-20">
                                                            <div className="flex justify-center gap-2 mb-2"><button onClick={() => openEditModal(prop)} className="text-gray-400 hover:text-primary transition-colors"><Icon name="pencil" size={18} /></button><button onClick={() => deleteEvent(prop.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Icon name="trash-2" size={18} /></button></div>
                                                            {prop.googleMapUrl && <a href={prop.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 mb-2 bg-blue-50 w-full">MAP <Icon name="external-link" size={11}/></a>}
                                                            {prop.systemId && <a href={`https://andpad.jp/manager/my/orders/${prop.systemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 bg-red-50 w-full">ANDPAD <Icon name="external-link" size={11}/></a>}
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
                                    <div className="grid grid-cols-7 gap-1">{monthData.days.map((day, i) => (<div key={i} className={`min-h-[60px] p-2 rounded-lg border ${day.isCurrentMonth ? 'bg-white border-gray-100' : 'bg-gray-50/50 border-transparent text-gray-300'}`}><div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${day.isToday ? 'bg-accent text-white' : ''}`}>{day.date.getDate()}</div><div className="space-y-1">{calendarEvents[day.ymd] && calendarEvents[day.ymd].map((evt, idx) => (<button key={idx} onClick={() => { const p = evt.prop; const hasEvent = p.eventDates && p.eventDates.filter(Boolean).length > 0; const hasShooting = (p.shootingTypes && p.shootingTypes.length > 0) || p.youtubeDate || p.photoDate || p.exteriorPhotoDate || p.instaLiveDate || p.instaRegularDate || p.instaPromoDate || p.otherDate; if (hasEvent && !hasShooting) openEditEventModal(p); else openEditModal(p); }} className={`w-full text-left text-xs px-1.5 py-1 rounded border truncate font-bold hover:opacity-80 transition-opacity ${evt.colorClass}`}>{evt.title}</button>))}</div></div>))}</div>
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
                        <div className="flex flex-col"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{editingId ? '案件情報' : '新規登録'}</h2><div className="text-xl font-bold text-primary">{form.customerName || '顧客名未設定'}</div></div>
                        <div className="flex items-center gap-3">{form.googleMapUrl && <a href={form.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors font-bold text-xs" title="Google Map">MAP <Icon name="external-link" size={11}/></a>}{form.systemId && <a href={`https://andpad.jp/manager/my/orders/${form.systemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors font-bold text-xs" title="ANDPAD">ANDPAD <Icon name="external-link" size={11}/></a>}<button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"><Icon name="x" size={24}/></button></div>
                    </div>
                    <div className="p-8 space-y-8"><form onSubmit={saveProperty} className="space-y-8">
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">基本情報</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">顧客名</label><input type="text" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">案件名*</label><input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div><label className="block text-sm font-bold text-gray-500 mb-1">住所</label><input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div></div><div><label className="block text-sm font-bold text-gray-500 mb-1">GoogleMapURL</label><input type="text" value={form.googleMapUrl} onChange={e => setForm({...form, googleMapUrl: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-bold text-gray-500 mb-2">事業部</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><button key={c} type="button" onClick={()=>handleCategoryChange(c)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${form.category===c?'bg-primary text-white':'bg-white text-gray-500'}`}>{c}</button>)}</div></div><div className="flex-1"><label className="block text-sm font-bold text-gray-500 mb-2">家具設営</label><div className="flex flex-wrap gap-2">{['あり','なし'].map(o=><button key={o} type="button" onClick={()=>setForm({...form,furnitureSetup:o})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${form.furnitureSetup===o?'bg-accent text-white':'bg-white text-gray-500'}`}>{o}</button>)}</div></div></div></div></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">スケジュール</h3><div className="space-y-6"><div><label className="text-sm font-bold text-blue-600 mb-1 block">設営</label><div className="flex gap-2 items-center"><input type="date" value={form.setupDate_date} onChange={e=>setForm({...form,setupDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={form.setupDate_time} onChange={e=>setForm({...form,setupDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={form.setupEndTime} onChange={e=>setForm({...form,setupEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={form.setupVehicle} onChange={e=>setForm({...form,setupVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={form.setupVehicle2} onChange={e=>setForm({...form,setupVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div><label className="text-sm font-bold text-orange-600 mb-1 block">撤収</label><div className="flex gap-2 items-center"><input type="date" value={form.teardownDate_date} onChange={e=>setForm({...form,teardownDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={form.teardownDate_time} onChange={e=>setForm({...form,teardownDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={form.teardownEndTime} onChange={e=>setForm({...form,teardownEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={form.teardownVehicle} onChange={e=>setForm({...form,teardownVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={form.teardownVehicle2} onChange={e=>setForm({...form,teardownVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div className="border-t border-dashed pt-4"><div className="mb-4"><label className="text-sm font-bold text-purple-600 mb-1 block">イベント名</label><input type="text" value={form.eventName} onChange={e=>setForm({...form,eventName:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold" placeholder="例: 完成見学会"/></div><div className="mb-4"><label className="text-sm font-bold text-purple-600 mb-1 block">イベント日</label>{(form.eventDates||[]).map((d,i)=>(<div key={i} className="flex gap-2 mt-1"><input type="date" value={d} onChange={e=>updateFormEventDate(i,e.target.value)} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/>{(form.eventDates||[]).length>1&&<button type="button" onClick={()=>removeFormEventDate(i)} className="text-red-500"><Icon name="trash-2" size={18}/></button>}</div>))}<button type="button" onClick={addFormEventDate} className="text-sm text-purple-500 mt-1">+ 追加</button></div></div><div><label className="text-sm font-bold text-emerald-600 mb-1 block">引渡日</label><input type="date" value={form.handoverDate} onChange={e=>setForm({...form,handoverDate:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/></div></div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">撮影依頼</h3><div className="space-y-6"><div><label className="text-sm font-bold text-gray-500 mb-1 block">依頼者</label><select value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影種類</label><div className="flex flex-wrap gap-2">{SHOOTING_TYPES.map(t=><button type="button" key={t} onClick={()=>{const n=form.shootingTypes.includes(t)?form.shootingTypes.filter(x=>x!==t):[...form.shootingTypes,t];setForm({...form,shootingTypes:n})}} className={`px-3 py-2 border rounded-lg ${form.shootingTypes.includes(t)?'bg-accent text-white':'bg-gray-50'}`}>{t}</button>)}</div></div><div><label className="text-sm font-bold text-accent mb-1 block">撮影可能期間</label><div className="flex gap-2 items-center"><input type="date" value={form.shootingRange_from_date} onChange={e=>setForm({...form,shootingRange_from_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={form.shootingRange_from_time} onChange={e=>setForm({...form,shootingRange_from_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span>~</span><input type="date" value={form.shootingRange_to_date} onChange={e=>setForm({...form,shootingRange_to_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={form.shootingRange_to_time} onChange={e=>setForm({...form,shootingRange_to_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FileUpload label="撮影指示書 (PDF)" fileUrl={form.instructionFileUrl} fileName={form.instructionFileName} onFileChange={(url, name) => setForm({...form, instructionFileUrl: url, instructionFileName: name})} /><FileUpload label="イベント物件概要書 (PDF)" fileUrl={form.overviewFileUrl} fileName={form.overviewFileName} onFileChange={(url, name) => setForm({...form, overviewFileUrl: url, overviewFileName: name})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-bold text-gray-500 mb-1 block">立ち合い</label><select value={form.witnessStaff} onChange={e=>setForm({...form,witnessStaff:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option><option value="なし">なし</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">施主在宅</label><div className="flex gap-2">{['あり','なし'].map(o=><button key={o} type="button" onClick={()=>setForm({...form,ownerPresence:o})} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${form.ownerPresence===o?'bg-accent text-white border-accent':'bg-white text-gray-500 border-gray-200'}`}>{o}</button>)}</div></div></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影の注意事項など</label><textarea value={form.shootingNotes} onChange={e=>setForm({...form,shootingNotes:e.target.value})} rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm" placeholder="撮影時の注意点やメモを入力"/></div></div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">撮影日程</h3><div className="space-y-4">{form.shootingTypes.includes('YouTube') && <TagInput label="YouTube撮影" dates={form.youtubeDates||['']} onDatesChange={(idx,val)=>updateShootingDate('youtube',idx,val)} onAddDate={()=>addShootingDate('youtube')} onRemoveDate={(idx)=>removeShootingDate('youtube',idx)} startTimeValue={form.youtubeStartTime} onStartTimeChange={e=>setForm({...form,youtubeStartTime:e.target.value})} endTimeValue={form.youtubeEndTime} onEndTimeChange={e=>setForm({...form,youtubeEndTime:e.target.value})} isRequested={form.youtubeRequested} onRequestedChange={v=>setForm({...form,youtubeRequested:v})} tags={form.youtubeStaff} onTagsChange={v=>setForm({...form,youtubeStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.youtubeNote} onNoteChange={e=>setForm({...form,youtubeNote:e.target.value})} />}{form.shootingTypes.includes('スチール') && <TagInput label="スチール撮影" dates={form.photoDates||['']} onDatesChange={(idx,val)=>updateShootingDate('photo',idx,val)} onAddDate={()=>addShootingDate('photo')} onRemoveDate={(idx)=>removeShootingDate('photo',idx)} startTimeValue={form.photoStartTime} onStartTimeChange={e=>setForm({...form,photoStartTime:e.target.value})} endTimeValue={form.photoEndTime} onEndTimeChange={e=>setForm({...form,photoEndTime:e.target.value})} isRequested={form.photoRequested} onRequestedChange={v=>setForm({...form,photoRequested:v})} tags={form.photoStaff} onTagsChange={v=>setForm({...form,photoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.photoNote} onNoteChange={e=>setForm({...form,photoNote:e.target.value})} />}{form.shootingTypes.includes('外観スチール') && <TagInput label="外観スチール撮影" dates={form.exteriorPhotoDates||['']} onDatesChange={(idx,val)=>updateShootingDate('exteriorPhoto',idx,val)} onAddDate={()=>addShootingDate('exteriorPhoto')} onRemoveDate={(idx)=>removeShootingDate('exteriorPhoto',idx)} startTimeValue={form.exteriorPhotoStartTime} onStartTimeChange={e=>setForm({...form,exteriorPhotoStartTime:e.target.value})} endTimeValue={form.exteriorPhotoEndTime} onEndTimeChange={e=>setForm({...form,exteriorPhotoEndTime:e.target.value})} isRequested={form.exteriorPhotoRequested} onRequestedChange={v=>setForm({...form,exteriorPhotoRequested:v})} tags={form.exteriorPhotoStaff} onTagsChange={v=>setForm({...form,exteriorPhotoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.exteriorPhotoNote} onNoteChange={e=>setForm({...form,exteriorPhotoNote:e.target.value})} />}{form.shootingTypes.includes('インスタライブ') && <TagInput label="インスタライブ撮影" dates={form.instaLiveDates||['']} onDatesChange={(idx,val)=>updateShootingDate('instaLive',idx,val)} onAddDate={()=>addShootingDate('instaLive')} onRemoveDate={(idx)=>removeShootingDate('instaLive',idx)} startTimeValue={form.instaLiveStartTime} onStartTimeChange={e=>setForm({...form,instaLiveStartTime:e.target.value})} endTimeValue={form.instaLiveEndTime} onEndTimeChange={e=>setForm({...form,instaLiveEndTime:e.target.value})} isRequested={form.instaLiveRequested} onRequestedChange={v=>setForm({...form,instaLiveRequested:v})} tags={form.instaLiveStaff} onTagsChange={v=>setForm({...form,instaLiveStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaLiveNote} onNoteChange={e=>setForm({...form,instaLiveNote:e.target.value})} />}{form.shootingTypes.includes('インスタ通常投稿用') && <TagInput label="インスタ通常投稿撮影" dates={form.instaRegularDates||['']} onDatesChange={(idx,val)=>updateShootingDate('instaRegular',idx,val)} onAddDate={()=>addShootingDate('instaRegular')} onRemoveDate={(idx)=>removeShootingDate('instaRegular',idx)} startTimeValue={form.instaRegularStartTime} onStartTimeChange={e=>setForm({...form,instaRegularStartTime:e.target.value})} endTimeValue={form.instaRegularEndTime} onEndTimeChange={e=>setForm({...form,instaRegularEndTime:e.target.value})} isRequested={form.instaRegularRequested} onRequestedChange={v=>setForm({...form,instaRegularRequested:v})} tags={form.instaRegularStaff} onTagsChange={v=>setForm({...form,instaRegularStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaRegularNote} onNoteChange={e=>setForm({...form,instaRegularNote:e.target.value})} />}{form.shootingTypes.includes('インスタ宣伝用') && <TagInput label="インスタ宣伝撮影" dates={form.instaPromoDates||['']} onDatesChange={(idx,val)=>updateShootingDate('instaPromo',idx,val)} onAddDate={()=>addShootingDate('instaPromo')} onRemoveDate={(idx)=>removeShootingDate('instaPromo',idx)} startTimeValue={form.instaPromoStartTime} onStartTimeChange={e=>setForm({...form,instaPromoStartTime:e.target.value})} endTimeValue={form.instaPromoEndTime} onEndTimeChange={e=>setForm({...form,instaPromoEndTime:e.target.value})} isRequested={form.instaPromoRequested} onRequestedChange={v=>setForm({...form,instaPromoRequested:v})} tags={form.instaPromoStaff} onTagsChange={v=>setForm({...form,instaPromoStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.instaPromoNote} onNoteChange={e=>setForm({...form,instaPromoNote:e.target.value})} />}{form.shootingTypes.includes('その他') && <TagInput label="その他撮影" dates={form.otherDates||['']} onDatesChange={(idx,val)=>updateShootingDate('other',idx,val)} onAddDate={()=>addShootingDate('other')} onRemoveDate={(idx)=>removeShootingDate('other',idx)} startTimeValue={form.otherStartTime} onStartTimeChange={e=>setForm({...form,otherStartTime:e.target.value})} endTimeValue={form.otherEndTime} onEndTimeChange={e=>setForm({...form,otherEndTime:e.target.value})} isRequested={form.otherRequested} onRequestedChange={v=>setForm({...form,otherRequested:v})} tags={form.otherStaff} onTagsChange={v=>setForm({...form,otherStaff:v})} suggestions={staffSuggestions} timeOptions={timeOptions} noteValue={form.otherNote} onNoteChange={e=>setForm({...form,otherNote:e.target.value})} />}</div></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">通知</h3><StaffOnlyInput label="通知スタッフ" tags={form.notificationStaff} onTagsChange={v=>setForm({...form,notificationStaff:v})} suggestions={staffSuggestions} /></section>
                            <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">ANDPAD連携</h3><div className="grid grid-cols-2 gap-4">{Object.keys(ANDPAD_LABELS).map(key=><div key={key}><label className="block text-sm font-bold text-gray-400 uppercase mb-1">{ANDPAD_LABELS[key]}</label><input type="text" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div>)}</div></section>
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-4">{editingId && <button type="button" onClick={()=>{deleteEvent(editingId);setIsModalOpen(false);}} className="px-6 py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50">削除</button>}<button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50">キャンセル</button><button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-gray-800">保存する</button></div>
                        </form></div>
                    </div>
                </div>
            )}

            {/* Staff Modal */}
            {isStaffModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsStaffModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden relative animate-enter"><div className="w-full md:w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-4 border-b bg-white sticky top-0 z-10 flex flex-col gap-3"><div className="flex justify-between items-center"><h3 className="font-bold text-primary">スタッフ一覧</h3><div className="flex gap-2"><button onClick={handleStaffBulkExport} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">書出</button><button onClick={()=>{setStaffBulkMode('import');setStaffBulkText('');setIsStaffBulkModalOpen(true);}} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">取込</button><button onClick={()=>setStaffForm({id:'',name:'',email:'',department:'',roles:[],chatwork_account_id:''})} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-gray-800">新規</button></div></div><select value={staffFilterDept} onChange={e=>setStaffFilterDept(e.target.value)} className="w-full border rounded p-1 text-sm"><option value="">全部署</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="overflow-y-auto flex-1 p-2 space-y-2">{staffs.filter(s=>!staffFilterDept||s.department===staffFilterDept).map(s=>(<div key={s.id} onClick={()=>setStaffForm({...s,chatwork_account_id:s.chatwork_account_id||''})} className={`p-3 rounded-xl cursor-pointer border ${staffForm.id===s.id?'bg-white border-accent':'bg-white border-transparent'}`}><div><div className="font-bold text-sm">{s.name} <span className="text-xs font-normal text-gray-400 ml-1">{s.department}</span>{s.chatwork_account_id && <span className="text-xs font-normal text-blue-500 ml-1">CW</span>}</div><div className="text-sm text-gray-400">{s.email}</div></div></div>))}</div></div><div className="w-full md:w-1/2 p-6 overflow-y-auto bg-white"><div className="flex justify-between mb-6"><h3 className="font-bold text-lg">編集</h3><button onClick={()=>setIsStaffModalOpen(false)}><Icon name="x" size={20}/></button></div><form onSubmit={saveStaff} className="space-y-5"><div><label className="block text-sm font-bold text-gray-500">氏名</label><input type="text" value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">メールアドレス</label><input type="text" value={staffForm.email} onChange={e=>setStaffForm({...staffForm,email:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">チャットワークID</label><input type="text" value={staffForm.chatwork_account_id} onChange={e=>setStaffForm({...staffForm,chatwork_account_id:e.target.value})} className="w-full border rounded px-2 py-2" placeholder="例: 1234567"/></div><div><label className="block text-sm font-bold text-gray-500">所属事業部</label><select value={staffForm.department} onChange={e=>setStaffForm({...staffForm,department:e.target.value})} className="w-full border rounded px-2 py-2"><option value="">未設定</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div><label className="block text-sm font-bold text-gray-500">役割</label><div className="grid grid-cols-2 gap-2">{STAFF_ROLES.map(r=><button type="button" key={r} onClick={()=>toggleStaffRole(r)} className={`px-2 py-1 border rounded text-sm ${staffForm.roles.includes(r)?'bg-accent text-white':'bg-gray-50'}`}>{r}</button>)}</div></div><div className="flex gap-3 pt-6 border-t">{staffForm.id&&<button type="button" onClick={()=>deleteStaff(staffForm.id)} className="px-4 py-2 border text-red-500 rounded">削除</button>}<button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded">保存</button></div></form></div></div></div>)}
            {isStaffBulkModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsStaffBulkModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-enter"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{staffBulkMode==='import'?'スタッフ一括取込':'スタッフ一括書出'}</h3><button onClick={()=>setIsStaffBulkModalOpen(false)}><Icon name="x" size={20}/></button></div><textarea value={staffBulkText} onChange={e=>setStaffBulkText(e.target.value)} readOnly={staffBulkMode==='export'} className="w-full h-64 border rounded p-2 mb-4 font-mono text-xs" placeholder={staffBulkMode==='import'?'氏名\tメールアドレス\t所属事業部\t役割\n山田太郎\ttaro@example.com\t新築\t営業,広報':''} /><div className="flex gap-4">{staffBulkMode==='export'?<button onClick={copyToClipboard} className="flex-1 py-2 bg-accent text-white rounded">クリップボードにコピー</button>:<button onClick={handleStaffBulkImport} className="flex-1 py-2 bg-primary text-white rounded">取り込む</button>}</div></div></div>)}
            {isEquipmentModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsEquipmentModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden relative animate-enter"><div className="w-full md:w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-4 border-b bg-white sticky top-0 z-10 flex flex-col gap-3"><div className="flex justify-between items-center"><h3 className="font-bold text-primary">設備一覧</h3><div className="flex gap-2"><button onClick={handleEquipBulkExport} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">書出</button><button onClick={()=>{setEquipBulkMode('import');setEquipBulkText('');setIsEquipBulkModalOpen(true);}} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">取込</button><button onClick={()=>setEquipmentForm({id:'',name:'',email:'',type:'設備'})} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-gray-800">新規</button></div></div><select value={equipFilterType} onChange={e=>setEquipFilterType(e.target.value)} className="w-full border rounded p-1 text-sm"><option value="">全種類</option>{EQUIPMENT_TYPES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="overflow-y-auto flex-1 p-2 space-y-2">{equipments.filter(e=>!equipFilterType||e.type===equipFilterType).map(e=>(<div key={e.id} onClick={()=>setEquipmentForm(e)} className={`p-3 rounded-xl cursor-pointer border ${equipmentForm.id===e.id?'bg-white border-accent':'bg-white border-transparent'}`}><div><div className="font-bold text-sm">{e.name}</div><div className="text-sm text-gray-400">{e.type}</div><div className="text-sm text-gray-400">{e.email}</div></div></div>))}</div></div><div className="w-full md:w-1/2 p-6 overflow-y-auto bg-white"><div className="flex justify-between mb-6"><h3 className="font-bold text-lg">編集</h3><button onClick={()=>setIsEquipmentModalOpen(false)}><Icon name="x" size={20}/></button></div><form onSubmit={saveEquipment} className="space-y-5"><div><label className="block text-sm font-bold text-gray-500">名称</label><input type="text" value={equipmentForm.name} onChange={e=>setEquipmentForm({...equipmentForm,name:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">ID/Email</label><input type="text" value={equipmentForm.email} onChange={e=>setEquipmentForm({...equipmentForm,email:e.target.value})} className="w-full border rounded px-2 py-2"/></div><div><label className="block text-sm font-bold text-gray-500">種類</label><div className="flex gap-2">{EQUIPMENT_TYPES.map(t=><button type="button" key={t} onClick={()=>setEquipmentForm({...equipmentForm,type:t})} className={`flex-1 py-2 border rounded text-sm ${equipmentForm.type===t?'bg-accent text-white':'bg-gray-50'}`}>{t}</button>)}</div></div><div className="flex gap-3 pt-6 border-t">{equipmentForm.id&&<button type="button" onClick={()=>deleteEquipment(equipmentForm.id)} className="px-4 py-2 border text-red-500 rounded">削除</button>}<button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded">保存</button></div></form></div></div></div>)}
            {isEquipBulkModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsEquipBulkModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-enter"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{equipBulkMode==='import'?'設備一括取込':'設備一括書出'}</h3><button onClick={()=>setIsEquipBulkModalOpen(false)}><Icon name="x" size={20}/></button></div><textarea value={equipBulkText} onChange={e=>setEquipBulkText(e.target.value)} readOnly={equipBulkMode==='export'} className="w-full h-64 border rounded p-2 mb-4 font-mono text-xs" placeholder={equipBulkMode==='import'?'名称\tID/Email\t種類\nハイエース\thiace@example.com\t車輛':''} /><div className="flex gap-4">{equipBulkMode==='export'?<button onClick={copyEquipToClipboard} className="flex-1 py-2 bg-accent text-white rounded">クリップボードにコピー</button>:<button onClick={handleEquipBulkImport} className="flex-1 py-2 bg-primary text-white rounded">取り込む</button>}</div></div></div>)}
            {isRequestModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={()=>setIsRequestModalOpen(false)}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-enter flex flex-col"><div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-primary flex items-center gap-2"><Icon name={requestMode==='event'?'calendar-plus':'camera'} size={24}/> {requestMode==='event'?'イベント追加':'撮影依頼'} - 案件選択</h2><div className="flex items-center gap-2">{requestMode==='event' && <button type="button" onClick={()=>{setIsRequestModalOpen(false);setEditingEventId(null);resetEventForm();setEventForm(prev=>({...prev, customerName:'顧客なし', name:'案件なし'}));setIsEventModalOpen(true);}} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors whitespace-nowrap flex items-center gap-1"><Icon name="calendar-plus" size={16} className="text-purple-500"/> 案件選択なしでイベント追加</button>}<button onClick={()=>setIsRequestModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon name="x" size={24}/></button></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200"><div className="col-span-1"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">事業部</label><select value={reqSearch.category} onChange={e=>setReqSearch({...reqSearch, category:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">全て</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="col-span-1"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">担当者</label><select value={reqSearch.staff} onChange={e=>setReqSearch({...reqSearch, staff:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">全て</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">フリーワード</label><input type="text" value={reqSearch.keyword} onChange={e=>setReqSearch({...reqSearch, keyword:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="案件名, 顧客名, 住所..." /></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">契約日 (年月)</label><div className="flex gap-2 items-center"><input type="month" value={reqSearch.contractFrom} onChange={e=>setReqSearch({...reqSearch, contractFrom:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /><span className="text-gray-400">~</span><input type="month" value={reqSearch.contractTo} onChange={e=>setReqSearch({...reqSearch, contractTo:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /></div></div><div className="col-span-2"><label className="text-xs font-bold text-gray-400 uppercase block mb-1">引渡日 (年月)</label><div className="flex gap-2 items-center"><input type="month" value={reqSearch.handoverFrom} onChange={e=>setReqSearch({...reqSearch, handoverFrom:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /><span className="text-gray-400">~</span><input type="month" value={reqSearch.handoverTo} onChange={e=>setReqSearch({...reqSearch, handoverTo:e.target.value})} className="w-full border rounded-lg px-2 py-2 text-xs" /></div></div><div className="col-span-4 flex justify-end pt-2"><button onClick={()=>setReqSearch({keyword:'',category:'新築',staff:'',contractFrom:'2020-01',contractTo:'',handoverFrom:'',handoverTo:''})} className="text-sm text-gray-400 underline hover:text-gray-600">条件クリア</button></div></div></div><div className="flex-1 overflow-y-auto p-6 bg-gray-50"><div className="space-y-3"><div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200"><div className="col-span-1">事業部</div><div className="col-span-2">担当者</div><div className="col-span-2">契約日</div><div className="col-span-3">顧客名 / 案件名</div><div className="col-span-2">引渡日</div><div className="col-span-2 text-right">契約金額</div></div>{requestSuggestions.length > 0 ? requestSuggestions.map(d => (<div key={d.id} onClick={() => requestMode==='event' ? selectPropertyForEvent(d) : selectPropertyForRequest(d)} className="grid grid-cols-12 gap-4 px-4 py-4 bg-white rounded-xl border border-gray-200 hover:border-accent hover:shadow-md transition-all cursor-pointer items-center group"><div className="col-span-1"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{d.deal_category || d.category || '-'}</span></div><div className="col-span-2 text-xs text-gray-500"><div>{formatRepName(d.role_sales)} <span className="text-[10px] text-gray-400">(営)</span></div>{d.role_ic && <div>{formatRepName(d.role_ic)} <span className="text-[10px] text-gray-400">(IC)</span></div>}{d.role_construction && <div>{formatRepName(d.role_construction)} <span className="text-[10px] text-gray-400">(工)</span></div>}</div><div className="col-span-2 text-sm font-medium text-gray-700">{d.order_date ? formatDate(d.order_date) : '-'}</div><div className="col-span-3"><div className="font-bold text-sm text-gray-800">{d.customer_name || '未設定'}</div><div className="text-xs text-gray-500 truncate">{d.name}</div></div><div className="col-span-2 text-sm font-medium text-emerald-600">{(d.handover_date_actual || d.handover_date_planned) ? formatDate(d.handover_date_actual || d.handover_date_planned) : '-'}</div><div className="col-span-2 text-right font-bold text-gray-700">{formatCurrency(d.order_amount)}</div></div>)) : (<div className="text-center py-12 text-gray-400 font-bold">条件に一致する案件がありません</div>)}</div></div></div></div>)}

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
                        <div className="flex items-center gap-3">{eventForm.googleMapUrl && <a href={eventForm.googleMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors font-bold text-xs" title="Google Map">MAP <Icon name="external-link" size={11}/></a>}{eventForm.systemId && <a href={`https://andpad.jp/manager/my/orders/${eventForm.systemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors font-bold text-xs" title="ANDPAD">ANDPAD <Icon name="external-link" size={11}/></a>}<button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"><Icon name="x" size={24}/></button></div>
                    </div>
                    <div className="p-8 space-y-8"><form onSubmit={saveEvent} className="space-y-8">
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">基本情報</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">顧客名</label><input type="text" value={eventForm.customerName} onChange={e => setEventForm({...eventForm, customerName: e.target.value})} readOnly={!eventForm.propertyId && !editingEventId} className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-accent ${!eventForm.propertyId && !editingEventId ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-50'}`} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-500 mb-1">案件名*</label><input type="text" required value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} readOnly={!eventForm.propertyId && !editingEventId} className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-accent ${!eventForm.propertyId && !editingEventId ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-50'}`} /></div><div><label className="block text-sm font-bold text-gray-500 mb-1">住所</label><input type="text" value={eventForm.address} onChange={e => setEventForm({...eventForm, address: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div></div><div><label className="block text-sm font-bold text-gray-500 mb-1">GoogleMapURL</label><input type="text" value={eventForm.googleMapUrl} onChange={e => setEventForm({...eventForm, googleMapUrl: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent" /></div><div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-bold text-gray-500 mb-2">事業部</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><button key={c} type="button" onClick={()=>setEventForm({...eventForm, category:c})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${eventForm.category===c?'bg-primary text-white':'bg-white text-gray-500'}`}>{c}</button>)}</div></div></div></div></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">スケジュール</h3><div className="space-y-6"><div><label className="text-sm font-bold text-blue-600 mb-1 block">設営</label><div className="flex gap-2 items-center"><input type="date" value={eventForm.setupDate_date} onChange={e=>setEventForm({...eventForm,setupDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={eventForm.setupDate_time} onChange={e=>setEventForm({...eventForm,setupDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={eventForm.setupEndTime} onChange={e=>setEventForm({...eventForm,setupEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={eventForm.setupVehicle} onChange={e=>setEventForm({...eventForm,setupVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={eventForm.setupVehicle2} onChange={e=>setEventForm({...eventForm,setupVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div><label className="text-sm font-bold text-orange-600 mb-1 block">撤収</label><div className="flex gap-2 items-center"><input type="date" value={eventForm.teardownDate_date} onChange={e=>setEventForm({...eventForm,teardownDate_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/><select value={eventForm.teardownDate_time} onChange={e=>setEventForm({...eventForm,teardownDate_time:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">開始</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span className="text-gray-400">〜</span><select value={eventForm.teardownEndTime} onChange={e=>setEventForm({...eventForm,teardownEndTime:e.target.value})} className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">終了</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-2 mt-2"><select value={eventForm.teardownVehicle} onChange={e=>setEventForm({...eventForm,teardownVehicle:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両1</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={eventForm.teardownVehicle2} onChange={e=>setEventForm({...eventForm,teardownVehicle2:e.target.value})} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">車両2</option>{vehicleOptions.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div></div><div className="border-t border-dashed pt-4"><div className="mb-4"><label className="text-sm font-bold text-purple-600 mb-1 block">イベント名</label><input type="text" value={eventForm.eventName} onChange={e=>setEventForm({...eventForm,eventName:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold" placeholder="例: 完成見学会"/></div><label className="text-sm font-bold text-purple-600 mb-1 block">イベント日</label>{eventForm.eventDates.map((d,i)=>(<div key={i} className="flex gap-2 mt-1"><input type="date" value={d} onChange={e=>updateEventDate(i,e.target.value)} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/>{eventForm.eventDates.length>1&&<button type="button" onClick={()=>removeEventDate(i)} className="text-red-500"><Icon name="trash-2" size={18}/></button>}</div>))}<button type="button" onClick={addEventDate} className="text-sm text-purple-500 mt-1">+ 追加</button></div><div><label className="text-sm font-bold text-emerald-600 mb-1 block">引渡日</label><input type="date" value={eventForm.handoverDate} onChange={e=>setEventForm({...eventForm,handoverDate:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"/></div></div></section>
                        {eventForm.propertyId && (<section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">撮影依頼</h3><div className="space-y-6"><div><label className="text-sm font-bold text-gray-500 mb-1 block">依頼者</label><select value={eventForm.requester} onChange={e=>setEventForm({...eventForm,requester:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影種類</label><div className="flex flex-wrap gap-2">{SHOOTING_TYPES.map(t=><button type="button" key={t} onClick={()=>{const n=eventForm.shootingTypes.includes(t)?eventForm.shootingTypes.filter(x=>x!==t):[...eventForm.shootingTypes,t];setEventForm({...eventForm,shootingTypes:n})}} className={`px-3 py-2 border rounded-lg ${eventForm.shootingTypes.includes(t)?'bg-accent text-white':'bg-gray-50'}`}>{t}</button>)}</div></div><div><label className="text-sm font-bold text-accent mb-1 block">撮影可能期間</label><div className="flex gap-2 items-center"><input type="date" value={eventForm.shootingRange_from_date} onChange={e=>setEventForm({...eventForm,shootingRange_from_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={eventForm.shootingRange_from_time} onChange={e=>setEventForm({...eventForm,shootingRange_from_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select><span>~</span><input type="date" value={eventForm.shootingRange_to_date} onChange={e=>setEventForm({...eventForm,shootingRange_to_date:e.target.value})} onClick={handleShowPicker} className="w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"/><select value={eventForm.shootingRange_to_time} onChange={e=>setEventForm({...eventForm,shootingRange_to_time:e.target.value})} className="px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"><option value="">時間</option>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FileUpload label="撮影指示書 (PDF)" fileUrl={eventForm.instructionFileUrl} fileName={eventForm.instructionFileName} onFileChange={(url, name) => setEventForm({...eventForm, instructionFileUrl: url, instructionFileName: name})} /><FileUpload label="イベント物件概要書 (PDF)" fileUrl={eventForm.overviewFileUrl} fileName={eventForm.overviewFileName} onFileChange={(url, name) => setEventForm({...eventForm, overviewFileUrl: url, overviewFileName: name})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-bold text-gray-500 mb-1 block">立ち合い</label><select value={eventForm.witnessStaff} onChange={e=>setEventForm({...eventForm,witnessStaff:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm font-bold"><option value="">選択</option><option value="なし">なし</option>{staffSuggestions.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">施主在宅</label><div className="flex gap-2">{['あり','なし'].map(o=><button key={o} type="button" onClick={()=>setEventForm({...eventForm,ownerPresence:o})} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${eventForm.ownerPresence===o?'bg-accent text-white border-accent':'bg-white text-gray-500 border-gray-200'}`}>{o}</button>)}</div></div></div><div><label className="text-sm font-bold text-gray-500 mb-1 block">撮影の注意事項など</label><textarea value={eventForm.shootingNotes} onChange={e=>setEventForm({...eventForm,shootingNotes:e.target.value})} rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent text-sm" placeholder="撮影時の注意点やメモを入力"/></div></div></section>)}
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">通知</h3><StaffOnlyInput label="通知スタッフ" tags={eventForm.notificationStaff} onTagsChange={v=>setEventForm({...eventForm,notificationStaff:v})} suggestions={staffSuggestions} /></section>
                        <section className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 border-t border-gray-100 pt-8"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-3">ANDPAD連携</h3><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-400 uppercase mb-1">システムID</label><input type="text" value={eventForm.systemId} onChange={e=>setEventForm({...eventForm,systemId:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div><div><label className="block text-sm font-bold text-gray-400 uppercase mb-1">営業担当</label><input type="text" value={eventForm.salesRep} onChange={e=>setEventForm({...eventForm,salesRep:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-400 uppercase mb-1">IC担当</label><input type="text" value={eventForm.icRep} onChange={e=>setEventForm({...eventForm,icRep:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div><div><label className="block text-sm font-bold text-gray-400 uppercase mb-1">工事担当</label><input type="text" value={eventForm.constructionRep} onChange={e=>setEventForm({...eventForm,constructionRep:e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent"/></div></div></div></section>
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-4">{editingEventId && <button type="button" onClick={()=>deleteEvent(editingEventId)} className="px-6 py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50">削除</button>}<button type="button" onClick={()=>setIsEventModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50">キャンセル</button><button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-gray-800">保存する</button></div>
                    </form></div>
                </div></div>
            )}

            {isHelpModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={()=>{setIsHelpModalOpen(false);setIsEditingHelp(false);}}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-enter"><div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-6 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-bold text-primary flex items-center gap-2"><Icon name="info" size={20}/> 使い方ガイド</h3><div className="flex items-center gap-2"><button onClick={()=>setIsEditingHelp(!isEditingHelp)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isEditingHelp?'bg-accent text-white border-accent':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}><Icon name="pencil" size={14} className="inline mr-1"/>{isEditingHelp?'プレビュー':'編集'}</button><button onClick={()=>{setIsHelpModalOpen(false);setIsEditingHelp(false);}} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="x" size={20}/></button></div></div><div className="p-6">{isEditingHelp ? (<div className="space-y-3"><textarea value={helpContent} onChange={e=>setHelpContent(e.target.value)} className="w-full h-96 border border-gray-200 rounded-xl p-4 text-sm font-mono resize-y outline-none focus:border-accent" placeholder="Markdown形式で入力..."/><div className="flex justify-end gap-2"><button onClick={()=>setIsEditingHelp(false)} className="px-4 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50">キャンセル</button><button onClick={()=>{saveHelpContent();setIsEditingHelp(false);}} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-gray-800 font-bold">保存</button></div></div>) : (<div className="prose prose-sm max-w-none">{helpContent.split('\n').map((line, i) => {if(line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-primary mt-6 mb-3 border-b border-gray-100 pb-2">{line.replace('## ','')}</h2>; if(line.match(/^!\[.*?\]\(.*?\)$/)) { const m=line.match(/^!\[(.*?)\]\((.*?)\)$/); return <div key={i} className="my-3"><img src={m[2]} alt={m[1]} className="rounded-lg border border-gray-200 shadow-sm max-w-full"/></div>; } if(line.startsWith('- ')) return <div key={i} className="flex gap-2 ml-2 mb-1"><span className="text-accent mt-0.5">&#8226;</span><span className="text-sm text-gray-600">{line.replace('- ','')}</span></div>; if(line.match(/^\d+\. /)) return <div key={i} className="flex gap-2 ml-2 mb-1"><span className="text-accent font-bold text-sm min-w-[20px]">{line.match(/^\d+/)[0]}.</span><span className="text-sm text-gray-600">{line.replace(/^\d+\. /,'')}</span></div>; if(line.trim()==='') return <div key={i} className="h-2"/>; return <p key={i} className="text-sm text-gray-600 mb-1">{line}</p>;})}</div>)}</div></div></div>)}

            {isFaqModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={()=>{setIsFaqModalOpen(false);setIsEditingFaq(false);}}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-enter"><div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-6 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-bold text-primary flex items-center gap-2"><Icon name="message-circle" size={20}/> よくあるご質問</h3><div className="flex items-center gap-2"><button onClick={()=>setIsEditingFaq(!isEditingFaq)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isEditingFaq?'bg-accent text-white border-accent':'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}><Icon name="pencil" size={14} className="inline mr-1"/>{isEditingFaq?'プレビュー':'編集'}</button><button onClick={()=>{setIsFaqModalOpen(false);setIsEditingFaq(false);}} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="x" size={20}/></button></div></div><div className="p-6">{isEditingFaq ? (<div className="space-y-3"><textarea value={faqContent} onChange={e=>setFaqContent(e.target.value)} className="w-full h-96 border border-gray-200 rounded-xl p-4 text-sm font-mono resize-y outline-none focus:border-accent" placeholder="Markdown形式で入力..."/><div className="flex justify-end gap-2"><button onClick={()=>setIsEditingFaq(false)} className="px-4 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50">キャンセル</button><button onClick={()=>{saveFaqContent();setIsEditingFaq(false);}} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-gray-800 font-bold">保存</button></div></div>) : (<div className="prose prose-sm max-w-none">{faqContent.split('\n').map((line, i) => {if(line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-primary mt-6 mb-3 border-b border-gray-100 pb-2">{line.replace('## ','')}</h2>; if(line.startsWith('Q. ')) return <div key={i} className="flex gap-2 mt-4 mb-1"><span className="text-primary font-bold text-sm min-w-[24px]">Q.</span><span className="text-sm font-bold text-gray-700">{line.replace('Q. ','')}</span></div>; if(line.startsWith('A. ')) return <div key={i} className="flex gap-2 ml-1 mb-2"><span className="text-accent font-bold text-sm min-w-[24px]">A.</span><span className="text-sm text-gray-600">{line.replace('A. ','')}</span></div>; if(line.trim()==='') return <div key={i} className="h-1"/>; return <p key={i} className="text-sm text-gray-600 mb-1">{line}</p>;})}</div>)}</div></div></div>)}

            {isBranchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl z-10">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="map-pin" size={20}/> 支店振分管理
                            </h2>
                            <button onClick={() => setIsBranchModalOpen(false)}>
                                <Icon name="x" size={22}/>
                            </button>
                        </div>
                        <div className="p-4 border-b flex gap-2">
                            {['共通','新築','リフォーム'].map(cat => (
                                <button key={cat} onClick={() => setBranchCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                        branchCategoryFilter === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                                    }`}>{cat}</button>
                            ))}
                        </div>
                        <div className="p-4 space-y-6">
                            {(() => {
                                // 全支店情報を共通カテゴリから取得（支店名・CSS・sort_order）
                                const allBranches = {};
                                branchAssignments.filter(a => a.category === '共通').forEach(a => {
                                    if (!allBranches[a.branch_name]) allBranches[a.branch_name] = { class: a.branch_class, sort_order: a.sort_order };
                                });
                                // 現在のカテゴリのデータをグループ化
                                const grouped = {};
                                branchAssignments.filter(a => a.category === branchCategoryFilter).forEach(a => {
                                    if (!grouped[a.branch_name]) grouped[a.branch_name] = [];
                                    grouped[a.branch_name].push(a);
                                });
                                // 全支店をsort_order順でソートして返す
                                return Object.entries(allBranches)
                                    .sort(([,a],[,b]) => (a.sort_order||0) - (b.sort_order||0))
                                    .map(([branchName, { class: branchClass }]) => {
                                        const items = grouped[branchName] || [];
                                        return (
                                <div key={branchName} className="bg-gray-50 rounded-xl p-4 border">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2 py-1 rounded text-sm font-bold border ${branchClass}`}>{branchName}</span>
                                        <span className="text-xs text-gray-400">{items.length}件</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {items.map(a => (
                                            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg border text-sm">
                                                {a.municipality}
                                                <button onClick={() => deleteBranchAssignment(a.id)} className="text-gray-400 hover:text-red-500">
                                                    <Icon name="x" size={14}/>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="市町村名を追加..."
                                            value={newMunicipality[branchName] || ''}
                                            onChange={e => setNewMunicipality(prev => ({...prev, [branchName]: e.target.value}))}
                                            className="border rounded-lg px-3 py-1.5 text-sm flex-1"
                                        />
                                        <button onClick={() => {
                                            const val = (newMunicipality[branchName] || '').trim();
                                            if (val) { addBranchAssignment(branchName, branchClass, val, branchCategoryFilter); setNewMunicipality(prev => ({...prev, [branchName]: ''})); }
                                        }} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-bold">追加</button>
                                    </div>
                                </div>
                                    );})
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {notification && (<div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-enter"><Icon name="circle-check" size={18} className="text-green-400" /><span className="text-sm font-bold tracking-wide">{notification}</span></div>)}
            {confirmDialog && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={confirmDialog.onCancel}></div><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-enter overflow-hidden"><div className={`px-6 pt-6 pb-4 flex items-center gap-3 ${confirmDialog.variant === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}><div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmDialog.variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'}`}><Icon name={confirmDialog.variant === 'danger' ? 'triangle-alert' : 'info'} size={20} className={confirmDialog.variant === 'danger' ? 'text-red-500' : 'text-blue-500'} /></div><h3 className="font-bold text-lg text-gray-800">{confirmDialog.title}</h3></div><div className="px-6 py-5"><p className="text-gray-600 whitespace-pre-line">{confirmDialog.message}</p></div><div className="px-6 pb-6 flex justify-end gap-3"><button onClick={confirmDialog.onCancel} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">キャンセル</button><button onClick={confirmDialog.onOk} className={`px-5 py-2.5 rounded-xl font-bold text-white transition-colors ${confirmDialog.variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>{confirmDialog.variant === 'danger' ? '削除する' : 'OK'}</button></div></div></div>)}
        </div>
    );
};

export default App;
