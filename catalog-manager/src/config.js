import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoELophNYa8mOQL8ZjWzqaOM4DRuCWD38",
  authDomain: "zaiko-2d49e.firebaseapp.com",
  projectId: "zaiko-2d49e",
  storageBucket: "zaiko-2d49e.firebasestorage.app",
  messagingSenderId: "730461857037",
  appId: "1:730461857037:web:7e687555213ac4608e7c44",
  measurementId: "G-9K663BT1NV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const GENRES = ['新築', 'リフォーム', '不動産', 'ソリューション', 'リゾート', '工事部', '共通', 'ノベルティ'];

export const GENRE_COLORS = {
  '新築':         { bg: 'bg-blue-200',     text: 'text-blue-800',     border: 'border-blue-400',     dot: 'bg-blue-600' },
  'リフォーム':    { bg: 'bg-emerald-200',  text: 'text-emerald-800',  border: 'border-emerald-400',  dot: 'bg-emerald-600' },
  '不動産':       { bg: 'bg-yellow-200',   text: 'text-yellow-800',   border: 'border-yellow-400',   dot: 'bg-yellow-500' },
  'ソリューション': { bg: 'bg-red-200',    text: 'text-red-800',      border: 'border-red-400',      dot: 'bg-red-600' },
  'リゾート':     { bg: 'bg-sky-200',      text: 'text-sky-800',      border: 'border-sky-400',      dot: 'bg-sky-500' },
  '工事部':       { bg: 'bg-orange-200',   text: 'text-orange-800',   border: 'border-orange-400',   dot: 'bg-orange-500' },
  '共通':         { bg: 'bg-slate-200',    text: 'text-slate-800',    border: 'border-slate-400',    dot: 'bg-slate-500' },
  'ノベルティ':    { bg: 'bg-fuchsia-200',  text: 'text-fuchsia-800',  border: 'border-fuchsia-400',  dot: 'bg-fuchsia-500' },
};

export const GROUPS = ['パンフレット', 'チラシ', 'ファイル', '封筒', '紙類', 'カタログ', 'その他'];
