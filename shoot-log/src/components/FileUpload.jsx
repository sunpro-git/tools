import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { supabase } from '../config';

const FileUpload = ({ label, fileUrl, fileName, onFileChange }) => {
    const [uploading, setUploading] = useState(false); const inputRef = useRef(null);
    const handleFileSelect = async (e) => { const file = e.target.files[0]; if (file) await processFile(file); };
    const processFile = async (file) => {
        if (file.type !== 'application/pdf') { alert('PDFファイルのみアップロード可能です'); return; }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'pdf';
            const filePath = `${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('documents').upload(filePath, file, { contentType: 'application/pdf', upsert: false });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
            onFileChange(urlData.publicUrl, file.name);
        } catch (err) { console.error(err); alert('アップロード中にエラーが発生しました: ' + err.message); }
        setUploading(false);
    };
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-slate-50 ${uploading ? 'border-accent bg-accent/5' : 'border-gray-300 hover:border-accent hover:bg-white'}`} onDragOver={e=>e.preventDefault()} onDrop={async e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)await processFile(f);}} onClick={() => !uploading && inputRef.current.click()}>
                <input type="file" ref={inputRef} className="hidden" accept="application/pdf" onChange={handleFileSelect} disabled={uploading} />
                {uploading ? (<div className="flex items-center gap-2 text-accent font-bold"><span className="animate-spin">&#8987;</span> アップロード中...</div>) : fileUrl ? (<div className="w-full flex items-center justify-between"><div className="flex items-center gap-2 text-primary font-bold overflow-hidden"><Icon name="file-text" size={20} className="text-red-500 flex-shrink-0"/><a href={fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} className="truncate hover:underline text-sm">{fileName || 'PDFファイル'}</a></div><button type="button" onClick={(e)=>{e.stopPropagation();if(confirm('削除しますか？'))onFileChange('','');}} className="p-2 text-gray-400 hover:text-red-500"><Icon name="trash-2" size={16}/></button></div>) : (<div className="text-gray-400 text-sm font-bold py-2"><Icon name="upload-cloud" size={24} className="mx-auto mb-2 opacity-50"/><p>クリックまたはD&D</p><p className="text-[10px] mt-1 opacity-70">PDFのみ</p></div>)}
            </div>
        </div>
    );
};

export default FileUpload;
