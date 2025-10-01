// 🚀 フォント最適化ユーティリティ

// 1. フォント読み込み戦略
export const FONT_LOADING_STRATEGY = {
  // 重要なフォント（即座に必要）
  critical: {
    preload: true,
    display: 'swap' as const,
    fallback: ['system-ui', '-apple-system', 'sans-serif']
  },

  // 一般的なフォント（必要時に読み込み）
  normal: {
    preload: false,
    display: 'swap' as const,
    fallback: ['system-ui', 'sans-serif']
  },

  // 特殊用途フォント（遅延読み込み）
  optional: {
    preload: false,
    display: 'optional' as const,
    fallback: ['monospace', 'Courier New']
  }
};

// 2. フォントサイズとウェイトの最適化
export const FONT_WEIGHTS = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const;

// 必要最小限のフォントウェイト
export const MINIMAL_FONT_WEIGHTS = [400, 500, 700];

// 3. 日本語フォント最適化
export const JAPANESE_FONT_SUBSETS = {
  // 最小セット（ひらがな、カタカナ、基本漢字）
  minimal: [
    'U+3040-309F', // ひらがな
    'U+30A0-30FF', // カタカナ
    'U+4E00-9FAF', // 基本漢字（常用漢字含む）
  ],

  // 標準セット
  standard: [
    'U+3040-309F', // ひらがな
    'U+30A0-30FF', // カタカナ
    'U+4E00-9FAF', // CJK統合漢字
    'U+FF00-FFEF', // 全角文字
  ],

  // 完全セット（使用は非推奨）
  full: ['latin', 'japanese']
};

// 4. フォント読み込み状態の管理
export class FontLoadingManager {
  private loadedFonts = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  // フォントの動的読み込み
  async loadFont(fontFamily: string, options: {
    weight?: number | string;
    style?: 'normal' | 'italic';
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  } = {}): Promise<void> {
    const fontKey = `${fontFamily}-${options.weight || 400}-${options.style || 'normal'}`;

    if (this.loadedFonts.has(fontKey)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(fontKey)) {
      return this.loadingPromises.get(fontKey)!;
    }

    const loadPromise = this.loadFontInternal(fontFamily, options, fontKey);
    this.loadingPromises.set(fontKey, loadPromise);

    return loadPromise;
  }

  private async loadFontInternal(
    fontFamily: string,
    options: any,
    fontKey: string
  ): Promise<void> {
    try {
      // CSS Font Loading APIを使用
      const fontFace = new FontFace(
        fontFamily,
        `url(/fonts/${fontFamily.toLowerCase().replace(/\s+/g, '-')}-${options.weight || 400}.woff2)`,
        {
          weight: options.weight?.toString() || '400',
          style: options.style || 'normal',
          display: options.display || 'swap'
        }
      );

      await fontFace.load();
      document.fonts.add(fontFace);

      this.loadedFonts.add(fontKey);
      this.loadingPromises.delete(fontKey);

      console.log(`✅ Font loaded: ${fontKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load font: ${fontKey}`, error);
      this.loadingPromises.delete(fontKey);
    }
  }

  // 条件付きフォント読み込み
  async loadFontIf(condition: boolean, fontFamily: string, options?: any): Promise<void> {
    if (condition) {
      return this.loadFont(fontFamily, options);
    }
    return Promise.resolve();
  }

  // フォントの読み込み状況を確認
  isFontLoaded(fontFamily: string, weight = 400, style = 'normal'): boolean {
    const fontKey = `${fontFamily}-${weight}-${style}`;
    return this.loadedFonts.has(fontKey);
  }

  // 読み込み済みフォント一覧
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }
}

// 5. フォント読み込みのReactフック
import { useState, useEffect, useCallback } from 'react';

export function useFontLoading() {
  const [fontManager] = useState(() => new FontLoadingManager());
  const [loadingFonts, setLoadingFonts] = useState<string[]>([]);

  const loadFont = useCallback(async (fontFamily: string, options?: any) => {
    const fontKey = `${fontFamily}-${options?.weight || 400}`;

    setLoadingFonts(prev => [...prev, fontKey]);

    try {
      await fontManager.loadFont(fontFamily, options);
    } finally {
      setLoadingFonts(prev => prev.filter(f => f !== fontKey));
    }
  }, [fontManager]);

  const isLoading = loadingFonts.length > 0;
  const getLoadedFonts = useCallback(() => fontManager.getLoadedFonts(), [fontManager]);

  return {
    loadFont,
    isLoading,
    loadingFonts,
    getLoadedFonts,
    isFontLoaded: fontManager.isFontLoaded.bind(fontManager)
  };
}

