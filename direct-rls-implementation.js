const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function directRLSImplementation() {
  console.log('🚀 直接的なRLS実装開始...');
  console.log('============================================================');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 現在のテーブル状態確認
  console.log('📊 データベーステーブル状態確認...');
  const tables = ['tasks', 'profiles', 'teams', 'team_members', 'notifications'];
  const tableStatus = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          tableStatus[table] = 'NOT_EXISTS';
          console.log(`❌ ${table}: テーブルが存在しません`);
        } else if (error.code === 'PGRST301') {
          tableStatus[table] = 'RLS_ENABLED';
          console.log(`✅ ${table}: RLS保護済み`);
        } else {
          tableStatus[table] = 'ERROR';
          console.log(`⚠️ ${table}: ${error.message}`);
        }
      } else {
        tableStatus[table] = 'NO_RLS';
        console.log(`🚨 ${table}: RLS未設定 - データ数: ${data?.length || 0}`);
      }
    } catch (e) {
      tableStatus[table] = 'ERROR';
      console.log(`❌ ${table}: 接続エラー`);
    }
  }

  // 2. 必要なテーブル作成
  console.log('\n🏗️ 不足テーブルの作成...');
  await createMissingTables(supabase, tableStatus);

  // 3. RLS設定SQLの準備
  console.log('\n🔧 RLS設定SQLの準備...');
  const rlsSQL = generateRLSSQL(tableStatus);
  
  // SQLをファイルに保存
  fs.writeFileSync('generated-rls.sql', rlsSQL);
  console.log('📄 generated-rls.sql に保存しました');

  // 4. 設定手順の表示
  displayImplementationSteps();

  return tableStatus;
}

async function createMissingTables(supabase, tableStatus) {
  // tasksテーブルが存在しない場合の作成
  if (tableStatus.tasks === 'NOT_EXISTS') {
    console.log('🔨 tasksテーブル作成...');
    const createTasksSQL = `
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  user_id UUID NOT NULL,
  team_id UUID,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `;
    console.log('⚠️ 以下のSQLをSupabaseで実行してください:');
    console.log(createTasksSQL);
  }

  // profilesテーブルが存在しない場合の作成
  if (tableStatus.profiles === 'NOT_EXISTS') {
    console.log('🔨 profilesテーブル作成...');
    const createProfilesSQL = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'ja',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `;
    console.log('⚠️ 以下のSQLをSupabaseで実行してください:');
    console.log(createProfilesSQL);
  }
}

function generateRLSSQL(tableStatus) {
  return `-- RLS包括設定スクリプト (自動生成)
-- 生成日時: ${new Date().toISOString()}

-- =============================================================================
-- 1. 全テーブルでRLS有効化
-- =============================================================================

${Object.keys(tableStatus).map(table => `
-- ${table}テーブルのRLS有効化
ALTER TABLE IF EXISTS public.${table} ENABLE ROW LEVEL SECURITY;
`).join('')}

-- =============================================================================
-- 2. tasksテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- 個人タスクのポリシー
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id AND team_id IS NULL
  );

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id AND team_id IS NULL
  );

-- =============================================================================
-- 3. profilesテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- プロフィールポリシー
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- 4. notificationsテーブルのRLSポリシー
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- 通知ポリシー
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 5. teamsテーブルのRLSポリシー (存在する場合)
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team" ON public.teams;
DROP POLICY IF EXISTS "Team owners and admins can update team" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON public.teams;

-- チームポリシー
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team members can view team" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. team_membersテーブルのRLSポリシー (存在する場合)
-- =============================================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON public.team_members;

-- チームメンバーポリシー
CREATE POLICY "Team members can view members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

-- このスクリプト実行後、verify-rls-fix.js で検証してください
`;
}

function displayImplementationSteps() {
  console.log('\n🎯 RLS実装手順:');
  console.log('============================================================');
  console.log('1. https://supabase.com/dashboard にアクセス');
  console.log('2. プロジェクト "zmxnsfjmusgmapxbcbpn" を選択');
  console.log('3. 左メニューから "SQL Editor" をクリック');
  console.log('4. "New query" ボタンをクリック');
  console.log('5. generated-rls.sql の内容をコピー&ペースト');
  console.log('6. "Run" ボタンをクリックして実行');
  console.log('7. node verify-rls-fix.js で検証');
  console.log('============================================================');
  
  console.log('\n📋 実行チェックリスト:');
  console.log('□ Supabaseダッシュボードにアクセス');
  console.log('□ SQL Editorを開く');
  console.log('□ generated-rls.sql をコピー&ペースト');
  console.log('□ SQLを実行');
  console.log('□ verify-rls-fix.js で検証');
  console.log('□ security-test.js で最終確認');
}

// 実行
async function main() {
  try {
    const status = await directRLSImplementation();
    
    console.log('\n📊 テーブル状態サマリー:');
    Object.entries(status).forEach(([table, state]) => {
      const emoji = state === 'RLS_ENABLED' ? '✅' : 
                   state === 'NO_RLS' ? '🚨' : 
                   state === 'NOT_EXISTS' ? '❌' : '⚠️';
      console.log(`${emoji} ${table}: ${state}`);
    });
    
    const needsRLS = Object.values(status).filter(s => s === 'NO_RLS').length;
    const missing = Object.values(status).filter(s => s === 'NOT_EXISTS').length;
    
    if (needsRLS > 0 || missing > 0) {
      console.log('\n🚨 対応が必要です:');
      if (missing > 0) console.log(`- ${missing}個のテーブルが不足`);
      if (needsRLS > 0) console.log(`- ${needsRLS}個のテーブルでRLS未設定`);
      console.log('\n📄 generated-rls.sql をSupabaseダッシュボードで実行してください');
    } else {
      console.log('\n✅ 全テーブルでRLS設定済み');
    }
    
  } catch (error) {
    console.error('💥 実装エラー:', error.message);
  }
}

main();