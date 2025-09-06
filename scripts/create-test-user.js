// 🧪 テストユーザー作成スクリプト
// E2Eテスト用のテストユーザーを作成します

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabaseクライアント設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// テストユーザー情報
const TEST_USER = {
  email: 'e2e.test.user2@gmail.com',
  password: 'TestPassword123!',
  profile: {
    display_name: 'E2Eテストユーザー2',
    bio: 'E2Eテスト用のテストアカウントです（メール確認無効化後）'
  }
};

async function createTestUser() {
  console.log('🧪 テストユーザー作成を開始...');
  console.log(`📧 Email: ${TEST_USER.email}`);
  
  try {
    // 1. 既存のユーザーを確認
    console.log('1️⃣ 既存のユーザーを確認中...');
    
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.log('⚠️ ユーザー検索でエラー（権限不足の可能性）:', searchError.message);
      console.log('➡️ ユーザー作成を続行します...');
    } else {
      const existingUser = existingUsers?.users?.find(user => user.email === TEST_USER.email);
      if (existingUser) {
        console.log('✅ テストユーザーは既に存在します');
        console.log(`👤 User ID: ${existingUser.id}`);
        console.log(`📧 Email: ${existingUser.email}`);
        console.log(`✅ 確認済み: ${existingUser.email_confirmed_at ? 'はい' : 'いいえ'}`);
        return;
      }
    }
    
    // 2. 新しいユーザーを作成
    console.log('2️⃣ 新しいテストユーザーを作成中...');
    
    const { data, error } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          display_name: TEST_USER.profile.display_name,
          bio: TEST_USER.profile.bio
        }
      }
    });
    
    if (error) {
      console.error('❌ ユーザー作成エラー:', error.message);
      
      if (error.message.includes('already registered')) {
        console.log('✅ テストユーザーは既に登録済みです');
        return;
      }
      
      throw error;
    }
    
    if (data.user) {
      console.log('✅ テストユーザー作成成功！');
      console.log(`👤 User ID: ${data.user.id}`);
      console.log(`📧 Email: ${data.user.email}`);
      console.log(`✅ 確認メール送信: ${data.user.email_confirmed_at ? 'すでに確認済み' : '確認が必要'}`);
      
      // 3. プロフィール情報を追加（profiles テーブルが存在する場合）
      if (data.user.id) {
        console.log('3️⃣ プロフィール情報を設定中...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: TEST_USER.email,
            display_name: TEST_USER.profile.display_name,
            bio: TEST_USER.profile.bio,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.log('⚠️ プロフィール設定エラー:', profileError.message);
          console.log('📝 プロフィールテーブルが存在しない可能性があります');
        } else {
          console.log('✅ プロフィール情報設定完了');
        }
      }
      
      console.log('\n🎉 テストユーザー作成完了！');
      console.log('\n📋 E2Eテストで使用する情報:');
      console.log(`Email: ${TEST_USER.email}`);
      console.log(`Password: ${TEST_USER.password}`);
      
    } else {
      console.log('⚠️ ユーザーデータが返されませんでした');
    }
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

async function testLogin() {
  console.log('\n🔐 テストユーザーでのログインテスト...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    
    if (error) {
      console.error('❌ ログインテストエラー:', error.message);
      return false;
    }
    
    if (data.user) {
      console.log('✅ ログインテスト成功！');
      console.log(`👤 User ID: ${data.user.id}`);
      console.log(`📧 Email: ${data.user.email}`);
      
      // ログアウト
      await supabase.auth.signOut();
      console.log('🚪 ログアウト完了');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ ログインテスト中のエラー:', error);
    return false;
  }
}

// メイン実行
async function main() {
  console.log('🚀 テストユーザー作成スクリプト開始\n');
  
  await createTestUser();
  
  console.log('\n' + '='.repeat(50));
  
  const loginSuccess = await testLogin();
  
  if (loginSuccess) {
    console.log('\n✅ セットアップ完了！E2Eテストを実行できます。');
    console.log('\n📝 テスト実行コマンド:');
    console.log('npx playwright test tests/authenticated-e2e-test.spec.js --headed');
  } else {
    console.log('\n⚠️ ログインテストに失敗しました。設定を確認してください。');
  }
}

main().catch(console.error);

/*
🧪 【テストユーザー作成スクリプト】

✅ 機能:
- E2Eテスト用のテストユーザー作成
- 既存ユーザーのチェック
- プロフィール情報の設定
- ログイン動作テスト

✅ 使用方法:
node scripts/create-test-user.js

✅ 注意事項:
- .env.local に Supabase 設定が必要
- データベースにprofilesテーブルがあることを想定
- テストユーザーの情報はE2Eテストファイルと一致させること
*/