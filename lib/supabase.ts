import { createClient, SupabaseClient } from '@supabase/supabase-js';


// 環境変数からSupabaseのURLとKeyを取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ビルド時やテスト時の環境変数チェック
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                   process.env.NODE_ENV === 'test' ||
                   process.env.CI === 'true';

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isBuildTime && process.env.NODE_ENV === 'production') {
    throw new Error('Supabaseの環境変数が設定されていません。');
  }
  
  if (!isBuildTime) {
    console.warn('⚠️ Supabase環境変数が設定されていません。ダミー値を使用します。');
  }
}

// Supabaseクライアントの初期化（ダミー値でもOK）
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-anon-key-for-build-time'
); 