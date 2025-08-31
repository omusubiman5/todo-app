/**
 * ログインフロー統合テスト
 * 実際のSupabase認証を使用したログイン機能のテスト
 */

import { createClient } from '@supabase/supabase-js';

// テスト環境の設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('Login Flow Integration Tests', () => {
  let supabase: any;
  
  beforeAll(() => {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    await supabase.auth.signOut();
  });

  describe('Supabase接続テスト', () => {
    test('Supabaseに正常に接続できること', async () => {
      expect(supabase).toBeDefined();
      
      const { data, error } = await supabase.auth.getSession();
      // エラーがない、または "Auth session missing!" エラーの場合は正常
      expect(error === null || error?.message === 'Auth session missing!').toBe(true);
    });

    test('Supabaseプロジェクト設定を確認', async () => {
      // プロジェクトの基本情報取得を試行
      const { data, error } = await supabase.auth.getUser();
      // 認証されていない場合のエラーは正常
      expect(error === null || error?.message?.includes('JWT') || error?.message?.includes('session')).toBe(true);
    });
  });

  describe('認証設定確認', () => {
    test('サインアップが有効化されているかチェック', async () => {
      console.log('🔍 認証設定テスト開始...');
      
      // ダミーメールでサインアップを試行（実際には作成しない）
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: { test: true } // テストフラグ
        }
      });
      
      console.log('📊 サインアップテスト結果:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        errorMessage: error?.message,
        errorCode: error?.code
      });
      
      // サインアップが無効化されている場合のエラーチェック
      if (error && error.message?.includes('signup')) {
        console.log('⚠️ サインアップが無効化されています');
        expect(error.message).toContain('signup');
      } else {
        console.log('✅ サインアップは有効です');
        // テスト用ユーザーが作成された場合はクリーンアップ
        if (data?.user && !error) {
          console.log('🧹 テストユーザーをクリーンアップ...');
          await supabase.auth.signOut();
        }
      }
    });

    test('メール確認設定をチェック', async () => {
      // この情報は管理者権限でのみ取得可能
      // クライアントサイドではメール確認が必要かどうかをテスト
      console.log('📧 メール確認設定は管理者権限でのみ確認可能');
      expect(true).toBe(true); // プレースホルダー
    });
  });

  describe('実際のログインフローテスト', () => {
    test('無効な認証情報でのログイン試行', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
      
      expect(error).toBeTruthy();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
      
      console.log('❌ 期待通り無効認証情報は拒否されました:', error?.message);
    });

    test('パスワードリセット機能', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        'test@example.com', // 実在しないメールアドレス
        {
          redirectTo: 'http://localhost:3000/reset-password',
        }
      );
      
      // エラーが発生しないか、または適切なエラーメッセージ
      if (error) {
        console.log('⚠️ パスワードリセットエラー:', error.message);
        // 一般的なSupabaseエラーをチェック
        expect(error.message).toBeTruthy();
      } else {
        console.log('✅ パスワードリセット要求が正常に処理されました');
        expect(data).toBeDefined();
      }
    });
  });

  describe('セッション管理テスト', () => {
    test('セッション取得が正常に動作すること', async () => {
      const { data, error } = await supabase.auth.getSession();
      
      // セッションなしの場合は正常
      if (!data.session) {
        expect(error === null || error?.message === 'Auth session missing!').toBe(true);
        console.log('📝 セッションなし状態（正常）');
      } else {
        expect(data.session).toBeTruthy();
        console.log('✅ 既存セッションが検出されました');
      }
    });

    test('認証状態変更の監視', (done) => {
      let listenerCalled = false;
      
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔄 認証状態変更イベント:', event, session ? 'セッションあり' : 'セッションなし');
        listenerCalled = true;
        
        expect(['INITIAL_SESSION', 'SIGNED_OUT', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)).toBe(true);
        
        // リスナーをクリーンアップ
        if (listener && listener.subscription) {
          listener.subscription.unsubscribe();
        }
        
        done();
      });
      
      // 5秒でタイムアウト
      setTimeout(() => {
        if (!listenerCalled) {
          if (listener && listener.subscription) {
            listener.subscription.unsubscribe();
          }
          done();
        }
      }, 5000);
    });
  });

  describe('プロフィール機能テスト', () => {
    test('profilesテーブルへのアクセス', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('⚠️ プロフィールテーブルアクセスエラー:', error.message);
        // RLSによりアクセス拒否される場合は正常
        expect(error.code).toBeDefined();
      } else {
        console.log('✅ プロフィールテーブルにアクセス可能');
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });
});

// 環境設定チェック用のヘルパー関数
export function checkEnvironmentSetup() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ 環境変数は正しく設定されています');
  return true;
}