import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { handleShowPicker } from '../helpers';

const TagInput = ({ label, dateValue, onDateChange, startTimeValue, onStartTimeChange, endTimeValue, onEndTimeChange, isRequested, onRequestedChange, tags, onTagsChange, suggestions, timeOptions, noteValue, onNoteChange }) => {
    const [input, setInput] = useState(''); const [isFocused, setIsFocused] = useState(false); const inputRef = useRef(null); const containerRef = useRef(null); const hasDate = dateValue && dateValue !== '';
    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (input.trim() && !tags.includes(input.trim())) { onTagsChange([...tags, input.trim()]); setInput(''); } } else if (e.key === 'Backspace' && !input && tags.length > 0) { onTagsChange(tags.slice(0, -1)); } };
    const addTag = (tag) => { if (!tags.includes(tag)) onTagsChange([...tags, tag]); inputRef.current.focus(); };
    const removeTag = (tag) => onTagsChange(tags.filter(t => t !== tag));
    useEffect(() => { const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsFocused(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [containerRef]);
    return (
        <div className={`rounded-xl p-4 border transition-colors ${hasDate ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex flex-col gap-3">
                    <span className={`text-sm font-bold uppercase tracking-wider ${hasDate ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
                    <div className="relative"><input type="date" value={dateValue} onChange={onDateChange} onClick={handleShowPicker} className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-lg text-sm font-medium outline-none transition-all ${hasDate ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500/30' : 'border-slate-300 focus:ring-2 focus:ring-accent/50 focus:border-accent'}`} /><div className={`absolute left-3 top-2.5 pointer-events-none ${hasDate ? 'text-indigo-400' : 'text-slate-400'}`}><Icon name="calendar" size={16}/></div></div>
                    <div className="flex items-center gap-2"><select value={startTimeValue} onChange={onStartTimeChange} className="flex-1 py-2.5 px-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:border-accent outline-none"><option value="">開始</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select><span className="text-slate-300">-</span><select value={endTimeValue} onChange={onEndTimeChange} className="flex-1 py-2.5 px-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:border-accent outline-none"><option value="">終了</option>{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${isRequested ? 'bg-accent/10 border-accent/30' : 'bg-transparent border-transparent hover:bg-slate-200/50'}`}><input type="checkbox" checked={isRequested} onChange={e => onRequestedChange(e.target.checked)} className="w-5 h-5 rounded text-accent focus:ring-accent" /><span className={`text-sm font-bold ${isRequested ? 'text-accent' : 'text-slate-500'}`}>パートナー依頼済</span></label>
                </div>
                <div className="md:w-2/3 flex flex-col gap-3" ref={containerRef}>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">担当スタッフ</span>
                    <div className="bg-white border border-slate-300 rounded-lg p-2 min-h-[46px] flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-all cursor-text" onClick={() => { inputRef.current.focus(); setIsFocused(true); }}>
                        {tags.map(tag => (<span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200">{tag}<button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-red-500 transition-colors"><Icon name="x" size={14} /></button></span>))}
                        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => setIsFocused(true)} placeholder={tags.length === 0 ? "スタッフ名..." : ""} className="flex-1 min-w-[80px] outline-none text-sm bg-transparent placeholder:text-slate-300 h-8" />
                    </div>
                    {isFocused && (<div className="flex flex-wrap gap-2 animate-enter"><span className="text-sm font-bold text-slate-400 py-1">QUICK ADD:</span>{suggestions.map(s => (<button type="button" key={s} onClick={() => addTag(s)} disabled={tags.includes(s)} className={`px-3 py-1.5 rounded text-sm font-bold border transition-all ${tags.includes(s) ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent'}`}>{s}</button>))}</div>)}
                    <div className="mt-1"><label className="text-xs font-bold text-gray-400 block mb-1">備考</label><textarea value={noteValue} onChange={onNoteChange} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-accent outline-none" rows="2" placeholder="備考・メモ..."></textarea></div>
                </div>
            </div>
        </div>
    );
};

export default TagInput;
