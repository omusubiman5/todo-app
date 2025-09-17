'use client';

import { useEffect } from 'react';
import { initializeAnalytics } from '@/lib/analyticsIntegration';
import { usePageTracking } from '@/hooks/useAnalytics';

export function AnalyticsInitializer() {
  // ページトラッキング
  usePageTracking();

  useEffect(() => {
    // アナリティクスシステムの初期化
    initializeAnalytics();
  }, []);

  // このコンポーネントは何もレンダリングしない
  return null;
}