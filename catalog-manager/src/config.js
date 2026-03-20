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

export const GENRES = ['新築', 'リフォーム', '不動産', 'ソリューション', '共通'];

export const GENRE_COLORS = {
  '新築':         { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  'リフォーム':    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  '不動産':       { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  'ソリューション': { bg: 'bg-red-100',  text: 'text-red-700',  border: 'border-red-300',  dot: 'bg-red-500' },
  '共通':         { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300',    dot: 'bg-gray-500' },
};

export const GROUPS = ['パンフレット', 'チラシ', 'ファイル', '封筒', '紙類', 'カタログ', 'その他'];
