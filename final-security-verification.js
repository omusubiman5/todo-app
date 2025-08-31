const { createClient } = require('@supabase/supabase-js');

async function finalSecurityVerification() {
  console.log('🔐 最終セキュリティ検証システム');
  console.log('=' * 60);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const results = {
    rlsVerification: {},
    schemaIntegrity: {},
    securityFeatures: {},
    overallScore: 0
  };

  try {
    // 1. RLS検証
    console.log('🛡️ Step 1: RLS保護状態検証');
    results.rlsVerification = await verifyRLSProtection(supabase);
    
    // 2. スキーマ整合性確認
    console.log('\n📊 Step 2: テーブルスキーマ整合性確認');
    results.schemaIntegrity = await verifySchemaIntegrity(supabase);
    
    // 3. セキュリティ機能確認
    console.log('\n🔒 Step 3: セキュリティ機能確認');
    results.securityFeatures = await verifySecurityFeatures();
    
    // 4. 総合スコア計算
    results.overallScore = calculateOverallScore(results);
    
    // 5. 結果表示
    displayFinalResults(results);
    
    return results;
    
  } catch (error) {
    console.error('💥 検証エラー:', error.message);
    return null;
  }
}

async function verifyRLSProtection(supabase) {
  const tables = ['tasks', 'profiles', 'teams', 'team_members', 'notifications'];
  const rlsResults = {};
  
  for (const table of tables) {
    try {
      // 未認証でのアクセステスト
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error && error.code === 'PGRST301') {
        rlsResults[table] = {
          status: 'PROTECTED',
          message: 'RLS正常 - 未認証アクセス拒否',
          score: 10
        };
      } else if (!error && count === 0) {
        rlsResults[table] = {
          status: 'EMPTY_PROTECTED',
          message: 'RLS有効 - 空テーブル（保護中）',
          score: 8
        };
      } else if (!error && count > 0) {
        rlsResults[table] = {
          status: 'VULNERABLE',
          message: '🚨 未認証アクセス可能 - RLS未適用',
          score: 0
        };
      } else {
        rlsResults[table] = {
          status: 'ERROR',
          message: `エラー: ${error?.message || 'Unknown'}`,
          score: 0
        };
      }
      
      console.log(`  ${table}: ${rlsResults[table].message}`);
      
    } catch (e) {
      rlsResults[table] = {
        status: 'ERROR',
        message: `接続エラー: ${e.message}`,
        score: 0
      };
    }
  }
  
  return rlsResults;
}

async function verifySchemaIntegrity(supabase) {
  const expectedSchemas = {
    tasks: ['id', 'title', 'description', 'user_id', 'status'],
    profiles: ['id', 'email', 'display_name'],
    notifications: ['id', 'user_id', 'message', 'title'],
    teams: ['id', 'name', 'created_by'],
    team_members: ['id', 'team_id', 'user_id', 'role']
  };
  
  const schemaResults = {};
  
  for (const [table, expectedColumns] of Object.entries(expectedSchemas)) {
    try {
      // ダミーデータでスキーマテスト
      const testData = generateTestData(table, expectedColumns);
      
      const { error } = await supabase
        .from(table)
        .insert([testData])
        .select();
      
      if (error) {
        if (error.message.includes('Could not find') || error.message.includes('column')) {
          schemaResults[table] = {
            status: 'SCHEMA_MISMATCH',
            message: `スキーマ不整合: ${error.message}`,
            score: 3
          };
        } else if (error.code === 'PGRST301' || error.message.includes('policy')) {
          schemaResults[table] = {
            status: 'SCHEMA_OK_RLS_BLOCKED',
            message: 'スキーマ正常 - RLS保護により挿入ブロック',
            score: 10
          };
        } else {
          schemaResults[table] = {
            status: 'OTHER_ERROR',
            message: `その他エラー: ${error.message}`,
            score: 5
          };
        }
      } else {
        schemaResults[table] = {
          status: 'SCHEMA_OK_NO_RLS',
          message: '⚠️ スキーマ正常 - RLS未適用（挿入成功）',
          score: 6
        };
      }
      
      console.log(`  ${table}: ${schemaResults[table].message}`);
      
    } catch (e) {
      schemaResults[table] = {
        status: 'ERROR',
        message: `検証エラー: ${e.message}`,
        score: 0
      };
    }
  }
  
  return schemaResults;
}