// 6. 条件付きフォント読み込みフック
export function useConditionalFont(
  condition: boolean,
  fontFamily: string,
  options?: any
) {
  const { loadFont, isFontLoaded } = useFontLoading();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (condition && !shouldLoad && !isFontLoaded(fontFamily, options?.weight)) {
      setShouldLoad(true);
      loadFont(fontFamily, options);
    }
  }, [condition, fontFamily, options, shouldLoad, loadFont, isFontLoaded]);

  return {
    loaded: isFontLoaded(fontFamily, options?.weight),
    loading: shouldLoad && !isFontLoaded(fontFamily, options?.weight)
  };
}

// 7. システムフォント検出
export function detectSystemFonts(): {
  hasNotoSansJP: boolean;
  hasHiragino: boolean;
  hasYuGothic: boolean;
  preferredJapaneseFont: string;
} {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return {
      hasNotoSansJP: false,
      hasHiragino: false,
      hasYuGothic: false,
      preferredJapaneseFont: 'sans-serif'
    };
  }

  const testString = 'あいうえお';
  const defaultWidth = (() => {
    context.font = '16px sans-serif';
    return context.measureText(testString).width;
  })();

  const testFont = (fontFamily: string): boolean => {
    context.font = `16px ${fontFamily}, sans-serif`;
    return context.measureText(testString).width !== defaultWidth;
  };

  const hasNotoSansJP = testFont('Noto Sans JP');
  const hasHiragino = testFont('Hiragino Kaku Gothic ProN');
  const hasYuGothic = testFont('Yu Gothic Medium');

  const preferredJapaneseFont = hasNotoSansJP ? 'Noto Sans JP' :
                               hasHiragino ? 'Hiragino Kaku Gothic ProN' :
                               hasYuGothic ? 'Yu Gothic Medium' : 'sans-serif';

  return {
    hasNotoSansJP,
    hasHiragino,
    hasYuGothic,
    preferredJapaneseFont
  };
}

// 8. パフォーマンス測定
export function measureFontLoadingPerformance() {
  const startTime = performance.now();
  let fontsReady = false;

  return new Promise<{
    loadTime: number;
    fontsLoaded: number;
  }>((resolve) => {
    document.fonts.ready.then(() => {
      if (!fontsReady) {
        fontsReady = true;
        const loadTime = performance.now() - startTime;
        const fontsLoaded = document.fonts.size;

        console.log(`🚀 Fonts loaded in ${loadTime.toFixed(2)}ms (${fontsLoaded} fonts)`);

        resolve({ loadTime, fontsLoaded });
      }
    });

    // タイムアウト保護
    setTimeout(() => {
      if (!fontsReady) {
        fontsReady = true;
        const loadTime = performance.now() - startTime;
        console.warn(`⚠️ Font loading timed out after ${loadTime.toFixed(2)}ms`);
        resolve({ loadTime, fontsLoaded: document.fonts.size });
      }
    }, 3000);
  });
}

// 9. フォント最適化のベストプラクティス
export const FONT_BEST_PRACTICES = {
  // 読み込み戦略
  loadingStrategy: {
    critical: ['Inter 400', 'Inter 500'], // 即座に必要
    important: ['Inter 600', 'Inter 700'], // 早期に読み込み
    optional: ['Noto Sans JP 400', 'Roboto Mono 400'] // 必要時のみ
  },

  // フォールバック設定
  fallbacks: {
    sansSerif: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    japanese: ['Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', 'sans-serif'],
    monospace: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', 'monospace']
  },

  // サイズ制限
  limits: {
    maxFontFiles: 5, // 同時読み込みフォントファイル数
    maxTotalSize: 500, // KB
    maxLoadTime: 3000 // ms
  }
};

export default {
  FONT_LOADING_STRATEGY,
  FONT_WEIGHTS,
  MINIMAL_FONT_WEIGHTS,
  JAPANESE_FONT_SUBSETS,
  FontLoadingManager,
  useFontLoading,
  useConditionalFont,
  detectSystemFonts,
  measureFontLoadingPerformance,
  FONT_BEST_PRACTICES
};