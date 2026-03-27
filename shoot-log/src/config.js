import { createClient } from '@supabase/supabase-js';

// --- Supabase Config ---
const SUPABASE_URL = 'https://vkovflhltggyrgimeabp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GAS URL (カレンダー同期用)
export const CALENDAR_GAS_API_URL = "https://script.google.com/macros/s/AKfycbycBJvXHNHpYfwJz04MbQS3D2Cp64mwAUM2bqUgbMuvWa6ksj0XhNqw9plixUhSaoUf/exec";

// 定数
export const CATEGORIES = ['新築', 'リフォーム'];
export const BRANCHES = ['本社', '長野', '上田', '伊那', '飯田'];
export const BRANCH_LABELS = { '本社': '本社/松本', '長野': '長野', '上田': '上田', '伊那': '伊那', '飯田': '飯田' };
export const STAFF_ROLES = ['営業', 'インテリアコーディネーター', '施工管理', '広報', 'YouTube担当', 'InstaLive担当', '撮影担当', '撮影依頼者'];
export const STAFF_DEPARTMENTS = ['新築', 'リフォーム', '広報', '工事', '外部パートナー'];
export const EQUIPMENT_TYPES = ['設備', '車輛', 'カレンダー'];
export const SHOOTING_TYPES = ['スチール', '外観スチール', 'YouTube', 'インスタ通常投稿用', 'インスタ宣伝用', 'インスタライブ', 'その他'];
export const ANDPAD_LABELS = { systemId: 'システムID', salesRep: '営業担当', icRep: 'IC担当', constructionRep: '工事担当' };