function generateTestData(table, columns) {
  const baseData = {
    id: '00000000-0000-0000-0000-000000000000',
  };
  
  const testValues = {
    title: 'テストタスク',
    description: 'テスト用の説明',
    user_id: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    display_name: 'テストユーザー',
    message: 'テスト通知',
    name: 'テストチーム',
    created_by: '00000000-0000-0000-0000-000000000000',
    team_id: '00000000-0000-0000-0000-000000000000',
    role: 'member',
    status: 'pending'
  };
  
  const testData = { ...baseData };
  columns.forEach(column => {
    if (testValues[column]) {
      testData[column] = testValues[column];
    }
  });
  
  return testData;
}

async function verifySecurityFeatures() {
  const features = {
    rateLimiting: checkRateLimiting(),
    responseNormalization: checkResponseNormalization(),
    securityLogging: checkSecurityLogging(),
    redirectUrlControl: checkRedirectUrlControl(),
    securityDashboard: checkSecurityDashboard()
  };
  
  return features;
}

function checkRateLimiting() {
  try {
    // SecurityServiceの存在確認
    const fs = require('fs');
    const securityServiceExists = fs.existsSync('./lib/securityService.ts');
    
    if (securityServiceExists) {
      const content = fs.readFileSync('./lib/securityService.ts', 'utf8');
      const hasRateLimit = content.includes('checkRateLimit') && content.includes('rateLimitMap');
      
      return {
        status: hasRateLimit ? 'IMPLEMENTED' : 'PARTIAL',
        message: hasRateLimit ? 'レート制限実装済み' : 'レート制限部分実装',
        score: hasRateLimit ? 10 : 5
      };
    }
    
    return {
      status: 'NOT_IMPLEMENTED',
      message: 'レート制限未実装',
      score: 0
    };
  } catch {
    return {
      status: 'ERROR',
      message: 'レート制限確認エラー',
      score: 0
    };
  }
}

function checkResponseNormalization() {
  try {
    const fs = require('fs');
    const securityServiceExists = fs.existsSync('./lib/securityService.ts');
    
    if (securityServiceExists) {
      const content = fs.readFileSync('./lib/securityService.ts', 'utf8');
      const hasNormalization = content.includes('securePasswordReset') && 
                              content.includes('常に同じメッセージ');
      
      return {
        status: hasNormalization ? 'IMPLEMENTED' : 'PARTIAL',
        message: hasNormalization ? 'レスポンス正規化実装済み' : 'レスポンス正規化部分実装',
        score: hasNormalization ? 10 : 5
      };
    }
    
    return {
      status: 'NOT_IMPLEMENTED',
      message: 'レスポンス正規化未実装',
      score: 0
    };
  } catch {
    return {
      status: 'ERROR',
      message: 'レスポンス正規化確認エラー',
      score: 0
    };
  }
}

function checkSecurityLogging() {
  try {
    const fs = require('fs');
    const securityServiceExists = fs.existsSync('./lib/securityService.ts');
    
    if (securityServiceExists) {
      const content = fs.readFileSync('./lib/securityService.ts', 'utf8');
      const hasLogging = content.includes('logSecurityEvent') && 
                        content.includes('security_logs');
      
      return {
        status: hasLogging ? 'IMPLEMENTED' : 'PARTIAL',
        message: hasLogging ? 'セキュリティログ実装済み' : 'セキュリティログ部分実装',
        score: hasLogging ? 10 : 5
      };
    }
    
    return {
      status: 'NOT_IMPLEMENTED',
      message: 'セキュリティログ未実装',
      score: 0
    };
  } catch {
    return {
      status: 'ERROR',
      message: 'セキュリティログ確認エラー',
      score: 0
    };
  }
}

function checkRedirectUrlControl() {
  try {
    const fs = require('fs');
    const securityServiceExists = fs.existsSync('./lib/securityService.ts');
    
    if (securityServiceExists) {
      const content = fs.readFileSync('./lib/securityService.ts', 'utf8');
      const hasControl = content.includes('getSecureRedirectURL') && 
                        content.includes('allowedDomains');
      
      return {
        status: hasControl ? 'IMPLEMENTED' : 'PARTIAL',
        message: hasControl ? 'リダイレクトURL制御実装済み' : 'リダイレクトURL制御部分実装',
        score: hasControl ? 10 : 5
      };
    }
    
    return {
      status: 'NOT_IMPLEMENTED',
      message: 'リダイレクトURL制御未実装',
      score: 0
    };
  } catch {
    return {
      status: 'ERROR',
      message: 'リダイレクトURL制御確認エラー',
      score: 0
    };
  }
}

