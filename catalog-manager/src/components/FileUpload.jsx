import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { storage } from '../config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const FileUpload = ({ label, fileUrl, fileName, onFileChange }) => {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) await processFile(file);
    };

    const processFile = async (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            alert('PDF または画像ファイル（JPG, PNG, GIF, WebP）のみアップロード可能です');
            return;
        }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'pdf';
            const filePath = `catalog-files/${Date.now()}.${ext}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const url = await getDownloadURL(storageRef);
            onFileChange(url, file.name);
        } catch (err) {
            console.error(err);
            const reader = new FileReader();
            reader.onload = (ev) => onFileChange(ev.target.result, file.name);
            reader.readAsDataURL(file);
        }
        setUploading(false);
    };

    const isPdf = fileName?.toLowerCase().endsWith('.pdf');

    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-500">{label}</span>
            <div
                className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${uploading ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                onDragOver={e => e.preventDefault()}
                onDrop={async e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) await processFile(f); }}
                onClick={() => !uploading && inputRef.current.click()}
            >
                <input type="file" ref={inputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileSelect} disabled={uploading} />
                {uploading ? (
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm"><span className="animate-spin">&#8987;</span> アップロード中...</div>
                ) : fileUrl ? (
                    <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold overflow-hidden">
                            <Icon name={isPdf ? 'file-text' : 'image'} size={18} className={isPdf ? 'text-red-500' : 'text-indigo-500'} />
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="truncate hover:underline text-sm text-indigo-600">{fileName || 'ファイル'}</a>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); if (confirm('削除しますか？')) onFileChange('', ''); }} className="p-2 text-slate-400 hover:text-red-500">
                            <Icon name="trash-2" size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm font-bold py-2">
                        <Icon name="upload-cloud" size={24} className="mx-auto mb-2 opacity-50" />
                        <p>クリックまたはD&D</p>
                        <p className="text-[10px] mt-1 opacity-70">PDF・画像</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
