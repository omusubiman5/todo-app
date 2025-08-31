const { createClient } = require('@supabase/supabase-js');

async function comprehensiveRLSTest() {
  console.log('🔍 包括的RLSポリシーテスト開始...');
  console.log('============================================================');
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const tables = ['tasks', 'profiles', 'teams', 'team_members', 'notifications'];
  const results = {};
  
  for (const table of tables) {
    console.log(`\n📊 ${table} テーブル RLS テスト...`);
    
    try {
      // 未認証での読み取りテスト
      const { data: readData, error: readError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (readError) {
        if (readError.code === 'PGRST301' || readError.message.includes('JWT')) {
          console.log(`✅ ${table}: 未認証読み取り正常にブロック`);
          results[table] = { read: '✅ ブロック', security: 'GOOD' };
        } else {
          console.log(`⚠️ ${table}: 予期しないエラー - ${readError.message}`);
          results[table] = { read: '⚠️ エラー', error: readError.message, security: 'WARNING' };
        }
      } else {
        console.log(`🚨 ${table}: 未認証読み取り成功 - データ数: ${readData?.length || 0}`);
        results[table] = { read: '🚨 アクセス可能', dataCount: readData?.length, security: 'CRITICAL' };
      }
      
      // 未認証での書き込みテスト
      const testData = table === 'tasks' ? 
        { title: 'RLS Test Task', user_id: 'test-user-id' } :
        table === 'profiles' ? 
        { id: 'test-user-id', email: 'test@rlstest.com' } :
        { name: 'RLS Test' };
        
      const { error: writeError } = await supabase
        .from(table)
        .insert(testData);
        
      if (writeError) {
        if (writeError.code === 'PGRST301' || writeError.message.includes('JWT')) {
          console.log(`✅ ${table}: 未認証書き込み正常にブロック`);
          results[table].write = '✅ ブロック';
        } else {
          console.log(`⚠️ ${table}: 書き込みエラー - ${writeError.message}`);
          results[table].write = '⚠️ エラー';
        }
      } else {
        console.log(`🚨 ${table}: 未認証書き込み成功`);
        results[table].write = '🚨 書き込み可能';
        results[table].security = 'CRITICAL';
      }
      
    } catch (e) {
      console.log(`❌ ${table}: 接続エラー - ${e.message}`);
      results[table] = { error: e.message, security: 'ERROR' };
    }
  }
  
  console.log('\n============================================================');
  console.log('📋 RLS セキュリティサマリー:');
  
  const critical = Object.entries(results).filter(([_, r]) => r.security === 'CRITICAL');
  const warnings = Object.entries(results).filter(([_, r]) => r.security === 'WARNING');
  const good = Object.entries(results).filter(([_, r]) => r.security === 'GOOD');
  const errors = Object.entries(results).filter(([_, r]) => r.security === 'ERROR');
  
  if (critical.length > 0) {
    console.log(`\n🚨 重大なセキュリティ問題 (${critical.length}件):`);
    critical.forEach(([table, result]) => {
      console.log(`  - ${table}: ${result.read || '不明'} / ${result.write || '不明'}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ 警告レベル (${warnings.length}件):`);
    warnings.forEach(([table, result]) => {
      console.log(`  - ${table}: ${result.error || '予期しないエラー'}`);
    });
  }
  
  if (good.length > 0) {
    console.log(`\n✅ 正常なRLS (${good.length}件):`);
    good.forEach(([table]) => {
      console.log(`  - ${table}: 適切にアクセス制御済み`);
    });
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ 接続エラー (${errors.length}件):`);
    errors.forEach(([table, result]) => {
      console.log(`  - ${table}: ${result.error}`);
    });
  }
  
  return results;
}

comprehensiveRLSTest()
  .then(results => {
    console.log('\n🎯 RLS テスト完了');
    
    // セキュリティ評価
    const totalTables = Object.keys(results).length;
    const criticalCount = Object.values(results).filter(r => r.security === 'CRITICAL').length;
    const goodCount = Object.values(results).filter(r => r.security === 'GOOD').length;
    
    console.log(`\n📊 総合評価:`);
    console.log(`- 総テーブル数: ${totalTables}`);
    console.log(`- セキュア: ${goodCount}/${totalTables}`);
    console.log(`- 重大問題: ${criticalCount}/${totalTables}`);
    
    if (criticalCount > 0) {
      console.log('\n🚨 直ちにRLSポリシーの見直しが必要です');
    } else {
      console.log('\n✅ RLSセキュリティは適切に設定されています');
    }
  })
  .catch(console.error);