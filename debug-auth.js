/**
 * 認証デバッグスクリプト
 * 現在の認証状態とセッションを詳しく調べる
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmxnsfjmusgmapxbcbpn.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteG5zZmptdXNnbWFweGJjYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTA2MTEsImV4cCI6MjA2ODQ4NjYxMX0.PoDsoL4V0_fpVdyLfQvMTEPoQyn4Lv8ZVsXCW3UWJ2Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuth() {
  console.log('🔍 認証状態デバッグ開始...\n');

  try {
    // 1. 現在のセッションを取得
    console.log('1️⃣ 現在のセッション状態:');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ セッション取得エラー:', sessionError.message);
    } else if (sessionData.session) {
      console.log('✅ アクティブなセッション発見');
      console.log('  - User ID:', sessionData.session.user.id);
      console.log('  - User Email:', sessionData.session.user.email);
      console.log('  - Access Token (last 10 chars):', sessionData.session.access_token.slice(-10));
      console.log('  - Expires At:', new Date(sessionData.session.expires_at * 1000).toLocaleString());
      console.log('  - Time Until Expiry:', Math.floor((sessionData.session.expires_at * 1000 - Date.now()) / 60000), 'minutes');
    } else {
      console.log('❌ セッションが見つかりません');
    }

    // 2. ユーザー情報を取得
    console.log('\n2️⃣ ユーザー情報:');
    const { data: user, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ ユーザー取得エラー:', userError.message);
    } else if (user.user) {
      console.log('✅ ユーザー情報確認完了');
      console.log('  - ID:', user.user.id);
      console.log('  - Email:', user.user.email);
      console.log('  - Email Confirmed:', user.user.email_confirmed_at ? '✅ 確認済み' : '❌ 未確認');
      console.log('  - Last Sign In:', user.user.last_sign_in_at);
      console.log('  - Created:', user.user.created_at);
    } else {
      console.log('❌ ユーザー情報が取得できません');
    }

    // 3. プロフィール情報を取得（データベーステーブル）
    console.log('\n3️⃣ プロフィールテーブル確認:');
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profileError) {
        console.error('❌ プロフィール取得エラー:', profileError.message);
      } else if (profiles && profiles.length > 0) {
        console.log('✅ プロフィール情報あり');
        console.log('  - Profile ID:', profiles[0].id);
        console.log('  - Display Name:', profiles[0].display_name);
        console.log('  - Updated At:', profiles[0].updated_at);
      } else {
        console.log('❌ プロフィール情報なし');
      }
    } catch (profileErr) {
      console.error('❌ プロフィールテーブルアクセスエラー:', profileErr.message);
    }

  } catch (error) {
    console.error('❌ デバッグ処理中にエラー:', error.message);
  }

  console.log('\n🔍 認証状態デバッグ完了');
}

debugAuth();