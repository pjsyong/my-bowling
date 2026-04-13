import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // 💡 브라우저 메모리(sessionStorage)에만 인증 정보를 저장합니다.
    // 창을 완전히 닫으면 데이터가 날아가서 자동으로 로그아웃됩니다.
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});