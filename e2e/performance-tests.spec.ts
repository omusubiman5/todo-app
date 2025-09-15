import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('ページ読み込みパフォーマンス', async ({ page }) => {
    // パフォーマンスメトリクスを測定
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        // 基本的な読み込み時間
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        
        // ネットワーク関連
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.requestStart,
        
        // レンダリング関連
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        
        // リソース読み込み
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });

    console.log('Performance Metrics:', metrics);

    // パフォーマンス基準の確認
    expect(metrics.totalLoadTime).toBeLessThan(3000); // 3秒以内
    expect(metrics.domContentLoaded).toBeLessThan(1000); // DOMContentLoaded 1秒以内
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // FCP 1.5秒以内
    expect(metrics.serverResponse).toBeLessThan(500); // サーバーレスポンス 500ms以内
  });

  test('大量データでのスクロールパフォーマンス', async ({ page }) => {
    // 多くのタスクを作成してスクロールパフォーマンスをテスト
    const taskCount = 100;
    
    // 大量のタスクを追加
    for (let i = 0; i < taskCount; i++) {
      await page.fill('input[placeholder*="タスク"]', `パフォーマンステストタスク ${i + 1}`);
      await page.click('button[type="submit"]');
      
      // バッチで処理してテスト時間を短縮
      if (i % 10 === 9) {
        await page.waitForTimeout(100);
      }
    }

    // スクロールパフォーマンスの測定
    const scrollPerformance = await page.evaluate(() => {
      return new Promise<{
        averageFrameTime: number;
        maxFrameTime: number;
        totalFrames: number;
      }>((resolve) => {
        const frameTimes: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        
        function measureFrame() {
          const currentTime = performance.now();
          const frameTime = currentTime - lastTime;
          frameTimes.push(frameTime);
          lastTime = currentTime;
          frameCount++;
          
          if (frameCount < 60) { // 60フレーム測定
            requestAnimationFrame(measureFrame);
          } else {
            const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const maxFrameTime = Math.max(...frameTimes);
            
            resolve({
              averageFrameTime,
              maxFrameTime,
              totalFrames: frameCount
            });
          }
        }
        
        // スクロールを開始
        const container = document.documentElement;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        
        requestAnimationFrame(measureFrame);
      });
    });

    console.log('Scroll Performance:', scrollPerformance);

    // 60FPS (16.67ms per frame) を基準とした評価
    expect(scrollPerformance.averageFrameTime).toBeLessThan(20); // 平均20ms以下
    expect(scrollPerformance.maxFrameTime).toBeLessThan(50); // 最大50ms以下
  });

  test('メモリ使用量の監視', async ({ page }) => {
    // 初期メモリ使用量の測定
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (initialMemory) {
      console.log('Initial Memory:', initialMemory);
    }

    // 多くのDOMノードを作成
    const heavyOperationCount = 50;
    for (let i = 0; i < heavyOperationCount; i++) {
      await page.fill('input[placeholder*="タスク"]', `メモリテストタスク ${i + 1} - Lorem ipsum dolor sit amet consectetur adipiscing elit`);
      await page.click('button[type="submit"]');
      
      if (i % 10 === 9) {
        await page.waitForTimeout(100);
      }
    }

    // 操作後のメモリ使用量の測定
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      console.log('Final Memory:', finalMemory);
      
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePerTask = memoryIncrease / heavyOperationCount;
      
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePerTask} bytes per task)`);
      
      // メモリ使用量が異常に増加していないことを確認（タスクあたり10KB以下）
      expect(memoryIncreasePerTask).toBeLessThan(10240);
      
      // 総メモリ使用量が合理的な範囲内であることを確認（100MB以下）
      expect(finalMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('レンダリングパフォーマンス', async ({ page }) => {
    // レンダリングパフォーマンスの測定
    const renderingMetrics = await page.evaluate(() => {
      return new Promise<{
        paintTime: number;
        layoutTime: number;
        renderTime: number;
      }>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const paintTime = entries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
          
          resolve({
            paintTime,
            layoutTime: 0, // 具体的な測定は実装に依存
            renderTime: paintTime
          });
        });
        
        observer.observe({ entryTypes: ['paint'] });
        
        // レンダリングトリガーとなる要素を追加
        const container = document.createElement('div');
        container.innerHTML = '<div>'.repeat(100) + 'Rendering Test</div>'.repeat(100);
        document.body.appendChild(container);
      });
    });

    console.log('Rendering Metrics:', renderingMetrics);

    // レンダリング時間が合理的であることを確認
    expect(renderingMetrics.paintTime).toBeLessThan(2000); // 2秒以内
  });

  test('ネットワークリクエストパフォーマンス', async ({ page }) => {
    // ネットワークリクエストの監視
    const networkRequests: Array<{
      url: string;
      method: string;
      responseTime: number;
      responseSize: number;
    }> = [];

    page.on('response', async (response) => {
      const request = response.request();
      const timing = response.request().timing();
      
      if (timing) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          responseTime: timing.responseEnd - timing.requestStart,
          responseSize: (await response.body()).length
        });
      }
    });

    // ページ操作を実行
    await page.fill('input[placeholder*="タスク"]', 'ネットワークテストタスク');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000); // リクエスト完了を待つ

    console.log('Network Requests:', networkRequests);

    // APIリクエストのパフォーマンス確認
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('/api/') || req.method === 'POST'
    );

    for (const request of apiRequests) {
      expect(request.responseTime).toBeLessThan(1000); // 1秒以内
      
      // レスポンスサイズが合理的であることを確認（1MB以下）
      expect(request.responseSize).toBeLessThan(1024 * 1024);
    }
  });

  test('JavaScript実行パフォーマンス', async ({ page }) => {
    // CPU集約的なタスクのパフォーマンス測定
    const jsPerformance = await page.evaluate(() => {
      const startTime = performance.now();
      
      // 集約的な計算をシミュレート
      let result = 0;
      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i) * Math.sin(i);
      }
      
      const endTime = performance.now();
      
      return {
        executionTime: endTime - startTime,
        result: result
      };
    });

    console.log('JavaScript Performance:', jsPerformance);

    // JavaScript実行時間が合理的であることを確認
    expect(jsPerformance.executionTime).toBeLessThan(100); // 100ms以内
  });

  test('アニメーションパフォーマンス', async ({ page }) => {
    // アニメーション関連の要素があるかチェック
    const hasAnimations = await page.evaluate(() => {
      const animatedElements = document.querySelectorAll('[data-animation], .animate, .transition');
      return animatedElements.length > 0;
    });

    if (!hasAnimations) {
      console.log('No animations found, skipping animation performance test');
      return;
    }

    // アニメーションパフォーマンスの測定
    const animationPerformance = await page.evaluate(() => {
      return new Promise<{
        averageFPS: number;
        droppedFrames: number;
      }>((resolve) => {
        let frames = 0;
        let startTime = performance.now();
        let droppedFrames = 0;
        let lastFrameTime = startTime;
        
        function countFrames() {
          frames++;
          const currentTime = performance.now();
          
          // フレームドロップの検出（16.67ms = 60FPS の基準）
          if (currentTime - lastFrameTime > 33.34) { // 30FPS以下
            droppedFrames++;
          }
          
          lastFrameTime = currentTime;
          
          if (currentTime - startTime < 1000) { // 1秒間測定
            requestAnimationFrame(countFrames);
          } else {
            const averageFPS = frames / ((currentTime - startTime) / 1000);
            resolve({
              averageFPS,
              droppedFrames
            });
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });

    console.log('Animation Performance:', animationPerformance);

    // アニメーションパフォーマンスの基準
    expect(animationPerformance.averageFPS).toBeGreaterThan(30); // 30FPS以上
    expect(animationPerformance.droppedFrames).toBeLessThan(10); // ドロップフレーム10未満
  });

  test('フォーム入力パフォーマンス', async ({ page }) => {
    // 高速な連続入力のパフォーマンステスト
    const inputPerformance = await page.evaluate(() => {
      return new Promise<{
        totalTime: number;
        averageInputTime: number;
      }>((resolve) => {
        const input = document.querySelector('input[placeholder*="タスク"]') as HTMLInputElement;
        if (!input) {
          resolve({ totalTime: 0, averageInputTime: 0 });
          return;
        }
        
        const testString = 'Performance test input with many characters to simulate real user typing behavior';
        const inputTimes: number[] = [];
        let currentIndex = 0;
        const startTime = performance.now();
        
        function typeCharacter() {
          if (currentIndex >= testString.length) {
            const totalTime = performance.now() - startTime;
            const averageInputTime = inputTimes.reduce((a, b) => a + b, 0) / inputTimes.length;
            
            resolve({
              totalTime,
              averageInputTime
            });
            return;
          }
          
          const charStartTime = performance.now();
          
          input.value += testString[currentIndex];
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          const charEndTime = performance.now();
          inputTimes.push(charEndTime - charStartTime);
          
          currentIndex++;
          
          // 実際のタイピング間隔をシミュレート（50-100ms）
          setTimeout(typeCharacter, Math.random() * 50 + 50);
        }
        
        typeCharacter();
      });
    });

    console.log('Input Performance:', inputPerformance);

    // 入力パフォーマンスの基準
    expect(inputPerformance.averageInputTime).toBeLessThan(10); // 平均10ms以下
    expect(inputPerformance.totalTime).toBeLessThan(10000); // 総時間10秒以内
  });

  test('バンドルサイズとリソース使用量', async ({ page }) => {
    // リソースサイズの分析
    const resourceAnalysis = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalSize = 0;
      const resourceTypes = {
        scripts: { count: 0, size: 0 },
        stylesheets: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        other: { count: 0, size: 0 }
      };
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        totalSize += size;
        
        if (resource.name.endsWith('.js')) {
          resourceTypes.scripts.count++;
          resourceTypes.scripts.size += size;
        } else if (resource.name.endsWith('.css')) {
          resourceTypes.stylesheets.count++;
          resourceTypes.stylesheets.size += size;
        } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
          resourceTypes.images.count++;
          resourceTypes.images.size += size;
        } else {
          resourceTypes.other.count++;
          resourceTypes.other.size += size;
        }
      });
      
      return {
        totalSize,
        resourceTypes,
        resourceCount: resources.length
      };
    });

    console.log('Resource Analysis:', resourceAnalysis);

    // リソース使用量の基準
    expect(resourceAnalysis.totalSize).toBeLessThan(5 * 1024 * 1024); // 総サイズ5MB以下
    expect(resourceAnalysis.resourceTypes.scripts.size).toBeLessThan(1 * 1024 * 1024); // JS 1MB以下
    expect(resourceAnalysis.resourceTypes.stylesheets.size).toBeLessThan(500 * 1024); // CSS 500KB以下
    expect(resourceAnalysis.resourceCount).toBeLessThan(50); // リソース数50未満
  });
});