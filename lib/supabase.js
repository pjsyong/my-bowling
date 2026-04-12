// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 이미 생성된 인스턴스가 있으면 그것을 쓰고, 없으면 새로 만듭니다.
export const supabase = createClient(supabaseUrl, supabaseKey);