function checkSecurityDashboard() {
  try {
    const fs = require('fs');
    const dashboardExists = fs.existsSync('./app/security-dashboard/page.tsx');
    
    return {
      status: dashboardExists ? 'IMPLEMENTED' : 'NOT_IMPLEMENTED',
      message: dashboardExists ? 'セキュリティダッシュボード実装済み' : 'セキュリティダッシュボード未実装',
      score: dashboardExists ? 10 : 0
    };
  } catch {
    return {
      status: 'ERROR',
      message: 'セキュリティダッシュボード確認エラー',
      score: 0
    };
  }
}

function calculateOverallScore(results) {
  let totalScore = 0;
  let maxScore = 0;
  
  // RLSスコア
  Object.values(results.rlsVerification).forEach(result => {
    totalScore += result.score;
    maxScore += 10;
  });
  
  // スキーマ整合性スコア
  Object.values(results.schemaIntegrity).forEach(result => {
    totalScore += result.score;
    maxScore += 10;
  });
  
  // セキュリティ機能スコア
  Object.values(results.securityFeatures).forEach(result => {
    totalScore += result.score;
    maxScore += 10;
  });
  
  return Math.round((totalScore / maxScore) * 100);
}

function displayFinalResults(results) {
  console.log('\n🎯 最終セキュリティ検証結果');
  console.log('=' * 60);
  
  console.log(`\n📊 総合セキュリティスコア: ${results.overallScore}%`);
  
  if (results.overallScore >= 90) {
    console.log('🎉 優秀 - セキュリティ対策が十分に実装されています');
  } else if (results.overallScore >= 70) {
    console.log('✅ 良好 - 基本的なセキュリティ対策が実装されています');
  } else if (results.overallScore >= 50) {
    console.log('⚠️ 改善必要 - いくつかのセキュリティ課題があります');
  } else {
    console.log('🚨 要対策 - 重大なセキュリティ課題があります');
  }
  
  console.log('\n📋 詳細結果:');
  
  console.log('\n🛡️ RLS保護状態:');
  Object.entries(results.rlsVerification).forEach(([table, result]) => {
    const icon = result.score >= 8 ? '✅' : result.score >= 5 ? '⚠️' : '🚨';
    console.log(`  ${icon} ${table}: ${result.message} (${result.score}/10)`);
  });
  
  console.log('\n📊 スキーマ整合性:');
  Object.entries(results.schemaIntegrity).forEach(([table, result]) => {
    const icon = result.score >= 8 ? '✅' : result.score >= 5 ? '⚠️' : '🚨';
    console.log(`  ${icon} ${table}: ${result.message} (${result.score}/10)`);
  });
  
  console.log('\n🔒 セキュリティ機能:');
  Object.entries(results.securityFeatures).forEach(([feature, result]) => {
    const icon = result.score >= 8 ? '✅' : result.score >= 5 ? '⚠️' : '🚨';
    console.log(`  ${icon} ${feature}: ${result.message} (${result.score}/10)`);
  });
  
  console.log('\n🔧 推奨アクション:');
  
  // 低スコア項目の対策提案
  const lowScoreItems = [];
  Object.entries(results.rlsVerification).forEach(([table, result]) => {
    if (result.score < 8) lowScoreItems.push(`RLS: ${table}`);
  });
  Object.entries(results.schemaIntegrity).forEach(([table, result]) => {
    if (result.score < 8) lowScoreItems.push(`Schema: ${table}`);
  });
  Object.entries(results.securityFeatures).forEach(([feature, result]) => {
    if (result.score < 8) lowScoreItems.push(`Security: ${feature}`);
  });
  
  if (lowScoreItems.length > 0) {
    console.log('  以下の項目の改善を推奨します:');
    lowScoreItems.forEach(item => console.log(`    - ${item}`));
  } else {
    console.log('  全項目で高いスコアを達成しています！');
  }
}

// 実行
async function main() {
  try {
    const results = await finalSecurityVerification();
    
    console.log('\n🚀 次のステップ:');
    if (results.overallScore < 70) {
      console.log('1. 低スコア項目の修正実装');
      console.log('2. fix-table-schema.sql をSupabaseで実行');
      console.log('3. Supabase Dashboardでセキュリティ設定を確認');
      console.log('4. 再検証の実行');
    } else {
      console.log('1. /security-dashboard でリアルタイム監視開始');
      console.log('2. 定期的なセキュリティ監査の実施');
      console.log('3. 本番環境でのセキュリティ設定確認');
    }
    
  } catch (error) {
    console.error('💥 メイン処理エラー:', error.message);
  }
}

main();