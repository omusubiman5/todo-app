const { createClient } = require('@supabase/supabase-js');

async function passwordResetSecurityAnalysis() {
  console.log('🔐 パスワードリセット機能セキュリティ分析');
  console.log('=' * 60);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // 1. 現在の設定状態確認
  console.log('🔍 Step 1: 現在のパスワードリセット設定確認');
  await analyzeCurrentSettings(supabase);
  
  // 2. セキュリティリスク評価
  console.log('\n⚠️ Step 2: セキュリティリスク評価');
  analyzeSecurityRisks();
  
  // 3. 推奨セキュリティ強化策
  console.log('\n🛡️ Step 3: 推奨セキュリティ強化策');
  recommendSecurityEnhancements();
  
  // 4. 実装可能な対策
  console.log('\n🔧 Step 4: 実装可能な対策');
  showImplementableCountermeasures();
  
  return {
    currentStatus: 'analyzed',
    recommendations: 'provided'
  };
}

async function analyzeCurrentSettings(supabase) {
  try {
    // パスワードリセット機能のテスト
    console.log('📧 パスワードリセット要求テスト...');
    
    const testEmails = [
      'test@example.com',
      'nonexistent@domain.com',
      'admin@localhost'
    ];
    
    for (const email of testEmails) {
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'http://localhost:3000/reset-password'
        });
        
        if (error) {
          if (error.message.includes('User not found')) {
            console.log(`✅ ${email}: ユーザー不存在 - セキュア`);
          } else if (error.message.includes('signup')) {
            console.log(`⚠️ ${email}: サインアップ無効設定`);
          } else if (error.message.includes('rate limit')) {
            console.log(`✅ ${email}: レート制限 - セキュア`);
          } else {
            console.log(`❓ ${email}: ${error.message}`);
          }
        } else {
          console.log(`🚨 ${email}: リセット要求受理 - 要確認`);
        }
        
        // レート制限回避のため待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (e) {
        console.log(`❌ ${email}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 設定確認エラー:', error.message);
  }
}

function analyzeSecurityRisks() {
  const risks = [
    {
      level: '🔴 高リスク',
      issue: 'ユーザー存在確認の漏洩',
      description: 'リセット要求でユーザーの存在/非存在が判明する',
      impact: 'ユーザー列挙攻撃が可能'
    },
    {
      level: '🟡 中リスク', 
      issue: 'レート制限の不備',
      description: '短時間での大量リセット要求が可能',
      impact: 'DoS攻撃やスパム攻撃が可能'
    },
    {
      level: '🟡 中リスク',
      issue: 'リダイレクトURL制御',
      description: '任意のURLへのリダイレクトが可能',
      impact: 'フィッシング攻撃の踏み台となる可能性'
    },
    {
      level: '🟢 低リスク',
      issue: 'トークン有効期限',
      description: 'リセットトークンの有効期限設定',
      impact: '長期間有効なトークンによる悪用'
    }
  ];
  
  risks.forEach((risk, index) => {
    console.log(`${index + 1}. ${risk.level}: ${risk.issue}`);
    console.log(`   問題: ${risk.description}`);
    console.log(`   影響: ${risk.impact}\n`);
  });
}

function recommendSecurityEnhancements() {
  const recommendations = [
    {
      priority: '🔥 最優先',
      measure: 'ユーザー存在漏洩の防止',
      implementation: 'レスポンス正規化 - 存在/非存在に関わらず同一レスポンス',
      code: `
// 推奨実装例
app.post('/password-reset', async (req, res) => {
  const { email } = req.body;
  
  // 常に成功レスポンスを返す
  try {
    await supabase.auth.resetPasswordForEmail(email);
  } catch (error) {
    // エラーを隠蔽
  }
  
  // ユーザー存在に関わらず同じメッセージ
  res.json({
    message: "リセットメールを送信しました（該当するアカウントがある場合）"
  });
});`
    },
    {
      priority: '🔥 最優先',
      measure: 'レート制限の強化',
      implementation: 'IP/メールアドレス単位でのレート制限',
      code: `
// レート制限設定例
const rateLimit = require('express-rate-limit');

const resetPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 3, // 最大3回まで
  message: "リセット要求が多すぎます。しばらく待ってから再試行してください。",
  standardHeaders: true,
  legacyHeaders: false,
});`
    },
    {
      priority: '🟡 重要',
      measure: 'リダイレクトURL制御',
      implementation: 'ホワイトリスト方式での許可URL制限',
      code: `
// 許可URLチェック例
const allowedDomains = [
  'localhost:3000',
  'yourdomain.com',
  'staging.yourdomain.com'
];

function isAllowedRedirectURL(url) {
  try {
    const urlObj = new URL(url);
    return allowedDomains.includes(urlObj.host);
  } catch {
    return false;
  }
}`
    },
    {
      priority: '🟢 推奨',
      measure: 'セキュリティログの実装',
      implementation: 'パスワードリセット試行のログ記録',
      code: `
// セキュリティログ例
const securityLog = {
  event: 'password_reset_attempt',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  email: email, // ハッシュ化推奨
  timestamp: new Date().toISOString(),
  success: false
};

await logSecurityEvent(securityLog);`
    }
  ];
  
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.priority}: ${rec.measure}`);
    console.log(`   実装方法: ${rec.implementation}`);
    console.log(`   コード例:${rec.code}\n`);
  });
}

function showImplementableCountermeasures() {
  console.log('📋 今すぐ実装可能な対策:');
  console.log('');
  
  const immediateMeasures = [
    '1. 環境変数でリダイレクトURL制限',
    '2. フロントエンドでのレスポンス正規化',
    '3. Supabase Auth設定でのセキュリティ強化',
    '4. クライアント側でのレート制限実装',
    '5. セキュリティヘッダーの追加'
  ];
  
  immediateMeasures.forEach(measure => {
    console.log(`✅ ${measure}`);
  });
  
  console.log('\n🔧 Supabase Dashboard設定項目:');
  console.log('  - Authentication > Settings > Security');
  console.log('  - Rate limiting の有効化');
  console.log('  - Redirect URLs の制限');
  console.log('  - Email templates のカスタマイズ');
  console.log('  - CAPTCHA の有効化');
}

// 実行
async function main() {
  try {
    await passwordResetSecurityAnalysis();
    
    console.log('\n🎯 次のアクション:');
    console.log('1. Supabase Dashboard でセキュリティ設定を確認');
    console.log('2. 推奨されたコード実装を検討');
    console.log('3. セキュリティテストの実行');
    
  } catch (error) {
    console.error('💥 分析エラー:', error.message);
  }
}

main();