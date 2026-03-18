import React, { useState, useMemo, useEffect, useRef } from 'react';

import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine 
} from 'recharts';
import { 
    Info, Calculator, TrendingUp, Landmark, ArrowRightLeft, Settings2, RefreshCw, Wallet, 
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CreditCard, Coins, Percent, Copy, Table, Save, FolderOpen, Trash2, X, Check, User, Printer, Layers, Edit3, Plus, Minus,
    MessageSquarePlus, StickyNote, Globe, LogIn, LogOut, AlertCircle, Building, Users, Search, Filter, Lock, Eye, List, Columns, Share2, Calendar
} from 'lucide-react';
import LZString from 'lz-string';

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';

const getFirebaseConfig = () => {
    return {
        apiKey: "AIzaSyD9SJTtptZ5nCRL9WHZRCUZVIjk6hNHTuQ",
        authDomain: "sunpro-moneyplan.firebaseapp.com",
        projectId: "sunpro-moneyplan",
        storageBucket: "sunpro-moneyplan.firebasestorage.app",
        messagingSenderId: "478803923671",
        appId: "1:478803923671:web:8579aa87de48467e039692",
        measurementId: "G-DBJGKG2WHW"
    };
};
const firebaseConfig = getFirebaseConfig();

let app, auth, db, analytics;
try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase init error", e);
}

const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

const formatCurrency = (value) => (!Number.isFinite(value) || Number.isNaN(value)) ? "0" : value.toLocaleString();
const formatYen = (valueYen) => {
    if (!Number.isFinite(valueYen) || Number.isNaN(valueYen)) return "0";
    return Math.round(valueYen).toLocaleString();
};
const formatYenToManDecimal = (valueYen) => {
    if (!Number.isFinite(valueYen) || Number.isNaN(valueYen)) return "0";
    return (Math.round(valueYen / 10000 * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const getRateRangeString = (rates, years, field) => {
    if (!rates || rates.length === 0) return null;
    const targetRates = rates.slice(0, years).map(r => r[field]);
    if (targetRates.some(r => r === undefined || r === null)) return null;
    const min = Math.min(...targetRates);
    const max = Math.max(...targetRates);
    if (min === max) return null;
    return `${min.toFixed(1)}～${max.toFixed(1)}%`;
};

// カスタムハンバーガーアイコン
const HamburgerIcon = ({size=16, className=""}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11h18" />
        <path d="M19 11C19 6.5 15.5 4 12 4S5 6.5 5 11" />
        <path d="M20 16H4a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a1 1 0 0 0-1-1Z" />
    </svg>
);

// カスタムX軸目盛り（年齢表示用）
const CustomXAxisTick = ({ x, y, payload, startAge }) => {
    // startAgeが入力されているかチェック
    const hasAge = startAge !== '' && startAge !== null && !isNaN(startAge);
    const age = hasAge ? parseInt(startAge) + payload.value : null;
    
    // y座標を明示的に下げて配置
    return (
        <g transform={`translate(${x},${y})`}>
            {/* 年数は軸線(y)から25px下に配置 */}
            <text x={0} y={25} textAnchor="middle" fill="#64748b" fontSize={14} fontFamily="ui-monospace, monospace" fontWeight="500">
                {payload.value}年
            </text>
            
            {/* 年齢は軸線(y)から48px下に配置（年数との間隔を確保） */}
            {hasAge && (
                <text x={0} y={48} textAnchor="middle" fill="#94a3b8" fontSize={12} fontFamily="ui-monospace, monospace">
                    ({age}歳)
                </text>
            )}
        </g>
    );
};

const Toast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 left-1/2 bg-slate-800/90 text-white px-6 py-3 rounded-full shadow-xl z-[9999] flex items-center gap-2 animate-toast backdrop-blur-sm no-print fixed-overlay">
            <Check size={18} className="text-emerald-400" />
            <span className="font-bold text-sm">{message}</span>
        </div>
    );
};

const Disclaimer = ({ isStaff }) => {
    const [isOpen, setIsOpen] = useState(!isStaff);
    useEffect(() => { setIsOpen(!isStaff); }, [isStaff]);

    return (
        <div className="max-w-7xl mx-auto mb-6 print-disclaimer-force">
            <div className={`bg-amber-50 border border-amber-200 rounded-lg overflow-hidden ${isStaff ? 'print:border-none' : ''}`}>
                {isStaff && (
                    <button 
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex justify-between items-center p-2 px-4 text-xs font-bold text-amber-700 hover:bg-amber-100 transition no-print"
                    >
                        <span className="flex items-center gap-1"><AlertCircle size={14} className="inline"/> 免責事項・ご注意</span>
                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                )}
                <div className={`${(isStaff && !isOpen) ? 'hidden print:block' : 'block'} p-4 text-xs text-amber-800 leading-relaxed`}>
                     {!isStaff && <h4 className="font-bold mb-2 flex items-center gap-1 print:hidden"><AlertCircle size={16}/> 免責事項・ご注意</h4>}
                     <ul className="list-disc pl-5 space-y-1">
                        <li>こちらの機能は入力されたデータに基づいて行うシミュレーションであり、実際の資産運用結果ではありません。また、将来の資産運用の成果をお約束するものではありません。</li>
                        <li>株式会社サンプロは、お客様がこちらの機能を利用されたことにより生じたいかなる結果についても責任を負いません。</li>
                     </ul>
                </div>
            </div>
        </div>
    );
};

// --- スマートな数値入力（0消去、矢印キー対応） ---
const SmartInput = ({ value, onChange, step = 1, min, max, className, placeholder, ...props }) => {
    const [internalVal, setInternalVal] = useState(value === 0 ? "" : String(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setInternalVal(value === 0 ? "0" : (value === undefined || value === null || value === '' ? "" : String(value)));
        }
    }, [value, isFocused]);

    const handleFocus = (e) => {
        setIsFocused(true);
        if (parseFloat(value) === 0) setInternalVal("");
        if (props.onFocus) props.onFocus(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (internalVal === "") {
            // 入力が空の場合は0に戻すか、空のままにするか
            // 通常の数値入力なら0、年齢などオプショナルなら空
            // ここではonChangeで渡された値が反映されるので、親側の処理に委ねるが、
            // 強制的に0にする必要がある場合はここで処理
            if (value === 0) setInternalVal("0");
        }
        if (props.onBlur) props.onBlur(e);
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setInternalVal(val);
        onChange(e); // 標準のイベントを渡す
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            let current = parseFloat(internalVal);
            if (isNaN(current)) current = 0;
            
            const direction = e.key === 'ArrowUp' ? 1 : -1;
            let next = current + (step * direction);
            
            // 浮動小数点計算の誤差修正
            next = Math.round(next * 100) / 100;

            if (min !== undefined && next < min) next = min;
            if (max !== undefined && next > max) next = max;

            setInternalVal(String(next));
            
            // ReactのonChangeイベントをシミュレート
            const syntheticEvent = {
                ...e,
                target: { ...e.target, value: next }
            };
            onChange(syntheticEvent);
        }
        if (e.key === 'Enter') e.target.blur();
    };

    return (
        <input 
            type="text" 
            inputMode="decimal" 
            value={internalVal} 
            onChange={handleChange} 
            onFocus={handleFocus} 
            onBlur={handleBlur} 
            onKeyDown={handleKeyDown} 
            className={className} 
            placeholder={placeholder} 
            disabled={props.disabled} 
            {...props}
        />
    );
};

