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
  supabaseUrl || 'https://localhost:54321',
  // eslint-disable-next-line no-secrets/no-secrets
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
); 