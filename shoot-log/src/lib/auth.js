import { supabase } from '../config';

export const ALLOWED_DOMAIN = 'sunpro36.co.jp';

export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // 現在のホスト+/shoot-log/ にリダイレクト（dev: localhost / prod: sunpro-go.jp 両対応）
            redirectTo: window.location.origin + '/shoot-log/',
        },
    });
    if (error) throw error;
}

export async function signOutAuth() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export function isAllowedEmail(email) {
    if (!email) return false;
    return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
