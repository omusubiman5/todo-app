"use client";

// 🚀 Phase 3 Stage 3: 高度なキャッシュとプリフェッチ管理システム

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  persist?: boolean; // Persist to localStorage
  compress?: boolean;
}

interface PrefetchOptions {
  priority?: 'low' | 'medium' | 'high';
  delay?: number;
  condition?: () => boolean;
  retries?: number;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private persistentCache: Map<string, CacheEntry> = new Map();
  private prefetchQueue: Array<{
    url: string;
    options: PrefetchOptions;
    timestamp: number;
  }> = [];
  
  private maxCacheSize: number = 1000;
  private maxMemoryUsage: number = 50 * 1024 * 1024; // 50MB
  private hitCount: number = 0;
  private missCount: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private prefetchWorker: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeCache();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeCache(): void {
    if (typeof window === 'undefined') return;

    // LocalStorage からの復元
    this.loadPersistentCache();
    
    // 定期クリーンアップの開始
    this.startCleanupWorker();
    
    // プリフェッチワーカーの開始
    this.startPrefetchWorker();
    
    // ページ離脱時の永続化
    window.addEventListener('beforeunload', () => {
      this.savePersistentCache();
    });

    // メモリ不足の監視
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 30000); // 30秒ごと
    }
  }

  // キャッシュの保存
  public set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): void {
    const {
      ttl = 5 * 60 * 1000, // 5分
      priority = 'medium',
      tags = [],
      persist = false,
      compress = false
    } = options;

    let processedData = data;
    
    // 圧縮処理
    if (compress && typeof data === 'string') {
      try {
        processedData = this.compressString(data) as T;
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      priority,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
    };

    // メモリキャッシュに保存
    this.cache.set(key, entry);

    // 永続化キャッシュに保存
    if (persist) {
      this.persistentCache.set(key, entry);
    }

    // キャッシュサイズの管理
    this.enforceMaxSize();
  }

  // キャッシュからの取得
  public get<T>(key: string): T | null {
    // メモリキャッシュから検索
    let entry = this.cache.get(key);
    
    // 永続化キャッシュから検索
    if (!entry) {
      entry = this.persistentCache.get(key);
      if (entry) {
        // メモリキャッシュに復元
        this.cache.set(key, entry);
      }
    }

    if (!entry) {
      this.missCount++;
      return null;
    }

    // TTL チェック
    if (this.isExpired(entry)) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // アクセス統計の更新
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.data;
  }

  // キャッシュの削除
  public delete(key: string): boolean {
    const memoryDeleted = this.cache.delete(key);
    const persistentDeleted = this.persistentCache.delete(key);
    return memoryDeleted || persistentDeleted;
  }

  // タグによる一括削除
  public deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    for (const [key, entry] of this.persistentCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.persistentCache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // キャッシュのクリア
  public clear(): void {
    this.cache.clear();
    this.persistentCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // プリフェッチの追加
  public prefetch(url: string, options: PrefetchOptions = {}): void {
    const {
      priority = 'low',
      delay = 0,
      condition = () => true,
      retries = 2
    } = options;

    // 既にキューに存在するかチェック
    const existingIndex = this.prefetchQueue.findIndex(item => item.url === url);
    if (existingIndex !== -1) {
      // 優先度が高い場合は更新
      if (this.getPriorityValue(priority) > this.getPriorityValue(this.prefetchQueue[existingIndex].options.priority || 'low')) {
        this.prefetchQueue[existingIndex].options.priority = priority;
      }
      return;
    }

    this.prefetchQueue.push({
      url,
      options: { priority, delay, condition, retries },
      timestamp: Date.now(),
    });

    // 優先度でソート
    this.prefetchQueue.sort((a, b) => 
      this.getPriorityValue(b.options.priority || 'low') - 
      this.getPriorityValue(a.options.priority || 'low')
    );
  }

  // スマートプリフェッチ（使用パターンに基づく）
  public smartPrefetch(pattern: 'user-behavior' | 'time-based' | 'route-based'): void {
    switch (pattern) {
      case 'user-behavior':
        this.prefetchBasedOnUserBehavior();
        break;
      case 'time-based':
        this.prefetchBasedOnTime();
        break;
      case 'route-based':
        this.prefetchBasedOnRoute();
        break;
    }
  }

  // キャッシュ統計の取得
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalEntries: this.cache.size + this.persistentCache.size,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.missCount / totalRequests) * 100 : 0,
      memoryUsage: this.calculateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
    };
  }

  // キャッシュのウォームアップ
  public async warmup(urls: string[]): Promise<void> {
    const promises = urls.map(url => 
      this.prefetch(url, { priority: 'high' })
    );
    
    // 並列プリフェッチの制限（最大5並列）
    const chunks = this.chunkArray(promises, 5);
    for (const chunk of chunks) {
      await Promise.allSettled(chunk);
    }
  }

  // プライベートメソッド
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // LRU + Priority による削除
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      const priorityDiff = this.getPriorityValue(a[1].priority) - this.getPriorityValue(b[1].priority);
      if (priorityDiff !== 0) return priorityDiff;
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    const deleteCount = this.cache.size - this.maxCacheSize + 100; // 余裕を持って削除
    for (let i = 0; i < deleteCount && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private calculateMemoryUsage(): number {
    let usage = 0;
    for (const entry of this.cache.values()) {
      usage += this.estimateSize(entry.data);
    }
    return usage;
  }

  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // fallback estimate
    }
  }

  private checkMemoryPressure(): void {
    const memoryUsage = this.calculateMemoryUsage();
    
    if (memoryUsage > this.maxMemoryUsage) {
      console.warn('Memory pressure detected, cleaning cache');
      this.emergencyCleanup();
    }
  }

  private emergencyCleanup(): void {
    // 低優先度のエントリを削除
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority === 'low' || this.isExpired(entry)) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
    
    // まだメモリ使用量が多い場合は、アクセス頻度の低いものを削除
    if (this.calculateMemoryUsage() > this.maxMemoryUsage * 0.8) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      const deleteCount = Math.floor(entries.length * 0.3);
      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  private startCleanupWorker(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // 1分ごと
  }

  private startPrefetchWorker(): void {
    this.prefetchWorker = setInterval(() => {
      this.processPrefetchQueue();
    }, 1000); // 1秒ごと
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) return;

    const item = this.prefetchQueue.shift();
    if (!item) return;

    // 条件チェック
    if (!item.options.condition?.()) {
      return;
    }

    // 遅延実行
    if (item.options.delay && item.options.delay > 0) {
      setTimeout(() => {
        this.executePrefetch(item.url, item.options.retries || 2);
      }, item.options.delay);
    } else {
      await this.executePrefetch(item.url, item.options.retries || 2);
    }
  }

  private async executePrefetch(url: string, retries: number): Promise<void> {
    try {
      // ネットワーク状況チェック
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection && (connection.saveData || connection.effectiveType === '2g')) {
          return; // 低速回線ではプリフェッチしない
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        priority: 'low' as any, // プリフェッチは低優先度
      });

      if (response.ok) {
        const data = await response.text();
        this.set(`prefetch:${url}`, data, {
          ttl: 10 * 60 * 1000, // 10分
          priority: 'low',
          tags: ['prefetch'],
        });
      }
    } catch (error) {
      if (retries > 0) {
        // リトライ
        setTimeout(() => {
          this.executePrefetch(url, retries - 1);
        }, 2000);
      }
    }
  }

  private prefetchBasedOnUserBehavior(): void {
    // ユーザーの行動パターンに基づくプリフェッチ
    const recentPages = this.getRecentPageViews();
    const patterns = this.analyzeNavigationPatterns(recentPages);
    
    patterns.forEach(url => {
      this.prefetch(url, { priority: 'medium' });
    });
  }

  private prefetchBasedOnTime(): void {
    // 時間帯に基づくプリフェッチ
    const hour = new Date().getHours();
    
    if (hour >= 9 && hour <= 17) {
      // 勤務時間中はワークスペース関連をプリフェッチ
      this.prefetch('/api/tasks', { priority: 'medium' });
      this.prefetch('/api/teams', { priority: 'low' });
    }
  }

  private prefetchBasedOnRoute(): void {
    // 現在のルートに基づくプリフェッチ
    if (typeof window === 'undefined') return;
    
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/workspace')) {
      this.prefetch('/api/tasks', { priority: 'high' });
      this.prefetch('/api/stats', { priority: 'medium' });
    }
  }

  private getPriorityValue(priority: string): number {
    const values = { low: 1, medium: 2, high: 3, critical: 4 };
    return values[priority as keyof typeof values] || 1;
  }

  private compressString(str: string): string {
    // 簡単な圧縮実装（実際にはlz-stringなどを使用）
    return str; // プレースホルダー
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getRecentPageViews(): string[] {
    // 実装：最近のページビューを取得
    return [];
  }

  private analyzeNavigationPatterns(pages: string[]): string[] {
    // 実装：ナビゲーションパターンを分析
    return [];
  }

  private loadPersistentCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('todoapp_cache');
      if (stored) {
        const data = JSON.parse(stored);
        this.persistentCache = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  private savePersistentCache(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Array.from(this.persistentCache.entries());
      localStorage.setItem('todoapp_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  // クリーンアップ
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.prefetchWorker) {
      clearInterval(this.prefetchWorker);
    }
    this.clear();
  }
}

// シングルトンインスタンス
export const cacheManager = CacheManager.getInstance();

// React フック
export function useCache<T>(key: string) {
  const get = (): T | null => cacheManager.get<T>(key);
  const set = (data: T, options?: CacheOptions) => cacheManager.set(key, data, options);
  const remove = () => cacheManager.delete(key);
  
  return { get, set, remove };
}

// キャッシュ対応 fetch ヘルパー
export async function cachedFetch<T>(
  url: string, 
  options: RequestInit & { cacheOptions?: CacheOptions } = {}
): Promise<T> {
  const { cacheOptions, ...fetchOptions } = options;
  const cacheKey = `fetch:${url}:${JSON.stringify(fetchOptions)}`;
  
  // キャッシュから取得を試行
  const cached = cacheManager.get<T>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // ネットワークから取得
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // キャッシュに保存
  cacheManager.set(cacheKey, data, {
    ttl: 5 * 60 * 1000, // 5分
    priority: 'medium',
    tags: ['fetch'],
    ...cacheOptions,
  });
  
  return data;
}