const RateInput = ({ value, onChange, colorClass = "", align = "center", step = 0.1, className = "", disabled = false }) => {
    const [strVal, setStrVal] = useState(value === undefined || value === null ? "" : Number(value).toFixed(1));
    const [isFocused, setIsFocused] = useState(false);
    const prevValueRef = useRef(value);
    
    useEffect(() => {
        if (prevValueRef.current !== value) {
            if (!isFocused) {
                setStrVal(value === undefined || value === null ? "" : Number(value).toFixed(1));
            }
            prevValueRef.current = value;
        }
    }, [value, isFocused]);

    const handleChange = (e) => { 
        setStrVal(e.target.value);
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) {
            onChange(num);
        }
    };
    
    const handleFocus = () => {
        setIsFocused(true);
        // 0または0.0の場合、空にして入力しやすくする
        if (parseFloat(strVal) === 0) setStrVal("");
    };

    const handleBlur = () => { 
        setIsFocused(false);
        const num = parseFloat(strVal);
        if (!isNaN(num)) {
            setStrVal(num.toFixed(1)); 
            onChange(num);
        } else {
            setStrVal(Number(value).toFixed(1));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            adjustValue(step);
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            adjustValue(-step);
        }
    };
    
    const adjustValue = (delta) => { 
        if(disabled) return;
        let current = parseFloat(strVal);
        if (isNaN(current)) {
            current = 0; // 空の場合は0からスタート
        }
        const next = Math.round((current + delta) * 10) / 10; 
        const finalVal = next;
        
        setStrVal(finalVal.toFixed(1)); 
        onChange(finalVal);
    };
    
    const defaultBorder = className.includes("border") ? "" : "border border-transparent hover:border-slate-200";
    const defaultPadding = className.includes("p-") || className.includes("py-") ? "" : "py-0.5";
    
    return (
        <div className={`relative group w-full flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input 
                type="text" 
                inputMode="decimal" 
                value={strVal} 
                onChange={handleChange} 
                onFocus={handleFocus} 
                onBlur={handleBlur} 
                onKeyDown={handleKeyDown}
                disabled={disabled} 
                className={`w-full text-${align} bg-transparent rounded outline-none text-sm font-bold ${defaultBorder} ${defaultPadding} ${colorClass} ${className} focus:bg-white focus:border-indigo-300 transition-colors pr-12`} 
            />
            {!disabled && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/80 rounded no-print z-10">
                    <button 
                        type="button" 
                        onMouseDown={(e) => e.preventDefault()} 
                        onClick={() => adjustValue(-step)} 
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700"
                    >
                        <Minus size={12} />
                    </button>
                    <button 
                        type="button" 
                        onMouseDown={(e) => e.preventDefault()} 
                        onClick={() => adjustValue(step)} 
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

const PaidOffLabel = (props) => { 
    const { x, y, index, data, patternId, stroke } = props; 
    const point = data[index]; 
    if (!point || !point[`p${patternId}_just_paid_off`]) return null; 
    
    const offsetIndex = point[`p${patternId}_paid_off_offset`] || 0; 
    
    const textYear = `${point.year}`;
    const textSuffix = "年目完済";
    const boxWidthHalf = 42; 
    const boxHeight = 34; 
    const arrowSize = 6;
    const boxTop = 20 + (offsetIndex * (boxHeight + 6));

    return ( 
        <g transform={`translate(${x},${y})`}> 
            <defs>
                <filter id={`shadow-po-${index}-${patternId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
                </filter>
            </defs> 
            <path d={`M0,0 L0,${boxTop}`} stroke={stroke} strokeWidth="1" strokeDasharray="2 2" /> 
            <path 
                d={`M0,${boxTop} L-${arrowSize},${boxTop + arrowSize} L-${boxWidthHalf - 4},${boxTop + arrowSize} Q-${boxWidthHalf},${boxTop + arrowSize} -${boxWidthHalf},${boxTop + arrowSize + 4} L-${boxWidthHalf},${boxTop + boxHeight - 4} Q-${boxWidthHalf},${boxTop + boxHeight} -${boxWidthHalf - 4},${boxTop + boxHeight} L${boxWidthHalf - 4},${boxTop + boxHeight} Q${boxWidthHalf},${boxTop + boxHeight} ${boxWidthHalf},${boxTop + boxHeight - 4} L${boxWidthHalf},${boxTop + arrowSize + 4} Q${boxWidthHalf},${boxTop + arrowSize} ${boxWidthHalf - 4},${boxTop + arrowSize} L${arrowSize},${boxTop + arrowSize} Z`} 
                fill={stroke} 
                stroke="white" 
                strokeWidth="1" 
                filter={`url(#shadow-po-${index}-${patternId})`}
            /> 
            <text x={0} y={boxTop + 22} textAnchor="middle" fill="#fff" style={{fontFamily: 'ui-monospace, monospace', dominantBaseline: 'middle'}}>
                <tspan fontSize="15" fontWeight="800" dy="0">{textYear}</tspan>
                <tspan fontSize="11" fontWeight="bold" dy="-1">{textSuffix}</tspan>
            </text> 
        </g> 
    ); 
};

const PositiveTurnLabel = (props) => { 
    const { x, y, index, data, patternId, stroke } = props; 
    const point = data[index]; 
    if (!point || !point[`p${patternId}_just_positive`]) return null; 
    
    const offsetIndex = point[`p${patternId}_pos_turn_offset`] || 0;
    const textYear = `${point.year}`;
    const textSuffix = "年目プラス転換";
    const boxWidthHalf = 54; 
    const boxHeight = 34; 
    const arrowSize = 6;
    const boxBottom = -20 - (offsetIndex * (boxHeight + 6));

    return ( 
        <g transform={`translate(${x},${y})`}> 
            <defs>
                <filter id={`shadow-pt-${index}-${patternId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
                </filter>
            </defs> 
            <path d={`M0,0 L0,${boxBottom}`} stroke={stroke} strokeWidth="1" strokeDasharray="2 2" /> 
            <path 
                d={`M0,${boxBottom} L-${arrowSize},${boxBottom - arrowSize} L-${boxWidthHalf - 4},${boxBottom - arrowSize} Q-${boxWidthHalf},${boxBottom - arrowSize} -${boxWidthHalf},${boxBottom - arrowSize - 4} L-${boxWidthHalf},${boxBottom - boxHeight + 4} Q-${boxWidthHalf},${boxBottom - boxHeight} -${boxWidthHalf - 4},${boxBottom - boxHeight} L${boxWidthHalf - 4},${boxBottom - boxHeight} Q${boxWidthHalf},${boxBottom - boxHeight} ${boxWidthHalf},${boxBottom - boxHeight + 4} L${boxWidthHalf},${boxBottom - arrowSize - 4} Q${boxWidthHalf},${boxBottom - arrowSize} ${boxWidthHalf - 4},${boxBottom - arrowSize} L${arrowSize},${boxBottom - arrowSize} Z`} 
                fill={stroke} 
                stroke="white" 
                strokeWidth="1" 
                filter={`url(#shadow-pt-${index}-${patternId})`}
            /> 
            <text x={0} y={boxBottom - 17} textAnchor="middle" fill="#fff" style={{fontFamily: 'ui-monospace, monospace', dominantBaseline: 'middle'}}>
                <tspan fontSize="15" fontWeight="800" dy="0">{textYear}</tspan>
                <tspan fontSize="11" fontWeight="bold" dy="-1">{textSuffix}</tspan>
            </text> 
        </g> 
    ); 
};

const OtherLoanPaidOffLabel = (props) => {
    const { x, y, index, data, otherLoans = [] } = props;
    const point = data[index];
    if (!point || !point.other_loan_paid_off) return null;

    const validLoans = otherLoans.filter(l => (l.balance || 0) > 0 && (l.monthlyPayment || 0) > 0);
    const loanName = validLoans.length === 1
        ? (validLoans[0].name || 'その他の借入')
        : validLoans.map(l => l.name || 'その他の借入').join('・');

    const textYear = `${point.year}`;
    const textSuffix = `年目${loanName}完済`;
    const boxWidthHalf = Math.max(70, Math.ceil((textYear.length * 10 + textSuffix.length * 11) / 2) + 16);
    const boxHeight = 36;
    const arrowSize = 6;
    const boxTop = 20;
    const brownColor = "#92400e";

    return (
        <g transform={`translate(${x},${y})`}>
            <defs>
                <filter id={`shadow-ol-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
                </filter>
            </defs>
            <path d={`M0,0 L0,${boxTop}`} stroke={brownColor} strokeWidth="1" strokeDasharray="2 2" />
            <path
                d={`M0,${boxTop} L-${arrowSize},${boxTop + arrowSize} L-${boxWidthHalf - 4},${boxTop + arrowSize} Q-${boxWidthHalf},${boxTop + arrowSize} -${boxWidthHalf},${boxTop + arrowSize + 4} L-${boxWidthHalf},${boxTop + boxHeight - 4} Q-${boxWidthHalf},${boxTop + boxHeight} -${boxWidthHalf - 4},${boxTop + boxHeight} L${boxWidthHalf - 4},${boxTop + boxHeight} Q${boxWidthHalf},${boxTop + boxHeight} ${boxWidthHalf},${boxTop + boxHeight - 4} L${boxWidthHalf},${boxTop + arrowSize + 4} Q${boxWidthHalf},${boxTop + arrowSize} ${boxWidthHalf - 4},${boxTop + arrowSize} L${arrowSize},${boxTop + arrowSize} Z`}
                fill={brownColor}
                stroke="white"
                strokeWidth="1"
                filter={`url(#shadow-ol-${index})`}
            />
            <text x={0} y={boxTop + 24} textAnchor="middle" fill="#fff" style={{fontFamily: 'ui-monospace, monospace', dominantBaseline: 'middle'}}>
                <tspan fontSize="15" fontWeight="800" dy="0">{textYear}</tspan>
                <tspan fontSize="10" fontWeight="bold" dy="-1">{textSuffix}</tspan>
            </text>
        </g>
    );
};

const MemoLabel = (props) => { const { x, y, index, data, patternId, stroke } = props; const point = data[index]; const memoText = point[`p${patternId}_memo`]; if (!memoText) return null; const boxBottom = -35; const boxHeight = 30; const minWidth = 80; const charWidth = 14; const textWidth = Math.max(minWidth, memoText.length * charWidth + 20); const boxWidthHalf = textWidth / 2; const arrowSize = 8; return ( <g transform={`translate(${x},${y})`}> <defs><filter id="memo-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.15" /></filter></defs> <line x1="0" y1="0" x2="0" y2={boxBottom} stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" /> <g filter="url(#memo-shadow)"> <path d={`M 0 ${boxBottom} L -${arrowSize} ${boxBottom - arrowSize} L -${boxWidthHalf - 5} ${boxBottom - arrowSize} Q -${boxWidthHalf} ${boxBottom - arrowSize} -${boxWidthHalf} ${boxBottom - arrowSize - 5} L -${boxWidthHalf} ${boxBottom - arrowSize - boxHeight + 5} Q -${boxWidthHalf} ${boxBottom - arrowSize - boxHeight} -${boxWidthHalf - 5} ${boxBottom - arrowSize - boxHeight} L ${boxWidthHalf - 5} ${boxBottom - arrowSize - boxHeight} Q ${boxWidthHalf} ${boxBottom - arrowSize - boxHeight} ${boxWidthHalf} ${boxBottom - arrowSize - boxHeight + 5} L ${boxWidthHalf} ${boxBottom - arrowSize - 5} Q ${boxWidthHalf} ${boxBottom - arrowSize} ${boxWidthHalf - 5} ${boxBottom - arrowSize} L ${arrowSize} ${boxBottom - arrowSize} Z`} fill="white" stroke={stroke} strokeWidth="2"/> </g> <text x="0" y={boxBottom - arrowSize - (boxHeight/2) + 1} textAnchor="middle" fill={stroke} fontSize={13} fontWeight="bold" style={{fontFamily: 'ui-monospace, monospace', dominantBaseline: 'middle'}}>{memoText}</text> </g> ); };

// --- InfoPanelの文字サイズ調整 ---
const InfoPanel = ({ activeYear, data, patterns, startAge }) => { 
    const targetData = data.find(d => d.year === activeYear) || {}; 
    const hasAge = startAge !== '' && startAge !== null && !isNaN(startAge);
    const currentAge = hasAge ? parseInt(startAge) + activeYear : null;

    return ( 
        <div className="bg-white p-4 border border-slate-200 rounded-xl h-full flex flex-col justify-center font-mono shadow-sm"> 
            <div className="text-center mb-6 pb-2 border-b border-slate-100 pt-2"> 
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Simulation Year</span> 
                <div className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2"> 
                    {activeYear} <span className="text-sm font-normal text-slate-500 mt-2">年目</span>
                    {currentAge && <span className="text-xl text-slate-400 ml-2 mt-1">({currentAge}歳)</span>}
                </div> 
            </div> 
            <div className="space-y-4 pb-6"> 
                {patterns.map((p, idx) => { 
                    const pId = p.id; 
                    const assetYen = targetData[`p${pId}_asset_yen`] || 0;
                    const balanceYen = targetData[`p${pId}_combined_balance`] ?? targetData[`p${pId}_balance`] ?? 0;
                    const netYen = targetData[`p${pId}_combined_net`] ?? (assetYen - balanceYen);
                    const assetMan = formatYenToManDecimal(assetYen); 
                    const balanceMan = formatYenToManDecimal(balanceYen); 
                    const netMan = formatYenToManDecimal(netYen); 
                    const colors = ['#6366f1', '#10b981', '#f59e0b']; 
                    const color = colors[idx % 3]; 
                    const memo = p.memos?.find(m => m.year === activeYear); 
                    
                    return ( 
                        <div key={pId} className="group"> 
                            <div className="flex items-center gap-2 mb-1"> 
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div> 
                                <span className="font-bold text-slate-700 text-base">{p.name}</span> 
                            </div> 
                            <div className="pl-4 space-y-1"> 
                                <div className="flex justify-between items-baseline text-sm"> 
                                    <span className="text-slate-400 text-sm">資産</span> 
                                    <span className="font-bold text-slate-700 text-base lg:text-base xl:text-lg">{assetMan} <span className="text-sm font-normal">万円</span></span> 
                                </div> 
                                <div className="flex justify-between items-baseline text-sm"> 
                                    <span className="text-slate-400 text-sm">借入</span> 
                                    <span className="font-bold text-rose-500 text-base lg:text-base xl:text-lg">{balanceMan} <span className="text-sm font-normal">万円</span></span> 
                                </div> 
                                <div className="flex justify-between items-baseline text-sm border-t border-slate-100 pt-1 mt-1"> 
                                    <span className="text-slate-400 text-sm">純資産</span> 
                                    <span className={`font-bold text-base lg:text-base xl:text-lg ${netYen >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{netMan} <span className="text-sm font-normal">万円</span></span> 
                                </div> 
                                {memo && ( <div className="mt-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-slate-700 flex items-start gap-1.5"> <StickyNote size={12} className="text-yellow-500 shrink-0 mt-0.5" /> <span className="font-bold">{memo.text}</span> </div> )} 
                            </div> 
                        </div> 
                    ); 
                })} 
            </div> 
        </div> 
    ); 
};

const SaveLoadModal = ({ isOpen, mode, onClose, onSave, onLoad, onDelete, savedList, user }) => {
    const [saveSimName, setSaveSimName] = useState('');
    const [filterStaff, setFilterStaff] = useState(true);
    const [filterOthers, setFilterOthers] = useState(true);
    const [filterName, setFilterName] = useState('');
    const [filterCreator, setFilterCreator] = useState('');
    const [visibility, setVisibility] = useState('public');
    
    const [loginLogs, setLoginLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);

    const isStaff = user?.email && user.email.endsWith('@sunpro36.co.jp');

    const creators = useMemo(() => {
        const names = savedList.map(i => i.userName).filter(n => n);
        return [...new Set(names)].sort();
    }, [savedList]);

    useEffect(() => {
        if (isOpen) {
            setSaveSimName('');
            setFilterStaff(true);
            setFilterOthers(true);
            setFilterName('');
            setFilterCreator('');
            setVisibility('public');
            setShowLogs(false);
            setLoginLogs([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (filterName === 'ログイン履歴' && isStaff && db) {
            const fetchLogs = async () => {
                try {
                    const logsRef = collection(db, 'login_logs');
                    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(500));
                    const snapshot = await getDocs(q);
                    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setLoginLogs(logs);
                    setShowLogs(true);
                } catch (error) {
                    console.error("Failed to fetch logs", error);
                }
            };
            fetchLogs();
        } else {
            setShowLogs(false);
        }
    }, [filterName, isStaff]);

    if (!isOpen) return null;

    const filteredList = savedList.filter(item => {
        // 絞り込み条件（名前、作成者）
        if (filterName && !item.name.includes(filterName)) return false;
        if (filterCreator && item.userName !== filterCreator) return false;

        // LOCAS マジックワードロジック
        if (filterName && filterName.toUpperCase().includes('LOCAS') && item.name.toUpperCase().includes('LOCAS')) {
            return true;
        }

        const isItemOwner = item.createdBy === user?.uid;
        const isStaffData = item.creatorEmail && item.creatorEmail.endsWith('@sunpro36.co.jp');
        const isPublic = item.visibility !== 'private'; 

        if (isStaff) {
            if (isItemOwner) {
                // pass
            } else if (isStaffData) {
                if (!isPublic) return false;
                if (!filterStaff) return false;
            } else {
                if (!filterOthers) return false;
            }
        } else {
              if (!isItemOwner) return false;
        }

        return true;
    });

    const handleSaveClick = () => {
        const userName = user?.displayName || '未設定';
        const saveVisibility = isStaff ? visibility : 'private';
        if (saveSimName) onSave(saveSimName, userName, saveVisibility);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-mono no-print fixed-overlay">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-base">{mode === 'save' ? <Save size={20} className="text-indigo-600"/> : <FolderOpen size={20} className="text-emerald-600"/>} {mode === 'save' ? 'シミュレーションを保存' : '共有シミュレーションを読込'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {mode === 'save' ? (
                        <div className="space-y-6">
                            {isStaff && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-600 flex items-center gap-1"><User size={16}/> 作成者名</label>
                                    <div className="p-3 bg-slate-100 rounded-lg text-slate-700 font-bold border border-slate-200 text-sm">
                                        {user?.displayName || '未設定'}
                                    </div>
                                    <p className="text-xs text-slate-400">※Googleアカウント名、または「未設定」として保存されます。</p>
                                </div>
                            )}
                            
                            {isStaff && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-600 flex items-center gap-1"><Eye size={16}/> 閲覧範囲</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer border border-slate-200 p-2 rounded-lg flex-1 hover:bg-slate-50">
                                            <input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} className="accent-indigo-600" />
                                            <span className="text-sm font-bold text-slate-700">サンプロスタッフ</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer border border-slate-200 p-2 rounded-lg flex-1 hover:bg-slate-50">
                                            <input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} className="accent-rose-500" />
                                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><Lock size={14} /> 自分のみ</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div><label className="block text-sm font-bold text-slate-600 mb-2">シミュレーション名 <span className="text-rose-500">*</span></label><input type="text" value={saveSimName} onChange={(e) => setSaveSimName(e.target.value)} placeholder="例: マイホーム計画A案" className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/></div>
                            <button onClick={handleSaveClick} disabled={!saveSimName} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm"><Save size={18} /> 保存する</button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="mb-4 space-y-3">
                                {isStaff && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">データの種類</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setFilterStaff(!filterStaff)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded border text-xs transition ${filterStaff ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-400'}`}><Building size={14} />{filterStaff && <Check size={12} />} サンプロ</button>
                                            <button onClick={() => setFilterOthers(!filterOthers)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded border text-xs transition ${filterOthers ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-400'}`}><Users size={14} />{filterOthers && <Check size={12} />} その他</button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">シミュレーション名</label>
                                        <div className="relative">
                                            <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full border border-slate-300 rounded p-2 pl-8 text-xs outline-none focus:border-indigo-500" placeholder="検索..." />
                                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                                        </div>
                                    </div>
                                    {isStaff && (
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">作成者</label>
                                            <div className="relative">
                                                <select value={filterCreator} onChange={e => setFilterCreator(e.target.value)} className="w-full border border-slate-300 rounded p-2 pl-8 text-xs outline-none focus:border-indigo-500 appearance-none bg-white">
                                                    <option value="">全て</option>
                                                    {creators.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <Filter size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[300px]">
                                {showLogs ? (
                                    <div className="w-full text-xs">
                                        <div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 rounded text-slate-600 font-bold">
                                            <List size={16} /> ログイン履歴 (最新500件)
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-500">
                                                    <th className="p-2">日時</th>
                                                    <th className="p-2">氏名</th>
                                                    <th className="p-2">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loginLogs.map(log => (
                                                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="p-2">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                                                        <td className="p-2">{log.displayName || '-'}</td>
                                                        <td className="p-2">{log.email}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <>
                                        {filteredList.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">該当するデータが見つかりません</p> : filteredList.map(item => {
                                            const isStaffData = item.creatorEmail && item.creatorEmail.endsWith('@sunpro36.co.jp');
                                            const isPrivate = item.visibility === 'private';
                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition group cursor-pointer" onClick={() => onLoad(item)}>
                                                    <div className="flex-1">
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                                            {isPrivate && <Lock size={12} className="text-slate-400" />}
                                                        </div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                                                            <span>{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : '日時不明'}</span>
                                                            {isStaff && (
                                                                <>
                                                                    {item.userName && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{item.userName}</span>}
                                                                    {!item.userName && <span className="text-[10px] bg-slate-100 text-slate-300 px-2 py-0.5 rounded-full">未設定</span>}
                                                                    {isStaffData && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold"><Building size={10} /> サンプロ</span>}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.createdBy === user?.uid && (
                                                        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition opacity-0 group-hover:opacity-100" title="削除"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PatternCard = ({
    pattern, rates, simulationLength,
    onUpdatePattern, onUpdateAllRates, onUpdateSingleRate,
    initialPaymentYen, totalPaymentYen, onUpdateLoanFromPayment, onCopyBudget, onCopyInvestmentAfterLoan,
    showDetail, onToggleDetail, onCopyRate,
    assumptions
}) => {
    const currentLoanInterest = rates?.[0]?.loanInterest ?? 1.5;
    const currentInvestmentYield = rates?.[0]?.investmentYield ?? 5.0;
    const currentInflationRate = rates?.[0]?.inflationRate ?? 0;
    const budget = Math.round((pattern.loanTotal + pattern.loanDownPayment) * 10) / 10;
    const memos = pattern.memos || [];
    const totalIncome = assumptions ? assumptions.incomes.reduce((s, i) => s + (i.value || 0), 0) : 0;
    const otherMonthlyPayment = assumptions ? assumptions.otherLoans.reduce((s, l) => s + (l.monthlyPayment || 0), 0) : 0;
    const repaymentRatio = totalIncome > 0 ? ((initialPaymentYen / 10000 + otherMonthlyPayment) * 12 / totalIncome * 100) : null;
    
    const [isMemoOpen, setIsMemoOpen] = useState(false);
    const [newMemoYear, setNewMemoYear] = useState(10);
    const [newMemoText, setNewMemoText] = useState('');

    const handleBudgetChange = (value) => {
        const newBudget = parseFloat(value) || 0;
        const newLoanTotal = Math.max(0, Math.round((newBudget - pattern.loanDownPayment) * 10) / 10);
        onUpdatePattern('loanTotal', newLoanTotal);
    };

    const handleAddMemo = () => {
        if (!newMemoText.trim()) return;
        const updatedMemos = [...memos.filter(m => m.year !== newMemoYear), { year: newMemoYear, text: newMemoText }];
        updatedMemos.sort((a, b) => a.year - b.year);
        onUpdatePattern('memos', updatedMemos);
        setNewMemoText('');
    };

    const handleDeleteMemo = (targetYear) => {
        const updatedMemos = memos.filter(m => m.year !== targetYear);
        onUpdatePattern('memos', updatedMemos);
    };

    const SectionHeader = ({ icon: Icon, title, colorClass }) => (
        <div className={`flex items-center gap-2 py-3 px-6 -mx-6 mb-4 mt-2 section-header ${colorClass}`}><Icon size={18} /><span className="font-bold text-sm">{title}</span></div>
    );

    // テーマカラークラスの決定
    const themeClass = pattern.id === 1 ? 'text-theme-1' : pattern.id === 2 ? 'text-theme-2' : 'text-theme-3';
    const borderColorClass = pattern.id === 1 ? 'border-indigo-500' : pattern.id === 2 ? 'border-emerald-500' : 'border-amber-500';
    const printUnderlineClass = pattern.id === 1 ? 'print-underline-1' : pattern.id === 2 ? 'print-underline-2' : 'print-underline-3';

    return (
        <div className={`p-6 rounded-2xl border-2 transition shadow-sm h-fit font-mono pattern-card bg-white ${borderColorClass}`}>
            <div className="mb-4">
                <label className="block text-sm font-bold text-slate-400 mb-1">パターン名称</label>
                <div className={`hidden print:block ${printUnderlineClass}`}></div>
                <input type="text" value={pattern.name} onChange={(e) => onUpdatePattern('name', e.target.value)} className={`text-lg font-bold w-full bg-white/50 border-b-2 border-slate-200 focus:border-indigo-500 outline-none transition px-1 py-1 ${themeClass}`} placeholder="パターン名を入力"/>
            </div>
            
            <div className="mb-4 no-print">
                {!isMemoOpen ? (
                    <button onClick={() => setIsMemoOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 py-1 px-2 rounded hover:bg-indigo-50 transition w-fit">
                        <MessageSquarePlus size={14} /> メモを追加する
                    </button>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500">グラフにメモを表示</span>
                            <button onClick={() => setIsMemoOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                        </div>
                        <div className="flex gap-2 mb-2">
                            <div className="w-20">
                                <select value={newMemoYear} onChange={(e) => setNewMemoYear(parseInt(e.target.value))} className="w-full text-sm border border-slate-300 rounded p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    {Array.from({length: simulationLength}, (_, i) => i + 1).map(y => (
                                        <option key={y} value={y}>{y}年目</option>
                                    ))}
                                </select>
                            </div>
                            <input type="text" value={newMemoText} onChange={(e) => setNewMemoText(e.target.value)} placeholder="例: 子供入学" className="flex-1 text-sm border border-slate-300 rounded p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()}/>
                            <button onClick={handleAddMemo} disabled={!newMemoText} className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded disabled:bg-slate-300"><Plus size={16}/></button>
                        </div>
                        {memos.length > 0 && (
                            <div className="space-y-1 mt-2 border-t border-slate-200 pt-2">
                                {memos.map(memo => (
                                    <div key={memo.year} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{memo.year}年</span>
                                            <span className="text-slate-700">{memo.text}</span>
                                        </div>
                                        <button onClick={() => handleDeleteMemo(memo.year)} className="text-slate-300 hover:text-rose-500"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-2 text-sm">
                <div>
                    <SectionHeader icon={CreditCard} title="借入設定" colorClass="bg-[#eeeeee] text-slate-700 border-y border-slate-200" />
                    <div className="px-1 space-y-4">
                        <div><label className="block text-slate-700 mb-1 text-sm font-extrabold flex items-center gap-1">予算総額 (万円)</label><div className="flex gap-2"><SmartInput value={budget} onChange={(e) => handleBudgetChange(e.target.value)} className="w-full border-[3px] border-slate-700 font-bold bg-slate-50/50 rounded p-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"/><button type="button" onClick={() => onCopyBudget(budget)} className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 rounded px-3 flex items-center justify-center gap-1 text-sm transition no-print" title="他パターンの予算総額をこの金額に合わせます"><Copy size={16} /> <span className="hidden min-[1330px]:inline">他パターンへコピー</span><span className="inline min-[1330px]:hidden">コピー</span></button></div></div>
                        
                        <div className="grid grid-cols-2 gap-3 print-stack-inputs">
                            <div><label className="block text-slate-500 mb-1 text-sm font-bold">借入総額 (万円)</label><SmartInput value={pattern.loanTotal} onChange={(e) => {const v = parseFloat(e.target.value)||0; onUpdatePattern({loanTotal: v, loanDownPayment: Math.max(0, Math.round((budget - v)*10)/10)})}} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                            <div><label className="block text-slate-500 mb-1 text-sm font-bold">頭金 (万円)</label><SmartInput value={pattern.loanDownPayment} onChange={(e) => {const v = parseFloat(e.target.value)||0; onUpdatePattern({loanDownPayment: v, loanTotal: Math.max(0, Math.round((budget - v)*10)/10)})}} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                        </div>

                        <div>
                            <label className="block text-slate-500 mb-1 text-sm font-bold">毎月の返済額 (万円)</label>
                            <div className="flex items-center gap-2">
                                <SmartInput step={0.1} value={(Math.round(initialPaymentYen / 10000 * 10) / 10) || 0} onChange={(e) => onUpdateLoanFromPayment(e.target.value)} className="flex-1 border-[3px] border-slate-700 font-bold rounded p-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                {repaymentRatio !== null && (
                                    <div className={`flex-shrink-0 text-center text-xs font-bold px-2 py-1 rounded-lg border leading-tight ${repaymentRatio > 35 ? 'bg-rose-50 text-rose-600 border-rose-200' : repaymentRatio > 25 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        返済比率<br/>{repaymentRatio.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </div>
                        <div><label className="block text-slate-500 mb-1 text-sm font-bold">ボーナス返済額 (1回) (万円)</label><SmartInput value={pattern.bonusPayment} onChange={(e) => onUpdatePattern('bonusPayment', e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0"/></div>
                        
                        <div className="grid grid-cols-2 gap-3 print-stack-inputs">
                            <div><label className="block text-slate-500 mb-1 text-sm font-bold">期間 (年)</label><SmartInput value={pattern.loanYears} onChange={(e) => onUpdatePattern('loanYears', e.target.value)} className="w-full border-[3px] border-slate-700 font-bold rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                            <div><label className="block text-slate-500 mb-1 text-sm font-bold">総返済額 (万円)</label><div className="w-full border border-slate-200 bg-slate-50 rounded p-2 text-sm text-slate-700 font-medium h-[38px] flex items-center value-display">{formatYenToManDecimal(totalPaymentYen)} 万円</div></div>
                        </div>

                        <div className="pb-4">
                            <label className="block text-slate-500 mb-1 text-sm font-bold">返済方式</label>
                            <div className="hidden print:block text-right font-bold text-base repayment-display">
                                {pattern.repaymentType === 'equal-principal-interest' ? '元利均等' : '元金均等'}
                            </div>
                            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 print:hidden">
                                <button onClick={() => onUpdatePattern('repaymentType', 'equal-principal-interest')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${pattern.repaymentType === 'equal-principal-interest' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>元利均等</button>
                                <button onClick={() => onUpdatePattern('repaymentType', 'equal-principal')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${pattern.repaymentType === 'equal-principal' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>元金均等</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <SectionHeader icon={Coins} title="運用設定" colorClass="bg-[#eeeeee] text-slate-700 border-y border-slate-200" />
                    <div className="px-1 space-y-4 pb-4">
                        <div><label className="block text-slate-500 mb-1 text-sm font-bold">初期投資額 (万円)</label><SmartInput value={pattern.investmentInitial} onChange={(e) => onUpdatePattern('investmentInitial', e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-slate-500 text-sm font-bold">毎月の積立額 (借入中) (万円)</label>
                                <div className="flex bg-slate-100 rounded p-0.5 print:hidden">
                                    <button onClick={() => onUpdatePattern('investmentType', 'fixed')} className={`text-xs px-2 py-0.5 rounded ${!pattern.investmentType || pattern.investmentType === 'fixed' ? 'bg-white shadow text-slate-700 font-bold' : 'text-slate-400'}`}>定額</button>
                                    <button onClick={() => onUpdatePattern('investmentType', 'budget')} className={`text-xs px-2 py-0.5 rounded ${pattern.investmentType === 'budget' ? 'bg-white shadow text-slate-700 font-bold' : 'text-slate-400'}`}>月予算</button>
                                </div>
                            </div>
                            {pattern.investmentType === 'budget' ? (
                                <div className="relative">
                                    <SmartInput value={pattern.investmentBudget} onChange={(e) => onUpdatePattern('investmentBudget', e.target.value)} className="w-full border-[3px] border-slate-700 font-bold bg-indigo-50 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="月の総予算(返済+積立)"/>
                                    <div className="text-[10px] text-indigo-500 mt-1 print:hidden">※月予算 {pattern.investmentBudget}万円 - 返済額 = 積立額</div>
                                </div>
                            ) : (
                                <SmartInput value={pattern.monthlyInvestmentDuringLoan} onChange={(e) => onUpdatePattern('monthlyInvestmentDuringLoan', e.target.value)} className="w-full border-[3px] border-slate-700 font-bold rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            )}
                        </div>

                        <div>
                            <label className="block text-slate-500 mb-1 text-sm font-bold">毎月の積立額 (完済後) (万円)</label>
                            <div className="flex gap-2">
                                <SmartInput value={pattern.monthlyInvestmentAfterLoan} onChange={(e) => onUpdatePattern('monthlyInvestmentAfterLoan', e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                <button type="button" onClick={() => onCopyInvestmentAfterLoan(pattern.monthlyInvestmentAfterLoan)} className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 rounded px-3 flex items-center justify-center gap-1 text-sm transition no-print" title="他パターンの積立額（完済後）をこの金額に合わせます"><Copy size={16} /> <span className="hidden min-[1330px]:inline">他パターンへコピー</span><span className="inline min-[1330px]:hidden">コピー</span></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <SectionHeader icon={Percent} title="金利・利回り設定" colorClass="bg-[#eeeeee] text-slate-700 border-y border-slate-200" />
                    <div className="px-1 space-y-4">
                        <div className="grid grid-cols-1 gap-3 print-stack-inputs">
                            <div>
                                <label className="block text-slate-500 mb-1 text-sm font-bold">借入金利 (%)</label>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        {showDetail ? (
                                            <div className="w-full text-left bg-slate-100 rounded border border-slate-200 text-sm font-bold text-slate-500 p-2 h-[34px] flex items-center">
                                                {currentLoanInterest.toFixed(1)}
                                            </div>
                                        ) : (
                                            <RateInput value={currentLoanInterest} onChange={(val) => onUpdateAllRates('loanInterest', val)} colorClass="text-rose-600 bg-rose-50 border-rose-200" align="left" className="p-2 border"/>
                                        )}
                                    </div>
                                    <button disabled={showDetail} type="button" onClick={() => onCopyRate('loanInterest', currentLoanInterest)} className={`flex-shrink-0 border rounded px-3 flex items-center justify-center gap-1 text-sm transition no-print h-9 ${showDetail ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'}`} title={showDetail ? "詳細設定中はコピーできません" : "他パターンの借入金利をこの値に合わせます"}><Copy size={16} /> <span className="hidden min-[1330px]:inline">他パターンへコピー</span><span className="inline min-[1330px]:hidden">コピー</span></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-500 mb-1 text-sm font-bold">運用利回り (%)</label>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        {showDetail ? (
                                            <div className="w-full text-left bg-slate-100 rounded border border-slate-200 text-sm font-bold text-slate-500 p-2 h-[34px] flex items-center">
                                                {currentInvestmentYield.toFixed(1)}
                                            </div>
                                        ) : (
                                            <RateInput value={currentInvestmentYield} onChange={(val) => onUpdateAllRates('investmentYield', val)} colorClass="text-emerald-600 bg-emerald-50 border-emerald-200" align="left" className="p-2 border"/>
                                        )}
                                    </div>
                                    <button disabled={showDetail} type="button" onClick={() => onCopyRate('investmentYield', currentInvestmentYield)} className={`flex-shrink-0 border rounded px-3 flex items-center justify-center gap-1 text-sm transition no-print h-9 ${showDetail ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'}`} title={showDetail ? "詳細設定中はコピーできません" : "他パターンの運用利回りをこの値に合わせます"}><Copy size={16} /> <span className="hidden min-[1330px]:inline">他パターンへコピー</span><span className="inline min-[1330px]:hidden">コピー</span></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-500 mb-1 text-sm font-bold">インフレ率 (%)</label>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        {showDetail ? (
                                            <div className="w-full text-left bg-slate-100 rounded border border-slate-200 text-sm font-bold text-slate-500 p-2 h-[34px] flex items-center">
                                                {currentInflationRate.toFixed(1)}
                                            </div>
                                        ) : (
                                            <RateInput value={currentInflationRate} onChange={(val) => onUpdateAllRates('inflationRate', val)} colorClass="text-purple-600 bg-purple-50 border-purple-200" align="left" className="p-2 border"/>
                                        )}
                                    </div>
                                    <button disabled={showDetail} type="button" onClick={() => onCopyRate('inflationRate', currentInflationRate)} className={`flex-shrink-0 border rounded px-3 flex items-center justify-center gap-1 text-sm transition no-print h-9 ${showDetail ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'}`} title={showDetail ? "詳細設定中はコピーできません" : "他パターンのインフレ率をこの値に合わせます"}><Copy size={16} /> <span className="hidden min-[1330px]:inline">他パターンへコピー</span><span className="inline min-[1330px]:hidden">コピー</span></button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-slate-100">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer w-fit hover:text-indigo-600 transition select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showDetail} 
                                    onChange={(e) => onToggleDetail(e.target.checked)}
                                    className="accent-indigo-600 rounded w-4 h-4 cursor-pointer"
                                />
                                年ごとの詳しい設定をする
                            </label>
                        </div>

                        {showDetail && (
                            <div className="mt-3 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-inner print-hidden animate-in fade-in slide-in-from-top-1">
                                <div className="overflow-x-auto">
                                <table className="w-full text-center text-sm">
                                    <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                                        <tr><th className="py-2 font-medium text-sm">年目</th><th className="py-2 font-medium text-sm text-rose-600">金利(%)</th><th className="py-2 font-medium text-sm text-emerald-600">利回り(%)</th><th className="py-2 font-medium text-sm text-purple-600">インフレ率(%)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rates?.slice(0, simulationLength).map((rate, i) => (
                                            <tr key={rate.year} className="hover:bg-slate-50">
                                                <td className="py-1 text-slate-400 text-sm">{rate.year}</td>
                                                <td className="py-1 px-2"><RateInput value={rate.loanInterest} onChange={(val) => onUpdateSingleRate(i, 'loanInterest', val)} colorClass="text-slate-700" /></td>
                                                <td className="py-1 px-2"><RateInput value={rate.investmentYield} onChange={(val) => onUpdateSingleRate(i, 'investmentYield', val)} colorClass="text-slate-700" /></td>
                                                <td className="py-1 px-2"><RateInput value={rate.inflationRate} onChange={(val) => onUpdateSingleRate(i, 'inflationRate', val)} colorClass="text-slate-700" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [isStaff, setIsStaff] = useState(false);
    const [common, setCommon] = useState({ years: 50, startAge: '' });
    const [globalShowDetail, setGlobalShowDetail] = useState(false);
    const [detailVisibility, setDetailVisibility] = useState({ 1: false, 2: false, 3: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('save');
    const [savedSimulations, setSavedSimulations] = useState([]);
    const [bulkSettings, setBulkSettings] = useState({ 
        startYear: 1, endYear: 50, patterns: { 1: true, 2: true, 3: true }, 
        loanInterest: '', investmentYield: '', inflationRate: '',
        applyLoanInterest: false, applyInvestmentYield: false, applyInflationRate: false
    });
    const [activeYear, setActiveYear] = useState(50);
    const [notification, setNotification] = useState(null);
    const [showAssumptions, setShowAssumptions] = useState(false);
    const [assumptions, setAssumptions] = useState({
        incomes: [{ id: 1, value: 0 }, { id: 2, value: 0 }],
        gift: 0,
        otherLoans: [{ id: 1, name: 'その他の借入', balance: 0, monthlyPayment: 0, rate: 0 }]
    });
    const lastLogRef = useRef({ uid: null, isAnonymous: null });

    const [isTableCondensed, setIsTableCondensed] = useState(true);
    const [showBMPrice, setShowBMPrice] = useState(false);

    const [patterns, setPatterns] = useState([
        { id: 1, name: 'パターンA', loanTotal: 4000, loanDownPayment: 0, loanYears: 25, repaymentType: 'equal-principal-interest', investmentInitial: 0, monthlyInvestmentDuringLoan: 3, investmentType: 'fixed', investmentBudget: 12, monthlyInvestmentAfterLoan: 3, bonusPayment: 0, memos: [] },
        { id: 2, name: 'パターンB', loanTotal: 4000, loanDownPayment: 0, loanYears: 35, repaymentType: 'equal-principal-interest', investmentInitial: 0, monthlyInvestmentDuringLoan: 5, investmentType: 'fixed', investmentBudget: 12, monthlyInvestmentAfterLoan: 5, bonusPayment: 0, memos: [] },
        { id: 3, name: 'パターンC', loanTotal: 4000, loanDownPayment: 0, loanYears: 50, repaymentType: 'equal-principal-interest', investmentInitial: 0, monthlyInvestmentDuringLoan: 7, investmentType: 'fixed', investmentBudget: 12, monthlyInvestmentAfterLoan: 7, bonusPayment: 0, memos: [] }
    ]);

    const [patternRates, setPatternRates] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const urlLoan = parseFloat(params.get('l'));
        const urlAsset = parseFloat(params.get('y'));
        const urlInf = parseFloat(params.get('i'));

        const initLoan = !isNaN(urlLoan) ? urlLoan : 1.5;
        const initAsset = !isNaN(urlAsset) ? urlAsset : 5.0;
        const initInf = !isNaN(urlInf) ? urlInf : 0;

        const initialRates = Array.from({ length: 100 }, (_, i) => ({ 
            year: i + 1, 
            loanInterest: initLoan, 
            investmentYield: initAsset, 
            inflationRate: initInf 
        }));
        return { 1: JSON.parse(JSON.stringify(initialRates)), 2: JSON.parse(JSON.stringify(initialRates)), 3: JSON.parse(JSON.stringify(initialRates)) };
    });

    // 共有データの復元（共通処理）
    const restoreSharedData = (data) => {
        if (data.common) setCommon({ ...data.common, startAge: data.common.startAge ?? '' });
        if (data.patterns) setPatterns(data.patterns);
        if (data.patternRates) {
            const newRates = {};
            Object.keys(data.patternRates).forEach(key => {
                const loadedData = data.patternRates[key];
                let paddedRates = [];
                let baseRate = { loanInterest: 1.5, investmentYield: 5.0, inflationRate: 0 };
                if (Array.isArray(loadedData)) {
                    const lastRate = loadedData[loadedData.length - 1] || baseRate;
                    paddedRates = loadedData.map(r => ({ ...r, inflationRate: r.inflationRate ?? 0 }));
                    while (paddedRates.length < 100) {
                        paddedRates.push({ ...lastRate, year: paddedRates.length + 1, inflationRate: lastRate.inflationRate ?? 0 });
                    }
                } else if (loadedData && loadedData.type === 'uniform') {
                    baseRate = { ...loadedData.data, inflationRate: loadedData.data.inflationRate ?? 0 };
                    paddedRates = Array.from({ length: 100 }, (_, i) => ({ ...baseRate, year: i + 1 }));
                }
                newRates[key] = paddedRates;
            });
            setPatternRates(newRates);
        }
        if (data.assumptions) setAssumptions(data.assumptions);
        if (data.showAssumptions !== undefined) setShowAssumptions(data.showAssumptions);
        if (data.globalShowDetail !== undefined) setGlobalShowDetail(data.globalShowDetail);
        if (data.detailVisibility) setDetailVisibility(data.detailVisibility);
        if (data.bulkSettings) setBulkSettings(data.bulkSettings);
        if (data.isTableCondensed !== undefined) setIsTableCondensed(data.isTableCondensed);
        if (data.showBMPrice !== undefined) setShowBMPrice(data.showBMPrice);
    };

    // 共有URLからの復元処理
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const shareParam = params.get('share');
        const idParam = params.get('id');

        if (idParam && db) {
            // 案A：FirestoreのドキュメントIDで復元
            (async () => {
                try {
                    setNotification("データを読み込み中...");
                    const docSnap = await getDoc(doc(db, 'artifacts', appId, 'shared_links', idParam));
                    if (docSnap.exists()) {
                        restoreSharedData(docSnap.data());
                        setNotification("共有データを復元しました");
                    } else {
                        setNotification("共有データが見つかりませんでした");
                    }
                    window.history.replaceState({}, '', window.location.pathname);
                } catch(e) {
                    console.error("共有データの復元に失敗しました", e);
                    setNotification("共有データの読み込みに失敗しました");
                }
            })();
        } else if (shareParam) {
            // 旧方式（?share=）：後方互換性のため残す
            try {
                const data = JSON.parse(LZString.decompressFromEncodedURIComponent(shareParam));
                if (data) {
                    restoreSharedData(data);
                    setNotification("共有データを復元しました");
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } catch(e) {
                console.error("共有データの復元に失敗しました", e);
                setNotification("共有データの読み込みに失敗しました");
            }
        }
    }, []);

    // 期間変更時に一括編集ツールの初期値を更新
    useEffect(() => { 
        setActiveYear(common.years); 
        setBulkSettings(prev => ({ ...prev, endYear: common.years }));
    }, [common.years]);

    // インフレ率が入力されているかチェック
    const hasInflation = useMemo(() => {
        return Object.values(patternRates).some(rates =>
            rates.slice(0, common.years).some(r => r.inflationRate && r.inflationRate !== 0)
        );
    }, [patternRates, common.years]);

    const otherLoanYearData = useMemo(() => {
        const loans = assumptions.otherLoans.filter(l => (l.balance || 0) > 0 && (l.monthlyPayment || 0) > 0);
        if (!loans.length) return [];
        const loanStates = loans.map(loan => ({
            balance: (loan.balance || 0) * 10000,
            monthlyPayment: (loan.monthlyPayment || 0) * 10000,
            rate: loan.rate || 0,
            name: loan.name || 'その他の借入'
        }));
        const yearData = [];
        for (let y = 1; y <= common.years; y++) {
            let totalBalance = 0, totalAnnualPayment = 0, totalAnnualInterest = 0;
            loanStates.forEach(state => {
                let annualPayment = 0, annualInterest = 0;
                for (let m = 0; m < 12; m++) {
                    if (state.balance <= 0) break;
                    const interest = state.rate > 0 ? Math.round(state.balance * state.rate / 1200) : 0;
                    const principal = Math.min(Math.max(0, state.monthlyPayment - interest), state.balance);
                    state.balance = Math.max(0, state.balance - principal);
                    if (state.balance < 1) state.balance = 0;
                    annualPayment += principal + interest;
                    annualInterest += interest;
                }
                totalAnnualPayment += annualPayment;
                totalAnnualInterest += annualInterest;
                totalBalance += state.balance;
            });
            yearData.push({ year: y, totalBalance, totalAnnualPayment, totalAnnualInterest });
        }
        return yearData;
    }, [assumptions.otherLoans, common.years]);

    useEffect(() => {
        if (auth) {
            const unsubAuth = onAuthStateChanged(auth, (u) => {
                if (u) {
                    setUser(u);
                    setIsStaff(u.email && u.email.endsWith('@sunpro36.co.jp'));

                    const shouldLog = lastLogRef.current.uid !== u.uid || lastLogRef.current.isAnonymous !== u.isAnonymous;

                    if (shouldLog && db) {
                        addDoc(collection(db, 'login_logs'), {
                            uid: u.uid,
                            email: u.email,
                            displayName: u.displayName,
                            isAnonymous: u.isAnonymous,
                            timestamp: serverTimestamp(),
                            userAgent: navigator.userAgent,
                            loginType: u.isAnonymous ? 'anonymous' : 'permanent'
                        }).catch(err => console.error("Log error", err));
                        
                        lastLogRef.current = { uid: u.uid, isAnonymous: u.isAnonymous };
                    }
                } else {
                    signInAnonymously(auth).catch((e) => {
                        console.error("Anonymous auth failed", e);
                    });
                }
            });
            return () => unsubAuth();
        }
    }, []);

    useEffect(() => {
        if (!user || !db) return;
        
        const colRef = collection(db, 'artifacts', appId, 'shared_simulations');
        
        let q;
        // ログインしていれば、全員分のデータを取得する（フィルタリングはクライアント側で行う）
        q = query(colRef, orderBy('createdAt', 'desc'));

        const unsub = onSnapshot(q, snap => {
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setSavedSimulations(list);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
        });
        return () => unsub();
    }, [user, isStaff]);

    const login = async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (e) {
            console.error(e);
            alert("ログインに失敗しました");
        }
    };

    const logout = async () => {
        await signOut(auth);
        window.location.reload();
    };

    const handleShare = async () => {
        if (!db) { setNotification("共有機能が利用できません"); return; }

        // 金利・利回りデータを軽量化
        const optimizedPatternRates = {};
        Object.keys(patternRates).forEach(key => {
            const targetRates = patternRates[key].slice(0, common.years);
            if (targetRates.length === 0) return;
            const first = targetRates[0];
            const isUniform = targetRates.every(r =>
                r.loanInterest === first.loanInterest &&
                r.investmentYield === first.investmentYield &&
                r.inflationRate === first.inflationRate
            );
            optimizedPatternRates[key] = isUniform
                ? { type: 'uniform', data: first }
                : targetRates;
        });

        const shareData = {
            common, patterns,
            patternRates: optimizedPatternRates,
            assumptions, showAssumptions,
            globalShowDetail, detailVisibility, bulkSettings,
            isTableCondensed, showBMPrice
        };

        try {
            setNotification("URL生成中...");

            // Firestoreに保存（ログイン不要）
            const docRef = await addDoc(
                collection(db, 'artifacts', appId, 'shared_links'),
                { ...shareData, createdAt: serverTimestamp() }
            );

            // ドキュメントIDだけをURLに載せる（短い）
            const shortUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            await navigator.clipboard.writeText(shortUrl);
            setNotification("共有URLをコピーしました！");
        } catch(e) {
            console.error("共有エラー:", e);
            setNotification("URL生成に失敗しました");
        }
    };

    const handleSave = async (name, userName, visibility) => { 
        if (!user) {
            alert("認証エラー");
            return; 
        }
        try { 
            await addDoc(collection(db, 'artifacts', appId, 'shared_simulations'), { 
                name, userName, createdBy: user.uid, creatorEmail: user.email, createdAt: serverTimestamp(), common, patterns, patternRates, globalShowDetail,
                visibility: visibility || 'public' 
            }); 
            setIsModalOpen(false); 
            setNotification("シミュレーションを保存しました");
        } catch (e) { 
            console.error("Save error", e);
            alert("保存に失敗しました: " + e.message); 
        } 
    };
    
    const handleLoad = (data) => { 
        if (data.common) setCommon({ ...data.common, startAge: data.common.startAge ?? '' }); 
        if (data.patterns) setPatterns(data.patterns); 
        if (data.patternRates) {
            const newRates = {};
            Object.keys(data.patternRates).forEach(key => {
                newRates[key] = data.patternRates[key].map(r => ({
                    ...r,
                    inflationRate: r.inflationRate ?? 0 
                }));
            });
            setPatternRates(newRates);
        }
        setGlobalShowDetail(data.globalShowDetail || false); 
        setIsModalOpen(false); 
        setNotification("データを読み込みました");
    };
    
    const handleDelete = async (docId) => { 
        if (!user || !db || !confirm("本当に削除しますか？")) return; 
        try { 
            await deleteDoc(doc(db, 'artifacts', appId, 'shared_simulations', docId)); 
        } catch (e) { 
            console.error(e); 
            alert("削除に失敗しました: " + e.message);
        } 
    };
    
    const handleBulkUpdate = () => {
        setPatternRates(prev => {
            const next = { ...prev };
            Object.keys(bulkSettings.patterns).forEach(pId => {
                if (!bulkSettings.patterns[pId]) return;
                next[pId] = next[pId].map(rate => {
                    if (rate.year >= bulkSettings.startYear && rate.year <= bulkSettings.endYear) {
                        const newRate = { ...rate };
                        if (bulkSettings.applyLoanInterest && bulkSettings.loanInterest !== '') {
                            newRate.loanInterest = parseFloat(bulkSettings.loanInterest);
                        }
                        if (bulkSettings.applyInvestmentYield && bulkSettings.investmentYield !== '') {
                            newRate.investmentYield = parseFloat(bulkSettings.investmentYield);
                        }
                        if (bulkSettings.applyInflationRate && bulkSettings.inflationRate !== '') {
                            newRate.inflationRate = parseFloat(bulkSettings.inflationRate);
                        }
                        return newRate;
                    }
                    return rate;
                });
            });
            return next;
        });
        setNotification("設定を一括反映しました");
    };

    const togglePatternDetail = (id, isChecked) => {
        setDetailVisibility(prev => ({ ...prev, [id]: isChecked }));
    };

    const toggleGlobalDetail = () => {
        const newState = !globalShowDetail;
        setGlobalShowDetail(newState);
        setDetailVisibility({ 1: newState, 2: newState, 3: newState });
    };

    const calculateInitialMonthlyPaymentYen = (loanAmountYen, years, annualRatePercent, type, bonusPaymentYen) => {
        if (loanAmountYen <= 0 || years <= 0) return 0;
        const monthlyRate = (annualRatePercent / 100) / 12;
        const numPayments = years * 12;
        const bonusRate = monthlyRate * 6;
        const numBonusPayments = years * 2;
        let bonusPrincipalYen = 0;
        if (bonusPaymentYen > 0) bonusPrincipalYen = bonusPaymentYen * (1 - Math.pow(1 + bonusRate, -numBonusPayments)) / bonusRate;
        if (!Number.isFinite(bonusPrincipalYen)) bonusPrincipalYen = 0;
        let monthlyPrincipalYen = Math.max(0, loanAmountYen - bonusPrincipalYen);
        if (type === 'equal-principal-interest') {
            if (monthlyRate === 0) return monthlyPrincipalYen / numPayments;
            const term = Math.pow(1 + monthlyRate, numPayments);
            return (monthlyPrincipalYen * monthlyRate * term) / (term - 1);
        } else {
            return (monthlyPrincipalYen / numPayments) + (monthlyPrincipalYen * monthlyRate);
        }
    };

    const calculatePrincipalFromPaymentYen = (paymentYen, years, annualRatePercent, type, bonusPaymentYen) => {
        let monthlyPrincipalYen = 0;
        const monthlyRate = (annualRatePercent / 100) / 12;
        const numPayments = years * 12;
        if (type === 'equal-principal-interest') {
            if (monthlyRate === 0) monthlyPrincipalYen = paymentYen * numPayments;
            else { const term = Math.pow(1 + monthlyRate, numPayments); monthlyPrincipalYen = paymentYen * (term - 1) / (monthlyRate * term); }
        } else {
            const divisor = (1 / numPayments) + monthlyRate;
            if (divisor !== 0) monthlyPrincipalYen = paymentYen / divisor;
        }
        let bonusPrincipalYen = 0;
        const bonusRate = monthlyRate * 6;
        const numBonusPayments = years * 2;
        if (bonusPaymentYen > 0) bonusPrincipalYen = bonusPaymentYen * (1 - Math.pow(1 + bonusRate, -numBonusPayments)) / bonusRate;
        if (!Number.isFinite(bonusPrincipalYen)) bonusPrincipalYen = 0;
        return monthlyPrincipalYen + bonusPrincipalYen;
    };

    const updatePattern = (index, field, value) => {
        const newPatterns = [...patterns];
        if (typeof field === 'object') newPatterns[index] = { ...newPatterns[index], ...field };
        else newPatterns[index][field] = (field === 'repaymentType' || field === 'name' || field === 'investmentType' || field === 'memos') ? value : (parseFloat(value) || 0);
        setPatterns(newPatterns);
    };

    const updateLoanFromPayment = (index, paymentValueMan) => {
        const p = patterns[index];
        const rate = patternRates[p.id]?.[0]?.loanInterest ?? 1.5;
        const paymentYen = (parseFloat(paymentValueMan) || 0) * 10000;
        const bonusPaymentYen = p.bonusPayment * 10000;
        const principalYen = calculatePrincipalFromPaymentYen(paymentYen, p.loanYears, rate, p.repaymentType, bonusPaymentYen);
        const newPatterns = [...patterns]; 
        newPatterns[index].loanTotal = Math.round(principalYen / 10000 * 10) / 10; 
        setPatterns(newPatterns);
    };

    const copyBudgetToOthers = (sourceIndex, budget) => { const newPatterns = patterns.map((p, idx) => { if (idx === sourceIndex) return p; return { ...p, loanTotal: Math.max(0, Math.round((budget - p.loanDownPayment) * 10) / 10) }; }); setPatterns(newPatterns); };
    
    const copyInvestmentAfterLoanToOthers = (value) => {
        const newPatterns = patterns.map(p => ({ ...p, monthlyInvestmentAfterLoan: value }));
        setPatterns(newPatterns);
    };

    const updateAllRates = (patternId, field, value) => { 
        const numVal = parseFloat(value) || 0;
        setPatternRates(prev => {
            const next = { ...prev };
            next[patternId] = next[patternId].map(r => ({ ...r, [field]: numVal }));
            return next;
        });
    };

    const copyRateToOthers = (field, value) => {
        const numVal = parseFloat(value) || 0;
        setPatternRates(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key] = next[key].map(r => ({ ...r, [field]: numVal }));
            });
            return next;
        });
    };

    const updateSingleRate = (patternId, yearIndex, field, value) => { setPatternRates(prev => { const next = [...prev[patternId]]; next[yearIndex] = { ...next[yearIndex], [field]: parseFloat(value)||0 }; return { ...prev, [patternId]: next }; }); };

    const calculatedTotalPayments = useMemo(() => {
        return patterns.map(p => {
            const rates = patternRates[p.id] || [];
            const isDetailed = detailVisibility[p.id];
            const baseRateData = rates[0] ?? { loanInterest: 1.5 };

            const loanMonths = p.loanYears * 12;
            let bonusPrincipalYen = 0;
            
            const monthlyRate = (baseRateData.loanInterest??1.5)/1200;
            const bonusRate = monthlyRate * 6;
            const bonusPaymentYen = p.bonusPayment * 10000;
            const loanTotalYen = p.loanTotal * 10000;
            
            if (bonusPaymentYen > 0) bonusPrincipalYen = bonusPaymentYen * (1 - Math.pow(1 + bonusRate, -(p.loanYears * 2))) / bonusRate;
            if (!Number.isFinite(bonusPrincipalYen)) bonusPrincipalYen = 0;
            if (bonusPrincipalYen > loanTotalYen) bonusPrincipalYen = loanTotalYen;
            
            let loanBalanceMonthly = loanTotalYen - bonusPrincipalYen, loanBalanceBonus = bonusPrincipalYen, totalPaymentYen = 0;
            
            for (let m = 0; m < loanMonths; m++) {
                const currentRateData = rates[Math.floor(m / 12)] || rates[rates.length - 1];
                const rateData = isDetailed ? currentRateData : baseRateData;

                const mRate = (rateData.loanInterest / 100) / 12;
                const remMonths = loanMonths - m;
                
                if (loanBalanceMonthly > 0) {
                    let pay = 0;
                    if (p.repaymentType === 'equal-principal-interest') {
                        if (mRate === 0) pay = loanBalanceMonthly / remMonths;
                        else { const term = Math.pow(1 + mRate, remMonths); pay = (loanBalanceMonthly * mRate * term) / (term - 1); }
                        loanBalanceMonthly -= (pay - (loanBalanceMonthly * mRate));
                    } else { pay = ((loanTotalYen - bonusPrincipalYen) / loanMonths) + (loanBalanceMonthly * mRate); loanBalanceMonthly -= (loanTotalYen - bonusPrincipalYen) / loanMonths; }
                    totalPaymentYen += pay;
                }
                if ((m + 1) % 6 === 0 && loanBalanceBonus > 0) {
                    let pay = 0;
                    const remBonus = (loanMonths - (m + 1)) / 6 + 1;
                    if (p.repaymentType === 'equal-principal-interest') {
                        const r6 = mRate * 6;
                        const term = Math.pow(1 + r6, remBonus);
                        pay = (loanBalanceBonus * r6 * term) / (term - 1);
                        loanBalanceBonus -= (pay - (loanBalanceBonus * r6));
                    } else { pay = (bonusPrincipalYen / (p.loanYears * 2)) + (loanBalanceBonus * mRate * 6); loanBalanceBonus -= (bonusPrincipalYen / (p.loanYears * 2)); }
                    totalPaymentYen += pay;
                }
            }
            return totalPaymentYen;
        });
    }, [patterns, patternRates, detailVisibility]);

    const simulationData = useMemo(() => {
        const results = [];
        const months = common.years * 12;
        let isPaidOff = patterns.map(() => false);
        let isPositive = patterns.map(() => false);
        const paidOffYearCounts = {};
        const positiveTurnYearCounts = {};
        let annualStats = patterns.map(() => ({ payment: 0, principal: 0, interest: 0, rate: 0, invRate: 0, investment: 0, inflation: 0 }));

        let states = patterns.map((p, idx) => {
            const rates = patternRates[p.id] || [];
            const firstRate = rates[0] || { loanInterest: 1.5, investmentYield: 5.0, inflationRate: 0 };
            
            const mRate = (firstRate.loanInterest??1.5)/1200;
            const bonusRate = mRate * 6;
            const loanTotalYen = p.loanTotal * 10000;
            const bonusPaymentYen = p.bonusPayment * 10000;
            const investmentInitialYen = p.investmentInitial * 10000;
            let bonusPrincipalYen = 0;
            if (bonusPaymentYen > 0) bonusPrincipalYen = bonusPaymentYen * (1 - Math.pow(1 + bonusRate, -(p.loanYears * 2))) / bonusRate;
            if (!Number.isFinite(bonusPrincipalYen)) bonusPrincipalYen = 0;
            if (bonusPrincipalYen > loanTotalYen) bonusPrincipalYen = loanTotalYen;
            return {
                loanBalanceMonthly: loanTotalYen - bonusPrincipalYen, loanBalanceBonus: bonusPrincipalYen, loanBalance: loanTotalYen,
                initialLoanMonthly: loanTotalYen - bonusPrincipalYen, initialLoanBonus: bonusPrincipalYen,
                currentAsset: investmentInitialYen, totalInvested: investmentInitialYen, monthlyPayment: 0, initialPayment: 0,
                deflator: 1.0 
            };
        });

        results.push({ 
            year: 0, 
            ...states.reduce((acc, s, i) => ({
                ...acc, 
                [`p${i+1}_asset`]: s.currentAsset / 10000, 
                [`p${i+1}_asset_yen`]: s.currentAsset, 
                [`p${i+1}_balance_neg`]: -(s.loanBalance / 10000), 
                [`p${i+1}_balance`]: s.loanBalance, 
                [`p${i+1}_net`]: (s.currentAsset-s.loanBalance)/10000,
                [`p${i+1}_real_balance`]: s.loanBalance,
                [`p${i+1}_real_asset`]: s.currentAsset,
                [`p${i+1}_real_net`]: s.currentAsset - s.loanBalance,
                [`p${i+1}_deflator`]: s.deflator
            }), {}) 
        });

        for (let m = 1; m <= months; m++) {
            const year = Math.floor((m - 1) / 12) + 1;
            states = states.map((s, idx) => {
                const p = patterns[idx];
                const isDetailed = detailVisibility[p.id];
                const defaultRates = { loanInterest: 1.5, investmentYield: 5.0, inflationRate: 0 };
                
                const yearRates = patternRates[p.id]?.[year - 1] ?? defaultRates;
                const baseRates = patternRates[p.id]?.[0] ?? defaultRates;
                const rates = isDetailed ? yearRates : baseRates;

                const mRate = rates.loanInterest / 1200;
                const invRate = Math.pow(1 + rates.investmentYield/100, 1/12) - 1;
                const infRateMonthly = Math.pow(1 + (rates.inflationRate ?? 0)/100, 1/12) - 1;

                annualStats[idx].rate = rates.loanInterest;
                annualStats[idx].invRate = rates.investmentYield;
                annualStats[idx].inflation = rates.inflationRate ?? 0;

                const loanMonths = p.loanYears * 12;
                const remMonths = loanMonths - (m - 1);
                let { loanBalanceMonthly, loanBalanceBonus, currentAsset, totalInvested, deflator } = s;
                let mPrincipal = 0, mInterest = 0, mPayment = 0;

                deflator = deflator / (1 + infRateMonthly);

                let payMonthly = 0;
                if (loanBalanceMonthly > 0 && remMonths > 0) {
                    const interest = Math.round(loanBalanceMonthly * mRate);
                    let princ = 0;
                    if (p.repaymentType === 'equal-principal-interest') {
                        const term = Math.pow(1 + mRate, remMonths);
                        payMonthly = Math.round((loanBalanceMonthly * mRate * term) / (term - 1));
                        princ = payMonthly - interest;
                    } else { princ = Math.round(s.initialLoanMonthly / loanMonths); payMonthly = princ + interest; }
                    
                    if (princ > loanBalanceMonthly) { princ = loanBalanceMonthly; payMonthly = princ + interest; }
                    loanBalanceMonthly -= princ;
                    if (loanBalanceMonthly < 1) loanBalanceMonthly = 0;
                    mPrincipal += princ; mInterest += interest; mPayment += payMonthly;
                }
                
                let displayMonthlyPayment = payMonthly;

                if (m % 6 === 0 && loanBalanceBonus > 0 && remMonths >= 0) {
                    const remBonus = Math.ceil((loanMonths - (m - 1)) / 6);
                    const interest = Math.round(loanBalanceBonus * mRate * 6);
                    let pay = 0, princ = 0;
                    if (p.repaymentType === 'equal-principal-interest') {
                        const r6 = mRate * 6;
                        const term = Math.pow(1 + r6, remBonus);
                        pay = Math.round((loanBalanceBonus * r6 * term) / (term - 1));
                        princ = pay - interest;
                    } else { princ = Math.round(s.initialLoanBonus / (p.loanYears * 2)); pay = princ + interest; }
                    if (princ > loanBalanceBonus) { princ = loanBalanceBonus; pay = princ + interest; }
                    loanBalanceBonus -= princ;
                    if (loanBalanceBonus < 1) loanBalanceBonus = 0;
                    mPrincipal += princ; mInterest += interest; mPayment += pay;
                }

                const loanBalance = Math.max(0, loanBalanceMonthly + loanBalanceBonus);
                annualStats[idx].payment += mPayment;
                annualStats[idx].principal += mPrincipal;
                annualStats[idx].interest += mInterest;
                let initialPayment = s.initialPayment;
                if (m === 1) initialPayment = mPayment;

                let invAmount = 0;
                let displayMonthlyInvestment = 0;

                if (loanBalance > 1) {
                    if (p.investmentType === 'budget') {
                        const budgetYen = (p.investmentBudget || 0) * 10000;
                        invAmount = Math.max(0, budgetYen - mPayment);
                        displayMonthlyInvestment = Math.max(0, budgetYen - displayMonthlyPayment);
                    } else { 
                        invAmount = p.monthlyInvestmentDuringLoan * 10000; 
                        displayMonthlyInvestment = invAmount;
                    }
                } else { 
                    invAmount = p.monthlyInvestmentAfterLoan * 10000; 
                    displayMonthlyInvestment = invAmount;
                }

                currentAsset = currentAsset * (1 + invRate) + invAmount;
                totalInvested += invAmount;
                annualStats[idx].investment += invAmount;

                return { ...s, loanBalanceMonthly, loanBalanceBonus, loanBalance, currentAsset, totalInvested, monthlyPayment: mPayment, initialPayment, displayMonthlyPayment, displayMonthlyInvestment, deflator };
            });

            if (m % 12 === 0) {
                const yearIndex = m / 12;
                const dataPoint = { year: yearIndex };
                states.forEach((s, i) => {
                    const net = s.currentAsset - s.loanBalance;
                    
                    dataPoint[`p${i+1}_asset`] = s.currentAsset / 10000;
                    dataPoint[`p${i+1}_asset_yen`] = s.currentAsset;
                    dataPoint[`p${i+1}_balance_neg`] = -(s.loanBalance / 10000);
                    dataPoint[`p${i+1}_balance`] = Math.round(s.loanBalance);
                    dataPoint[`p${i+1}_net`] = net / 10000; 
                    
                    const realBalance = s.loanBalance * s.deflator;
                    const realAsset = s.currentAsset * s.deflator;
                    dataPoint[`p${i+1}_real_balance`] = Math.round(realBalance);
                    dataPoint[`p${i+1}_real_asset`] = Math.round(realAsset);
                    dataPoint[`p${i+1}_real_net`] = Math.round(realAsset - realBalance);
                    dataPoint[`p${i+1}_deflator`] = s.deflator;

                    const nomLoanRate = annualStats[i].rate / 100;
                    const nomInvRate = annualStats[i].invRate / 100;
                    const inflation = annualStats[i].inflation / 100;
                    dataPoint[`p${i+1}_real_loan_rate`] = ((1 + nomLoanRate) / (1 + inflation) - 1) * 100;
                    dataPoint[`p${i+1}_real_inv_rate`] = ((1 + nomInvRate) / (1 + inflation) - 1) * 100;
                    
                    dataPoint[`p${i+1}_payment`] = s.monthlyPayment;
                    dataPoint[`p${i+1}_monthly_payment_display`] = s.displayMonthlyPayment;
                    dataPoint[`p${i+1}_monthly_investment_display`] = s.displayMonthlyInvestment;

                    dataPoint[`p${i+1}_annual_payment`] = Math.round(annualStats[i].payment);
                    dataPoint[`p${i+1}_annual_principal`] = Math.round(annualStats[i].principal);
                    dataPoint[`p${i+1}_annual_interest`] = Math.round(annualStats[i].interest);
                    dataPoint[`p${i+1}_annual_investment`] = Math.round(annualStats[i].investment);
                    dataPoint[`p${i+1}_total_invested`] = Math.round(s.totalInvested);
                    dataPoint[`p${i+1}_profit`] = Math.round(s.currentAsset - s.totalInvested);
                    
                    dataPoint[`p${i+1}_annual_rate`] = annualStats[i].rate;
                    dataPoint[`p${i+1}_annual_inv_rate`] = annualStats[i].invRate;
                    dataPoint[`p${i+1}_annual_inflation`] = annualStats[i].inflation;

                    if (s.loanBalance <= 0 && patterns[i].loanTotal > 0 && !isPaidOff[i]) {
                        isPaidOff[i] = true;
                        dataPoint[`p${i+1}_just_paid_off`] = true;
                        dataPoint[`p${i+1}_paid_off_offset`] = paidOffYearCounts[yearIndex] || 0;
                        paidOffYearCounts[yearIndex] = (paidOffYearCounts[yearIndex] || 0) + 1;
                    }
                    if (net >= 0 && !isPositive[i]) {
                        isPositive[i] = true;
                        dataPoint[`p${i+1}_just_positive`] = true;
                        dataPoint[`p${i+1}_pos_turn_offset`] = positiveTurnYearCounts[yearIndex] || 0;
                        positiveTurnYearCounts[yearIndex] = (positiveTurnYearCounts[yearIndex] || 0) + 1;
                    }
                    
                    const memo = patterns[i].memos?.find(m => m.year === yearIndex);
                    if (memo) {
                        dataPoint[`p${i+1}_memo`] = memo.text;
                    }
                });
                annualStats = patterns.map(() => ({ payment: 0, principal: 0, interest: 0, rate: 0, invRate: 0, investment: 0, inflation: 0 }));
                results.push(dataPoint);
            }
        }
        results.initialPayments = states.map(s => s.initialPayment);
        return results;
    }, [common.years, patterns, patternRates, detailVisibility]);

    const hasOtherLoans = otherLoanYearData.length > 0;

    const mergedSimulationData = useMemo(() => {
        if (!otherLoanYearData.length) return simulationData;
        const initialOtherBal = assumptions.otherLoans
            .filter(l => (l.balance || 0) > 0 && (l.monthlyPayment || 0) > 0)
            .reduce((sum, l) => sum + (l.balance || 0) * 10000, 0);
        let paidOffMarked = false;
        const merged = simulationData.map(d => {
            if (d.year === 0) {
                const otherBalNeg = -(initialOtherBal / 10000);
                const result = { ...d };
                [1, 2, 3].forEach(pId => {
                    const housingBal = d[`p${pId}_balance`] || 0;
                    const assetYen = d[`p${pId}_asset_yen`] || 0;
                    result[`p${pId}_balance_neg`] = (d[`p${pId}_balance_neg`] || 0) + otherBalNeg;
                    result[`p${pId}_combined_balance`] = housingBal + initialOtherBal;
                    result[`p${pId}_combined_net`] = assetYen - housingBal - initialOtherBal;
                });
                return result;
            }
            const yearIdx = d.year - 1;
            const od = otherLoanYearData[yearIdx] || { totalBalance: 0 };
            const prevOd = yearIdx > 0 ? otherLoanYearData[yearIdx - 1] : { totalBalance: initialOtherBal };
            const otherBal = od.totalBalance;
            const otherBalNeg = -(otherBal / 10000);
            const result = { ...d };
            [1, 2, 3].forEach(pId => {
                const housingBal = d[`p${pId}_balance`] || 0;
                const assetYen = d[`p${pId}_asset_yen`] || 0;
                result[`p${pId}_balance_neg`] = (d[`p${pId}_balance_neg`] || 0) + otherBalNeg;
                result[`p${pId}_combined_balance`] = housingBal + otherBal;
                result[`p${pId}_combined_net`] = assetYen - housingBal - otherBal;
            });
            if (!paidOffMarked && otherBal === 0 && prevOd && prevOd.totalBalance > 0) {
                result.other_loan_paid_off = true;
                paidOffMarked = true;
            }
            return result;
        });
        merged.initialPayments = simulationData.initialPayments;
        return merged;
    }, [simulationData, otherLoanYearData, assumptions.otherLoans]);

    // プラス転換ラベルの近接オフセット再計算（異なる年でも近ければズラす）
    const posTurnData = useMemo(() => {
        const PROXIMITY = 4; // この年数以内を近接とみなす
        const events = [];
        mergedSimulationData.forEach(point => {
            [1, 2, 3].forEach(pId => {
                if (point[`p${pId}_just_positive`]) events.push({ year: point.year, pId });
            });
        });
        events.sort((a, b) => a.year - b.year);
        const assignments = new Map();
        events.forEach(ev => {
            const usedOffsets = new Set(
                events
                    .filter(o => assignments.has(`${o.year}-${o.pId}`) && Math.abs(o.year - ev.year) <= PROXIMITY)
                    .map(o => assignments.get(`${o.year}-${o.pId}`))
            );
            let offset = 0;
            while (usedOffsets.has(offset)) offset++;
            assignments.set(`${ev.year}-${ev.pId}`, offset);
        });
        const result = mergedSimulationData.map(point => {
            const updated = { ...point };
            [1, 2, 3].forEach(pId => {
                if (point[`p${pId}_just_positive`]) {
                    const o = assignments.get(`${point.year}-${pId}`);
                    if (o !== undefined) updated[`p${pId}_pos_turn_offset`] = o;
                }
            });
            return updated;
        });
        result.initialPayments = mergedSimulationData.initialPayments;
        return result;
    }, [mergedSimulationData]);

    const SimpleLegend = () => (
        <div className="flex flex-wrap justify-center gap-6 mb-4">
            {[{id:1,color:'#6366f1'},{id:2,color:'#10b981'},{id:3,color:'#f59e0b'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <div className="flex items-center gap-1"><div className="w-6 h-0.5" style={{backgroundColor:item.color}}></div><div className="w-6 h-0.5" style={{borderTop:`2px dashed ${item.color}`}}></div></div><span>{patterns[i].name}</span>
                </div>
            ))}
        </div>
    );

    // --- TIPSコンポーネント ---
    const RealNetTooltip = ({ year, nominal, real, align = "center", direction = "top" }) => {
        let posClass = "left-1/2 -translate-x-1/2"; 
        let arrowClass = "left-1/2 -translate-x-1/2";
        
        if (align === "right") {
            posClass = "right-0"; 
            arrowClass = "right-4";
        } else if (align === "left") {
            posClass = "left-0";
            arrowClass = "left-4";
        }

        const nVal = parseInt(nominal.replace(/,/g, ''));
        const rVal = parseInt(real.replace(/,/g, ''));
        
        const isInflation = Math.abs(nVal) >= Math.abs(rVal);
        const textDir = isInflation ? "上がる" : "下がる";
        const isNegative = nVal < 0;

        const baseClass = `hidden group-hover:block absolute w-72 bg-slate-800 text-white text-xs rounded-lg p-3 z-[100] shadow-xl text-left font-normal leading-relaxed whitespace-normal break-words ${posClass}`;
        
        const placementClass = direction === "top" ? "bottom-full mb-2" : "top-full mt-2";
        const arrowPlacementClass = direction === "top" ? "top-full -mt-1 border-t-slate-800" : "bottom-full -mb-1 border-b-slate-800";
        const arrowBorderClass = direction === "top" ? "border-t-slate-800" : "border-b-slate-800";

        const absNominal = formatYen(Math.abs(nVal));
        const absReal = formatYen(Math.abs(rVal));

        return (
            <div className="relative group inline-block mr-1 align-text-bottom no-print">
                <Info size={14} className="text-purple-400 cursor-help opacity-80 hover:opacity-100" />
                <div className={`${baseClass} ${placementClass}`}>
                    <div className="font-bold mb-1.5 border-b border-slate-600 pb-1 text-purple-200">実質純資産とは？</div>
                    <p className="mb-1">実質純資産は今の価値に換算した資産力です。</p>
                    <p className="text-slate-300">
                        {isNegative ? (
                            <>
                                <span className="text-white font-bold">{year}年後</span>に<span className="text-white font-bold">{absNominal}円の借入</span>がある場合、物価が{textDir}と、今の<span className="text-white font-bold">{absReal}円の借入</span>と同じくらいの家計負担になります。
                            </>
                        ) : (
                            <>
                                <span className="text-white font-bold">{year}年後</span>に<span className="text-white font-bold">{absNominal}円</span>がある場合、物価が{textDir}と、今の<span className="text-white font-bold">{absReal}円</span>と同じくらいの生活水準になります。
                            </>
                        )}
                    </p>
                    <div className={`absolute left-0 right-0 mx-auto w-0 h-0 border-4 border-transparent ${arrowBorderClass} ${arrowPlacementClass} ${arrowClass === "left-1/2 -translate-x-1/2" ? "left-1/2 -translate-x-1/2" : (align==="right"?"right-4 left-auto":"left-4")}`}></div>
                </div>
            </div>
        );
    };

    const handleChartMouseMove = (e) => { if (e && e.activeLabel) setActiveYear(e.activeLabel); };
    const handleChartMouseLeave = () => { setActiveYear(common.years); };

    const xTicks = useMemo(() => {
        const ticks = [];
        for (let i = 0; i <= common.years; i++) {
            if (i % 5 === 0) ticks.push(i);
        }
        return ticks;
    }, [common.years]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-mono text-slate-800">
            {notification && <Toast message={notification} onClose={() => setNotification(null)} />}
            <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Calculator className="text-indigo-600" size={28} />
                        <span>マネフロ - 資産運用・借入比較シミュレーター</span>
                    </h1>
                    <p className="text-sm md:text-base font-normal text-slate-500 tracking-wider mt-1 ml-9">
                        SUNPRO MONEY FLOW DESIGNER
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto no-print items-center flex-wrap">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold transition shadow-sm text-sm"><Printer size={18} /> <span>印刷</span></button>
                    
                    <button onClick={handleShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-bold transition shadow-sm text-sm" title="シミュレーション状態をコピー"><Share2 size={18} /> <span>共有</span></button>
                    
                    {user?.email ? (
                        <>
                            <button onClick={() => { setModalMode('save'); setIsModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 font-bold transition shadow-sm text-sm"><Save size={18} /> 保存</button>
                            <button onClick={() => { setModalMode('load'); setIsModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition shadow-sm text-sm"><FolderOpen size={18} /> 読込</button>
                            <div className="flex items-center gap-2 ml-2 border-l pl-4 border-slate-300">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Icon" className="w-8 h-8 rounded-full border border-slate-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><User size={16}/></div>
                                )}
                                <span className="text-sm text-slate-600 hidden lg:inline font-bold">{user.displayName || user.email}</span>
                                <button onClick={logout} className="p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100 hover:bg-slate-200 ml-1" title="ログアウト"><LogOut size={18}/></button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button onClick={login} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm ml-2 shadow-sm font-bold whitespace-nowrap"><LogIn size={16}/> Googleでログイン</button>
                            <div className="hidden md:block text-[10px] font-bold text-indigo-600 leading-tight text-left">
                                シミュレーションの保存が<br/>可能になります。
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            <Disclaimer isStaff={isStaff} />

            <div className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 print-hidden">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex items-center gap-4 flex-1">
                            <Settings2 size={24} className="text-slate-500" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-700">シミュレーション設定</h2>
                                <p className="text-sm text-slate-400">全体の表示期間を設定します</p>
                            </div>
                        </div>



                        <div className="flex flex-col items-end gap-1 w-full md:w-1/3">
                            <div className="flex items-center gap-2 mb-1 w-full justify-end">
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">表示期間: <span className="text-xl text-indigo-600">{common.years}</span> 年</span>
                            </div>
                            <input type="range" min="10" max="60" step="1" value={common.years} onChange={(e) => setCommon(prev => ({ ...prev, years: parseInt(e.target.value) }))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between w-full text-xs text-slate-400 px-1"><span>10年</span><span>60年</span></div>
                        </div>
                    </div>

                    <button onClick={() => setShowAssumptions(!showAssumptions)} className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 border-2 border-dashed rounded-xl transition no-print ${showAssumptions ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'}`}>
                        {showAssumptions ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 年齢・年収などの詳しい前提設定{showAssumptions ? 'を閉じる' : 'を開く'}
                    </button>

                    {showAssumptions && (
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-5 no-print">

                            {/* 開始年齢・年収①・年収②・贈与額 横並び */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {/* 開始年齢 */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">開始年齢</label>
                                    <div className="flex items-center gap-2 bg-white rounded border border-slate-300 p-2">
                                        <SmartInput
                                            type="number"
                                            value={common.startAge || ''}
                                            onChange={(e) => setCommon(prev => ({ ...prev, startAge: e.target.value }))}
                                            className="w-full font-bold text-left outline-none text-slate-700 text-sm"
                                            placeholder="未設定"
                                        />
                                        {common.startAge ? (
                                            <>
                                                <span className="text-sm text-slate-600 whitespace-nowrap">歳</span>
                                                <button type="button" onClick={() => setCommon(prev => ({ ...prev, startAge: '' }))} className="text-slate-300 hover:text-rose-500 transition flex-shrink-0"><X size={14}/></button>
                                            </>
                                        ) : null}
                                    </div>
                                    <input type="range" min="20" max="70" step="1" value={common.startAge || 20} onChange={(e) => setCommon(prev => ({ ...prev, startAge: e.target.value }))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2" />
                                    <div className="flex justify-between w-full text-xs text-slate-400 px-1 mt-0.5"><span>20歳</span><span>70歳</span></div>
                                </div>
                                {/* 年収① */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">年収１（万円）</label>
                                    <SmartInput
                                        value={assumptions.incomes[0]?.value ?? 0}
                                        onChange={(e) => setAssumptions(prev => { const inc = [...prev.incomes]; inc[0] = { ...inc[0], value: parseFloat(e.target.value) || 0 }; return { ...prev, incomes: inc }; })}
                                        className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-bold text-slate-700"
                                        placeholder="0"
                                    />
                                </div>
                                {/* 年収② */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">年収２（万円）</label>
                                    <SmartInput
                                        value={assumptions.incomes[1]?.value ?? 0}
                                        onChange={(e) => setAssumptions(prev => { const inc = prev.incomes.length >= 2 ? [...prev.incomes] : [...prev.incomes, { id: 2, value: 0 }]; inc[1] = { ...inc[1], value: parseFloat(e.target.value) || 0 }; return { ...prev, incomes: inc }; })}
                                        className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-bold text-slate-700"
                                        placeholder="0"
                                    />
                                </div>
                                {/* 贈与額 */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">贈与額（万円）</label>
                                    <SmartInput
                                        value={assumptions.gift}
                                        onChange={(e) => setAssumptions(prev => ({ ...prev, gift: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-bold text-slate-700"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* その他の借入 */}
                            <div>

                                <div className="space-y-3">
                                    {assumptions.otherLoans.map((loan) => (
                                        <div key={loan.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-end">
                                            <div>
                                                <div className="text-sm text-slate-500 font-bold mb-1">借入名</div>
                                                <input
                                                    type="text"
                                                    value={loan.name ?? ''}
                                                    onChange={(e) => setAssumptions(prev => ({ ...prev, otherLoans: prev.otherLoans.map(l => l.id === loan.id ? { ...l, name: e.target.value } : l) }))}
                                                    placeholder="その他の借入"
                                                    className="w-full border border-slate-300 rounded px-2 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm text-slate-500 font-bold mb-1">借入金額（万円）</div>
                                                <SmartInput
                                                    value={loan.balance}
                                                    onChange={(e) => setAssumptions(prev => ({ ...prev, otherLoans: prev.otherLoans.map(l => l.id === loan.id ? { ...l, balance: parseFloat(e.target.value) || 0 } : l) }))}
                                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50 font-bold text-slate-700"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm text-slate-500 font-bold mb-1">毎月の返済額（万円）</div>
                                                <SmartInput
                                                    value={loan.monthlyPayment}
                                                    onChange={(e) => setAssumptions(prev => ({ ...prev, otherLoans: prev.otherLoans.map(l => l.id === loan.id ? { ...l, monthlyPayment: parseFloat(e.target.value) || 0 } : l) }))}
                                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50 font-bold text-slate-700"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm text-slate-500 font-bold mb-1">金利（%）</div>
                                                <div className="flex items-center gap-1">
                                                    <RateInput
                                                        value={loan.rate || 0}
                                                        onChange={(v) => setAssumptions(prev => ({ ...prev, otherLoans: prev.otherLoans.map(l => l.id === loan.id ? { ...l, rate: v } : l) }))}
                                                        colorClass="text-orange-600 bg-orange-50 border-orange-200"
                                                        align="left"
                                                        className="p-2 border flex-1"
                                                    />
                                                    <button
                                                        onClick={() => setAssumptions(prev => ({ ...prev, otherLoans: prev.otherLoans.filter(l => l.id !== loan.id) }))}
                                                        className="text-slate-300 hover:text-rose-500 transition p-1 rounded flex-shrink-0"
                                                    ><Minus size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-start gap-4 mt-2">
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => setAssumptions(prev => ({ ...prev, otherLoans: [...prev.otherLoans, { id: prev.otherLoans.length > 0 ? Math.max(...prev.otherLoans.map(l => l.id)) + 1 : 1, name: 'その他の借入', balance: 0, monthlyPayment: 0, rate: 0 }] }))}
                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 rounded-lg px-2 py-1 transition"
                                        ><Plus size={12}/> 他の借入を追加</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={toggleGlobalDetail} className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 border-2 border-dashed rounded-xl transition ${globalShowDetail ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'}`}>
                        {globalShowDetail ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 金利・利回りの一括設定{globalShowDetail ? 'を閉じる' : 'を開く'}
                    </button>

                    {globalShowDetail && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700"><Edit3 size={16}/> 一括編集ツール</div>
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                                <div className="flex-1 w-full xl:w-auto">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">対象パターン</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[1,2,3].map(id => (
                                            <label key={id} className="flex items-center gap-1 text-sm cursor-pointer bg-white px-2 py-1.5 rounded border border-slate-200 hover:border-indigo-300"><input type="checkbox" checked={bulkSettings.patterns[id]} onChange={e => setBulkSettings(p => ({...p, patterns: {...p.patterns, [id]: e.target.checked}}))} className="accent-indigo-600"/> {patterns[id-1].name}</label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">期間 (年目)</label>
                                        <div className="flex items-center gap-2">
                                            <SmartInput type="number" min="1" max="60" value={bulkSettings.startYear} onChange={e => setBulkSettings(p => ({...p, startYear: parseInt(e.target.value)}))} className="w-20 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="開始"/>
                                            <span className="text-slate-400">~</span>
                                            <SmartInput type="number" min="1" max="60" value={bulkSettings.endYear} onChange={e => setBulkSettings(p => ({...p, endYear: parseInt(e.target.value)}))} className="w-20 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="終了"/>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-28">
                                            <label className="flex items-center gap-1 text-xs font-bold text-rose-500 mb-1 cursor-pointer">
                                                <input type="checkbox" className="accent-rose-500" checked={bulkSettings.applyLoanInterest} onChange={e => setBulkSettings(p => ({...p, applyLoanInterest: e.target.checked}))} />
                                                借入金利(%)
                                            </label>
                                            <RateInput value={bulkSettings.loanInterest} onChange={v => setBulkSettings(p => ({...p, loanInterest: v}))} colorClass="text-rose-600 bg-rose-50 border-rose-200" align="left" className="p-2 border" disabled={!bulkSettings.applyLoanInterest} />
                                        </div>
                                        <div className="w-28">
                                            <label className="flex items-center gap-1 text-xs font-bold text-emerald-600 mb-1 cursor-pointer">
                                                <input type="checkbox" className="accent-emerald-600" checked={bulkSettings.applyInvestmentYield} onChange={e => setBulkSettings(p => ({...p, applyInvestmentYield: e.target.checked}))} />
                                                運用利回り(%)
                                            </label>
                                            <RateInput value={bulkSettings.investmentYield} onChange={v => setBulkSettings(p => ({...p, investmentYield: v}))} colorClass="text-emerald-600 bg-emerald-50 border-emerald-200" align="left" className="p-2 border" disabled={!bulkSettings.applyInvestmentYield} />
                                        </div>
                                        <div className="w-28">
                                            <label className="flex items-center gap-1 text-xs font-bold text-purple-600 mb-1 cursor-pointer">
                                                <input type="checkbox" className="accent-purple-600" checked={bulkSettings.applyInflationRate} onChange={e => setBulkSettings(p => ({...p, applyInflationRate: e.target.checked}))} />
                                                インフレ率(%)
                                            </label>
                                            <RateInput value={bulkSettings.inflationRate} onChange={v => setBulkSettings(p => ({...p, inflationRate: v}))} colorClass="text-purple-600 bg-purple-50 border-purple-200" align="left" className="p-2 border" disabled={!bulkSettings.applyInflationRate} />
                                        </div>
                                    </div>
                                    <div>
                                        <button onClick={handleBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition shadow-sm h-[38px] w-auto">反映する</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-grid-3-cols">
                    {patterns.map((p, idx) => {
                        const initialPaymentYen = simulationData.initialPayments ? simulationData.initialPayments[idx] : 0;
                        const currentPatternRates = patternRates[p.id]?.[0] ?? { loanInterest: 1.5, investmentYield: 5.0 };
                        return (
                            <PatternCard
                                key={p.id} pattern={p} rates={patternRates[p.id]} simulationLength={common.years}
                                initialPaymentYen={initialPaymentYen} totalPaymentYen={calculatedTotalPayments[idx]}
                                onUpdatePattern={(field, value) => updatePattern(idx, field, value)}
                                onUpdateAllRates={(field, value) => updateAllRates(p.id, field, value)}
                                onUpdateSingleRate={(yearIndex, field, value) => updateSingleRate(p.id, yearIndex, field, value)}
                                onUpdateLoanFromPayment={(val) => updateLoanFromPayment(idx, val)}
                                onCopyBudget={(budget) => copyBudgetToOthers(idx, budget)}
                                onCopyInvestmentAfterLoan={(val) => copyInvestmentAfterLoanToOthers(val)}
                                showDetail={detailVisibility[p.id]}
                                onToggleDetail={(checked) => togglePatternDetail(p.id, checked)}
                                onCopyRate={(field, value) => copyRateToOthers(field, value)}
                                assumptions={assumptions}
                            />
                        );
                    })}
                </div>

                <div className="print-page-break bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-indigo-500" /> 資産と借入の推移</h2></div>
                    <div className="flex flex-col md:flex-row gap-6 print-page-2-container">
                        <div className="w-full md:w-3/5 min-[1330px]:w-[70%] print-graph-full">
                            {/* スクロールヒント（スマホのみ） */}
                            <div className="md:hidden flex items-center justify-center gap-2 text-xs font-bold text-slate-400 mb-2 no-print">
                                <ChevronLeft size={14} />
                                横にスクロールできます
                                <ChevronRight size={14} />
                            </div>
                            {/* スクロールコンテナ */}
                            <div className="relative">
                                <div className="h-[420px] md:h-[600px] overflow-x-auto overflow-y-hidden">
                                    <div className="h-full min-w-[750px] md:min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={mergedSimulationData}
                                    margin={{ top: 40, right: 60, left: 20, bottom: 50 }}
                                    onMouseMove={handleChartMouseMove}
                                    onMouseLeave={handleChartMouseLeave}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
                                    <XAxis 
                                        dataKey="year" 
                                        unit="" 
                                        tick={(props) => <CustomXAxisTick {...props} startAge={common.startAge} />} 
                                        axisLine={{stroke: '#e2e8f0'}} 
                                        height={60}
                                        ticks={xTicks}
                                        interval={0}
                                    />
                                    <YAxis unit="万" tick={{fill: '#64748b', fontSize: 14, fontFamily: 'ui-monospace, monospace'}} axisLine={{stroke: '#e2e8f0'}} tickFormatter={(val) => formatCurrency(Math.abs(val))} />
                                    
                                    <Tooltip content={<></>} cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Legend content={<SimpleLegend />} verticalAlign="top" height={36} />
                                    
                                    <Line name="P1 借入" type="monotone" dataKey="p1_balance_neg" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                                    <Line name="P2 借入" type="monotone" dataKey="p2_balance_neg" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                                    <Line name="P3 借入" type="monotone" dataKey="p3_balance_neg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />

                                    <Line name="P1 資産" type="monotone" dataKey="p1_asset" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line name="P2 資産" type="monotone" dataKey="p2_asset" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line name="P3 資産" type="monotone" dataKey="p3_asset" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />

                                    <Line type="monotone" dataKey="p1_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p1_asset" content={<PositiveTurnLabel data={posTurnData} patternId={1} stroke="#6366f1" />} /></Line>
                                    <Line type="monotone" dataKey="p2_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p2_asset" content={<PositiveTurnLabel data={posTurnData} patternId={2} stroke="#10b981" />} /></Line>
                                    <Line type="monotone" dataKey="p3_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p3_asset" content={<PositiveTurnLabel data={posTurnData} patternId={3} stroke="#f59e0b" />} /></Line>
                                    <Line type="monotone" dataKey="p1_balance_neg" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p1_balance_neg" content={<PaidOffLabel data={mergedSimulationData} patternId={1} stroke="#6366f1" />} /></Line>
                                    <Line type="monotone" dataKey="p2_balance_neg" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p2_balance_neg" content={<PaidOffLabel data={mergedSimulationData} patternId={2} stroke="#10b981" />} /></Line>
                                    <Line type="monotone" dataKey="p3_balance_neg" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p3_balance_neg" content={<PaidOffLabel data={mergedSimulationData} patternId={3} stroke="#f59e0b" />} /></Line>

                                    <Line type="monotone" dataKey="p1_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p1_memo" content={<MemoLabel data={mergedSimulationData} patternId={1} stroke="#6366f1" />} /></Line>
                                    <Line type="monotone" dataKey="p2_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p2_memo" content={<MemoLabel data={mergedSimulationData} patternId={2} stroke="#10b981" />} /></Line>
                                    <Line type="monotone" dataKey="p3_asset" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p3_memo" content={<MemoLabel data={mergedSimulationData} patternId={3} stroke="#f59e0b" />} /></Line>
                                    {hasOtherLoans && <Line type="monotone" dataKey="p1_balance_neg" stroke="none" dot={false} activeDot={false}><LabelList dataKey="p1_balance_neg" content={<OtherLoanPaidOffLabel data={mergedSimulationData} otherLoans={assumptions.otherLoans} />} /></Line>}
                                </LineChart>
                            </ResponsiveContainer>
                                    </div>
                                </div>
                                {/* 右端グラデーション（スクロール示唆、スマホのみ） */}
                                <div className="md:hidden absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none no-print" />
                            </div>
                        </div>
                        <div className="w-full md:w-2/5 min-[1330px]:w-[30%] h-[600px] print-hidden">
                            <InfoPanel activeYear={activeYear} data={mergedSimulationData} patterns={patterns} startAge={common.startAge} />
                        </div>
                        <div className="hidden print-projections-row gap-4">
                            {patterns.map((p, idx) => {
                                const targetYears = [];
                                for (let y = 10; y < common.years; y += 10) { targetYears.push(y); }
                                targetYears.push(common.years);
                                const uniqueTargetYears = Array.from(new Set(targetYears)).sort((a, b) => a - b);
                                const themeColorClass = p.id === 1 ? 'text-theme-1' : p.id === 2 ? 'text-theme-2' : 'text-theme-3';
                                const borderColorClass = p.id === 1 ? 'border-theme-1' : p.id === 2 ? 'border-theme-2' : 'border-theme-3';

                                return (
                                    <div key={idx} className={`bg-white p-3 rounded print-projection-card w-full text-xs ${borderColorClass}`} style={{borderWidth: '1px'}}>
                                        <div className={`font-bold mb-2 text-sm border-b pb-1 ${themeColorClass} ${borderColorClass}`}>{p.name}</div>
                                        <div className="space-y-2">
                                            {uniqueTargetYears.map(year => {
                                                const data = mergedSimulationData.find(d => d.year === year);
                                                if (!data) return null;
                                                const asset = data[`p${idx + 1}_asset_yen`];
                                                const debt = data[`p${idx + 1}_combined_balance`] ?? data[`p${idx + 1}_balance`];
                                                const net = data[`p${idx + 1}_combined_net`] ?? (data[`p${idx + 1}_net`] * 10000);
                                                const isFinal = year === common.years;

                                                const hasAge = common.startAge !== '' && common.startAge !== null && !isNaN(common.startAge);
                                                const age = hasAge ? parseInt(common.startAge) + year : null;

                                                return (
                                                    <div key={year} className="projection-item-row">
                                                        <div className="font-bold text-slate-700 mb-1 flex justify-between items-center">
                                                            <div>
                                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-sm">{year}年後</span>
                                                                {age && <span className="ml-2 text-xs text-slate-500">({age}歳)</span>}
                                                            </div>
                                                            {isFinal && <span className="text-[10px] text-slate-400">終了</span>}
                                                        </div>
                                                        <div className="projection-value-block">
                                                            <span className="text-slate-500">資産</span>
                                                            <span className="font-bold print-text-black">{formatYen(asset)}</span>
                                                        </div>
                                                        <div className="projection-value-block">
                                                            <span className="text-slate-500">借入</span>
                                                            <span className="font-bold print-text-black">{formatYen(debt)}</span>
                                                        </div>
                                                        <div className="projection-value-block">
                                                            <span className="text-slate-500">純資産</span>
                                                            <span className={`font-bold print-text-black`}>{formatYen(net)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-hidden">
                    {patterns.map((p, idx) => {
                        const initialPaymentYen = simulationData.initialPayments ? simulationData.initialPayments[idx] : 0;
                        const currentPatternRates = patternRates[p.id]?.[0] ?? { loanInterest: 1.5, investmentYield: 5.0 };
                        const targetYears = [];
                        for (let y = 10; y < common.years; y += 10) { targetYears.push(y); }
                        targetYears.push(common.years);
                        const uniqueTargetYears = Array.from(new Set(targetYears)).sort((a, b) => a - b);
                        
                        const themeColor = p.id === 1 ? 'text-indigo-600' : p.id === 2 ? 'text-emerald-600' : 'text-amber-600';
                        const borderColor = p.id === 1 ? 'border-indigo-500' : p.id === 2 ? 'border-emerald-500' : 'border-amber-500';
                        const loanRange = getRateRangeString(patternRates[p.id], common.years, 'loanInterest');
                        const invRange = getRateRangeString(patternRates[p.id], common.years, 'investmentYield');

                        return (
                            <div key={idx} className={`bg-white p-6 rounded-2xl shadow-sm border-2 ${borderColor}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`font-bold text-base ${themeColor} flex flex-col`}><span>{p.name}</span><br/><span>将来予測</span></h3>
                                    <div className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-500 text-right">
                                        {p.loanYears}年返済<br/>
                                        <span className="block mt-0.5">金利 {loanRange ? loanRange : `${currentPatternRates.loanInterest.toFixed(1)}%`}</span>
                                        <span className="block">利回り {invRange ? invRange : `${currentPatternRates.investmentYield.toFixed(1)}%`}</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-600 flex items-center gap-1 font-medium"><Wallet size={16} className="text-slate-400"/> 毎月の返済額</span>
                                        <span className="font-bold text-slate-800 text-base">{formatYenToManDecimal(initialPaymentYen)} 万円</span>
                                    </div>
                                    <div className="space-y-4">
                                        {uniqueTargetYears.map(year => {
                                            const data = mergedSimulationData.find(d => d.year === year);
                                            if (!data) return null;
                                            const asset = data[`p${idx + 1}_asset_yen`];
                                            const debt = data[`p${idx + 1}_combined_balance`] ?? data[`p${idx + 1}_balance`];
                                            const net = data[`p${idx + 1}_combined_net`] ?? (data[`p${idx + 1}_net`] * 10000);

                                            const realAsset = data[`p${idx + 1}_real_asset`], realDebt = data[`p${idx + 1}_real_balance`], realNet = data[`p${idx + 1}_real_net`];

                                            const isFinal = year === common.years;
                                            const hasAge = common.startAge !== '' && common.startAge !== null && !isNaN(common.startAge);
                                            const age = hasAge ? parseInt(common.startAge) + year : null;

                                            return (
                                                <div key={year} className={`text-sm ${isFinal ? 'bg-slate-50 p-3 rounded-xl border border-slate-200' : 'pb-3 border-b border-slate-100 last:border-0'}`}>
                                                    <div className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-sm">{year}年後</span>
                                                        {age && <span className="text-xs text-slate-500">({age}歳)</span>}
                                                        {isFinal && <span className="text-sm text-indigo-600 font-normal">シミュレーション終了</span>}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-right mb-1">
                                                        <div className="col-span-1"><div className="text-sm text-slate-400 mb-0.5">資産</div><div className="font-bold text-slate-800 text-base">{formatYen(asset)}</div></div>
                                                        <div className="col-span-1"><div className="text-sm text-slate-400 mb-0.5">借入</div><div className="font-bold text-rose-500 text-base">{formatYen(debt)}</div></div>
                                                        <div className="col-span-1"><div className="text-sm text-slate-400 mb-0.5">純資産</div><div className={`font-bold text-base ${net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatYen(net)}</div></div>
                                                    </div>
                                                    {hasInflation && (
                                                        <div className="grid grid-cols-3 gap-2 text-right pt-2 border-t border-slate-200/50 mt-2">
                                                            <div className="col-span-1"><div className="text-[10px] text-slate-400 mb-0.5">実質資産</div><div className="font-bold text-slate-600 text-xs">{formatYen(realAsset)}</div></div>
                                                            <div className="col-span-1"><div className="text-[10px] text-slate-400 mb-0.5">実質借入</div><div className="font-bold text-slate-600 text-xs">{formatYen(realDebt)}</div></div>
                                                            <div className="col-span-1 flex justify-end items-center gap-1">
                                                                <div className="text-right">
                                                                    <div className="flex items-center justify-end gap-1 mb-0.5">
                                                                        <div className="order-2"><RealNetTooltip year={year} nominal={formatYen(net)} real={formatYen(realNet)} align="right" direction="top" /></div>
                                                                        <span className="text-[10px] text-slate-400 order-1">実質純資産</span>
                                                                    </div>
                                                                    <div className="font-bold text-purple-600 text-xs">{formatYen(realNet)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Table className="text-indigo-500" /> 詳細返済・運用データ</h2>
                        <div className="flex items-center gap-4">
                            {hasInflation && (
                                <>
                                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 no-print">
                                        <button onClick={() => setIsTableCondensed(false)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${!isTableCondensed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>全ての列を表示</button>
                                        <button onClick={() => setIsTableCondensed(true)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${isTableCondensed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>主要な列のみ表示</button>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer no-print select-none border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition">
                                        <input type="checkbox" checked={showBMPrice} onChange={(e) => setShowBMPrice(e.target.checked)} className="accent-orange-500 w-4 h-4"/>
                                        <span className="flex items-center gap-1 font-bold text-slate-700 text-sm"><HamburgerIcon size={16} className="text-orange-500"/> BM価格</span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {patterns.map((p, pIdx) => {
                            const borderColor = p.id === 1 ? 'border-indigo-500' : p.id === 2 ? 'border-emerald-500' : 'border-amber-500';
                            const titleColor = p.id === 1 ? 'text-indigo-700' : p.id === 2 ? 'text-emerald-700' : 'text-amber-700';
                            const effectiveCondensed = hasInflation ? isTableCondensed : false;
                            const otherBlockName = assumptions.otherLoans.length === 1 && assumptions.otherLoans[0].name ? assumptions.otherLoans[0].name + '返済' : 'その他の借入返済';

                            const lastData = simulationData[simulationData.length - 1];
                            const finalNet = lastData ? formatYen(lastData['p' + p.id + '_net'] * 10000 - (hasOtherLoans ? (otherLoanYearData[otherLoanYearData.length - 1]?.totalBalance || 0) : 0)) : "0";
                            const finalRealNet = lastData ? formatYen(lastData['p' + p.id + '_real_net'] - (hasOtherLoans ? (otherLoanYearData[otherLoanYearData.length - 1]?.totalBalance || 0) * (lastData['p' + p.id + '_deflator'] || 1) : 0)) : "0";

                            return (
                                <div key={p.id} className={`bg-white p-4 rounded-2xl shadow-sm border-2 ${borderColor} print-page-break`}>
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                        <h3 className={`font-bold ${titleColor} text-lg`}>{p.name} 詳細データ</h3>
                                    </div>
                                    {/* スクロールヒント（スマホのみ） */}
                                    <div className="md:hidden flex items-center justify-center gap-2 text-xs font-bold text-slate-400 mb-2 no-print">
                                        <ChevronLeft size={14} />
                                        横にスクロールできます
                                        <ChevronRight size={14} />
                                    </div>
                                    <div className="relative">
                                    <div className="overflow-x-auto w-full scrollbar-thin">
                                        <table className={`w-full min-w-[900px] md:min-w-0 text-center border-collapse print-detail-table table-auto text-sm`}>
                                            <thead>
                                                <tr>
                                                    <th rowSpan="2" className="py-2 px-[1px] font-bold whitespace-nowrap bg-slate-100 text-slate-600 border border-slate-200">年</th>
                                                    <th colSpan={effectiveCondensed ? 3 : 6} className="py-2 px-[1px] font-bold whitespace-nowrap bg-rose-100 text-rose-800 border border-rose-200">住宅ローン返済</th>
                                                    {hasOtherLoans && <th colSpan={2} className="py-2 px-[1px] font-bold whitespace-nowrap bg-orange-100 text-orange-800 border border-orange-200">{otherBlockName}</th>}
                                                    <th colSpan={effectiveCondensed ? 4 : 6} className="py-2 px-[1px] font-bold whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-200">資産運用</th>
                                                    {hasInflation
                                                        ? <th colSpan={6 + (showBMPrice ? 1 : 0)} className="py-2 px-[1px] font-bold whitespace-nowrap bg-purple-100 text-purple-800 border border-purple-200">実質換算</th>
                                                        : <th colSpan={1} className="py-2 px-[1px] font-bold whitespace-nowrap bg-purple-100 text-purple-800 border border-purple-200">換算</th>
                                                    }
                                                </tr>
                                                <tr className="bg-slate-50 text-slate-500">
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-rose-600">金利</th>
                                                    {!effectiveCondensed && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200">返済<br/>月額</th>}
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200">{effectiveCondensed ? <>返済<br/>年額</> : <>返済<br/>年額</>}</th>
                                                    {!effectiveCondensed && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-400">元本</th>}
                                                    {!effectiveCondensed && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-rose-500">利息</th>}
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-rose-700">借入<br/>残高</th>

                                                    {hasOtherLoans && <>
                                                        <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-orange-600 border-l border-orange-100">返済<br/>年額</th>
                                                        <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-orange-700">借入<br/>残高</th>
                                                    </>}

                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-emerald-600 border-l border-emerald-100">利回り</th>
                                                    {!effectiveCondensed && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200">積立<br/>月額</th>}
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200">{effectiveCondensed ? <>積立<br/>年額</> : <>積立<br/>年額</>}</th>
                                                    {!effectiveCondensed && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-500">元本<br/>合計</th>}
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-emerald-600">収益</th>
                                                    <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-emerald-700">資産残</th>

                                                    {hasInflation ? (
                                                        <>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-purple-600 border-l border-purple-100">{effectiveCondensed ? <>インフレ<br/>率</> : <>インフレ<br/>率</>}</th>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-500">{effectiveCondensed ? <>実質<br/>金利</> : <>実質<br/>金利</>}</th>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-500">{effectiveCondensed ? <>実質<br/>利回り</> : <>実質<br/>利回り</>}</th>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-500">実質<br/>借入</th>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-slate-500">実質<br/>資産</th>
                                                            <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-purple-700">
                                                                <div className="flex items-center justify-center gap-0.5">
                                                                    <div className="order-2">実質<br/>純資産</div>
                                                                    <div className="order-1"><RealNetTooltip year={common.years} nominal={finalNet} real={finalRealNet} align="right" direction="bottom" /></div>
                                                                </div>
                                                            </th>
                                                            {showBMPrice && <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-orange-500">ビッグ<br/>マック</th>}
                                                        </>
                                                    ) : (
                                                        <th className="py-2 px-[1px] font-bold whitespace-nowrap border-b border-slate-200 text-purple-700 border-l border-purple-100">純資産</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {simulationData.map((data) => {
                                                    const key = `p${p.id}`, year = data.year;
                                                    const isFive = year > 0 && year % 5 === 0;
                                                    const isYearZero = year === 0;

                                                    const baseDeflator = simulationData[0] ? simulationData[0][`${key}_deflator`] : 1.0;
                                                    const currentDeflator = data[`${key}_deflator`];
                                                    const bmPrice = isYearZero ? 480 : Math.ceil(480 * (baseDeflator / currentDeflator));

                                                    const hasAge = common.startAge !== '' && common.startAge !== null && !isNaN(common.startAge);
                                                    const age = hasAge ? parseInt(common.startAge) + year : null;

                                                    const initOtherBal = isYearZero && hasOtherLoans
                                                        ? assumptions.otherLoans.reduce((s, l) => s + (l.balance || 0) * 10000, 0)
                                                        : 0;

                                                    return (
                                                        <tr key={year} className={`hover:bg-slate-50 ${isFive ? 'border-b-2 border-slate-400' : ''} ${isYearZero ? 'bg-slate-50/60' : ''}`}>
                                                            <td className={`py-2 px-[1px] font-medium whitespace-nowrap`}>
                                                                {year}
                                                                {age && <span className="block text-xs text-slate-600 font-bold">{age}歳</span>}
                                                            </td>

                                                            <td className={`py-2 px-[1px] font-mono text-rose-600 whitespace-nowrap`}>{isYearZero ? '—' : `${data[`${key}_annual_rate`]?.toFixed(1)}%`}</td>
                                                            {!effectiveCondensed && <td className={`py-2 px-[1px] font-mono whitespace-nowrap`}>{isYearZero ? '—' : formatYen(data[`${key}_monthly_payment_display`])}</td>}
                                                            <td className={`py-2 px-[1px] font-mono font-bold whitespace-nowrap`}>{isYearZero ? '—' : formatYen(data[`${key}_annual_payment`])}</td>
                                                            {!effectiveCondensed && <td className={`py-2 px-[1px] font-mono text-slate-400 whitespace-nowrap`}>{isYearZero ? '—' : formatYen(data[`${key}_annual_principal`])}</td>}
                                                            {!effectiveCondensed && <td className={`py-2 px-[1px] font-mono text-rose-400 whitespace-nowrap`}>{isYearZero ? '—' : formatYen(data[`${key}_annual_interest`])}</td>}
                                                            <td className={`py-2 px-[1px] font-mono font-bold text-rose-700 whitespace-nowrap`}>{formatYen(data[`${key}_balance`])}</td>

                                                            {hasOtherLoans && (() => {
                                                                if (isYearZero) return <>
                                                                    <td className="py-2 px-[1px] font-mono border-l border-orange-100 whitespace-nowrap">—</td>
                                                                    <td className="py-2 px-[1px] font-mono font-bold text-orange-700 whitespace-nowrap">{formatYen(initOtherBal)}</td>
                                                                </>;
                                                                const od = otherLoanYearData[year - 1];
                                                                return <>
                                                                    <td className="py-2 px-[1px] font-mono border-l border-orange-100 whitespace-nowrap">{formatYen(od?.totalAnnualPayment || 0)}</td>
                                                                    <td className="py-2 px-[1px] font-mono font-bold text-orange-700 whitespace-nowrap">{formatYen(od?.totalBalance || 0)}</td>
                                                                </>;
                                                            })()}

                                                            <td className="py-2 px-[1px] font-mono border-l border-slate-100 text-emerald-600 whitespace-nowrap">{isYearZero ? '—' : `${data[`${key}_annual_inv_rate`]?.toFixed(1)}%`}</td>
                                                            {!effectiveCondensed && <td className="py-2 px-[1px] font-mono whitespace-nowrap">{isYearZero ? '—' : formatYen(data[`${key}_monthly_investment_display`])}</td>}
                                                            <td className="py-2 px-[1px] font-mono whitespace-nowrap">{isYearZero ? '—' : formatYen(data[`${key}_annual_investment`])}</td>
                                                            {!effectiveCondensed && <td className="py-2 px-[1px] font-mono text-slate-400 whitespace-nowrap">{isYearZero ? '—' : formatYen(data[`${key}_total_invested`])}</td>}
                                                            <td className="py-2 px-[1px] font-mono text-emerald-600 font-medium whitespace-nowrap">{isYearZero ? '—' : (data[`${key}_profit`] > 0 ? '+' : '') + formatYen(data[`${key}_profit`])}</td>
                                                            <td className="py-2 px-[1px] font-mono font-bold text-emerald-700 whitespace-nowrap">{formatYen(data[`${key}_asset_yen`])}</td>

                                                            {hasInflation ? (
                                                                <>
                                                                    <td className="py-2 px-[1px] font-mono border-l border-purple-100 text-purple-600 whitespace-nowrap">{isYearZero ? '—' : `${data[`${key}_annual_inflation`]?.toFixed(1)}%`}</td>
                                                                    <td className="py-2 px-[1px] font-mono text-slate-500 whitespace-nowrap">{isYearZero ? '—' : `${data[`${key}_real_loan_rate`]?.toFixed(1)}%`}</td>
                                                                    <td className="py-2 px-[1px] font-mono text-slate-500 whitespace-nowrap">{isYearZero ? '—' : `${data[`${key}_real_inv_rate`]?.toFixed(1)}%`}</td>
                                                                    <td className="py-2 px-[1px] font-mono text-slate-500 whitespace-nowrap">{formatYen(data[`${key}_real_balance`])}</td>
                                                                    <td className="py-2 px-[1px] font-mono text-slate-500 whitespace-nowrap">{formatYen(data[`${key}_real_asset`])}</td>
                                                                    <td className="py-2 px-[1px] font-mono font-bold text-purple-700 whitespace-nowrap">{formatYen(data[`${key}_real_net`] - (hasOtherLoans ? (isYearZero ? initOtherBal : (otherLoanYearData[year - 1]?.totalBalance || 0)) * (data[`${key}_deflator`] || 1) : 0))}</td>
                                                                    {showBMPrice && <td className="py-2 px-[1px] font-mono font-bold text-orange-500 whitespace-nowrap">{bmPrice.toLocaleString()}</td>}
                                                                </>
                                                            ) : (
                                                                <td className="py-2 px-[1px] font-mono font-bold text-purple-700 whitespace-nowrap border-l border-purple-100">{formatYen(data[`${key}_net`] * 10000 - (hasOtherLoans ? (isYearZero ? initOtherBal : (otherLoanYearData[year - 1]?.totalBalance || 0)) : 0))}</td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* 右端グラデーション（スマホのみ） */}
                                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none no-print" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <SaveLoadModal isOpen={isModalOpen} mode={modalMode} onClose={() => setIsModalOpen(false)} onSave={handleSave} onLoad={handleLoad} onDelete={handleDelete} savedList={savedSimulations} user={user} />
        </div>
    );
};


export default App;
