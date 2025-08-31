// const puppeteer = require('puppeteer-core'); // Optional for advanced testing

async function performanceTest() {
  console.log('🚀 パフォーマンステスト開始...');
  
  // Lighthouse用の設定
  const lighthouseConfig = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    },
  };
  
  try {
    // 基本的なパフォーマンス指標
    console.log('\n1️⃣ 基本パフォーマンス指標...');
    
    // Bundle size check
    const bundleInfo = await fetch('http://localhost:3001/_next/static/chunks/').catch(() => null);
    console.log('バンドル情報:', bundleInfo ? '利用可能' : '取得不可');
    
    // Memory usage simulation
    console.log('\n2️⃣ メモリ使用量シミュレーション...');
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        id: i,
        text: `タスク ${i}`,
        priority: ['高', '中', '低'][i % 3],
        completed: Math.random() > 0.7
      });
    }
    
    console.log('大量データ処理テスト:', {
      データ数: testData.length,
      メモリ使用量: `約 ${Math.round(JSON.stringify(testData).length / 1024 / 1024 * 10) / 10} MB`
    });
    
    // Response time test
    console.log('\n3️⃣ レスポンス時間テスト...');
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3001/login');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log('ログインページ:', {
        レスポンス時間: `${responseTime}ms`,
        ステータス: response.status,
        評価: responseTime < 1000 ? '✅ 高速' : responseTime < 3000 ? '⚠️ 普通' : '❌ 遅い'
      });
    } catch (e) {
      console.log('❌ ページアクセスエラー:', e.message);
    }
    
    // API endpoint performance
    console.log('\n4️⃣ API パフォーマンス...');
    const apiTests = [
      { name: 'ホームページ', url: 'http://localhost:3001/' },
      { name: 'ログインページ', url: 'http://localhost:3001/login' },
      { name: 'デバッグページ', url: 'http://localhost:3001/debug' }
    ];
    
    for (const test of apiTests) {
      try {
        const start = Date.now();
        const response = await fetch(test.url);
        const time = Date.now() - start;
        
        console.log(`${test.name}: ${time}ms (${response.status}) ${
          time < 500 ? '✅' : time < 1000 ? '⚠️' : '❌'
        }`);
      } catch (e) {
        console.log(`${test.name}: ❌ エラー`);
      }
    }
    
  } catch (error) {
    console.error('💥 パフォーマンステストエラー:', error.message);
  }
}

performanceTest();