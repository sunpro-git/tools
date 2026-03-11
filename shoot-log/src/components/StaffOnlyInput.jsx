import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

const StaffOnlyInput = ({ label, tags, onTagsChange, suggestions }) => {
    const [input, setInput] = useState(''); const [isFocused, setIsFocused] = useState(false); const inputRef = useRef(null); const containerRef = useRef(null);
    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (input.trim() && !tags.includes(input.trim())) { onTagsChange([...tags, input.trim()]); setInput(''); } } else if (e.key === 'Backspace' && !input && tags.length > 0) { onTagsChange(tags.slice(0, -1)); } };
    const addTag = (tag) => { if (!tags.includes(tag)) onTagsChange([...tags, tag]); inputRef.current.focus(); };
    const removeTag = (tag) => onTagsChange(tags.filter(t => t !== tag));
    useEffect(() => { const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsFocused(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [containerRef]);
    return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200" ref={containerRef}>
            <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                <div className="bg-white border border-slate-300 rounded-lg p-2 min-h-[46px] flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-all cursor-text" onClick={() => { inputRef.current.focus(); setIsFocused(true); }}>
                    {tags.map(tag => (<span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200">{tag}<button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-red-500 transition-colors"><Icon name="x" size={14} /></button></span>))}
                    <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => setIsFocused(true)} placeholder={tags.length === 0 ? "スタッフ名..." : ""} className="flex-1 min-w-[80px] outline-none text-sm bg-transparent placeholder:text-slate-300 h-8" />
                </div>
                {isFocused && (<div className="flex flex-wrap gap-2 animate-enter"><span className="text-sm font-bold text-slate-400 py-1">QUICK ADD:</span>{suggestions.map(s => (<button type="button" key={s} onClick={() => addTag(s)} disabled={tags.includes(s)} className={`px-3 py-1.5 rounded text-sm font-bold border transition-all ${tags.includes(s) ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent'}`}>{s}</button>))}</div>)}
            </div>
        </div>
    );
};

export default StaffOnlyInput;
