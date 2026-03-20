import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vkovflhltggyrgimeabp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const GENRES = ['新築', 'リフォーム', '不動産', 'ソリューション', '共通'];

export const GENRE_COLORS = {
  '新築':         { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  'リフォーム':    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  '不動産':       { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  'ソリューション': { bg: 'bg-red-100',  text: 'text-red-700',  border: 'border-red-300',  dot: 'bg-red-500' },
  '共通':         { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300',    dot: 'bg-gray-500' },
};

export const GROUPS = ['パンフレット', 'チラシ', 'ファイル', '封筒', '紙類', 'カタログ', 'その他'];
