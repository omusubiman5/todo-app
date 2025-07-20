import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 型定義: 環境変数の型
interface SupabaseEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

// 環境変数からSupabaseのURLとKeyを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabaseの環境変数が設定されていません。');
}

// Supabaseクライアントの初期化
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey); 