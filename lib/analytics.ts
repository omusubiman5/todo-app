/**
 * Google Analytics 4 実装
 * プライバシー配慮版
 */

// GA4設定
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// プライバシー設定
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
const COOKIE_CONSENT_REQUIRED = process.env.NEXT_PUBLIC_COOKIE_CONSENT_REQUIRED === 'true';

// GA4が利用可能かチェック
export const isAnalyticsEnabled = (): boolean => {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return false;
  if (!ANALYTICS_ENABLED) return false;
  if (typeof window === 'undefined') return false;

  // Cookie同意が必要な場合はチェック
  if (COOKIE_CONSENT_REQUIRED) {
    const consent = localStorage.getItem('cookie-consent');
    return consent === 'accepted';
  }

  return true;
};

// GA4の初期化（プライバシー配慮設定）
export const initGA = () => {
  if (!isAnalyticsEnabled()) return;

  // gtag初期化
  window.gtag('config', GA_MEASUREMENT_ID, {
    // プライバシー配慮設定
    anonymize_ip: true, // IPアドレス匿名化
    allow_google_signals: false, // Google シグナル無効
    allow_ad_personalization_signals: false, // 広告パーソナライゼーション無効

    // データ保持期間
    storage: 'none', // ストレージ使用なし

    // デバッグ設定
    debug_mode: process.env.NODE_ENV === 'development',

    // Cookie設定
    cookie_flags: 'SameSite=Lax;Secure', // セキュリティ強化

    // ページビュー自動送信を無効化（手動制御）
    send_page_view: false,
  });

  console.log('🔍 GA4 initialized with privacy settings');
};

// Cookie同意管理
export const setCookieConsent = (accepted: boolean) => {
  localStorage.setItem('cookie-consent', accepted ? 'accepted' : 'declined');

  if (accepted) {
    initGA();
  } else {
    // Analytics無効化
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
      });
    }
  }
};

// ページビューイベント
export const trackPageView = (url: string, title?: string) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', 'page_view', {
    page_title: title || document.title,
    page_location: url,
    page_path: new URL(url).pathname,
    // カスタムディメンション
    user_type: 'registered_user', // ユーザータイプ
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  });
};

// カスタムイベント（タスク関連）
export const trackTaskEvent = (action: string, data?: any) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', action, {
    event_category: 'Task Management',
    event_label: data?.taskTitle,
    value: data?.taskCount,
    // カスタムパラメータ
    task_priority: data?.priority,
    task_status: data?.status,
    workspace_type: data?.workspaceType, // personal/team
  });
};

// チーム関連イベント
export const trackTeamEvent = (action: string, data?: any) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', action, {
    event_category: 'Team Collaboration',
    event_label: data?.teamName,
    value: data?.memberCount,
    // カスタムパラメータ
    team_role: data?.role,
    invitation_method: data?.invitationMethod,
  });
};

// ユーザー行動イベント
export const trackUserEvent = (action: string, data?: any) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', action, {
    event_category: 'User Engagement',
    event_label: data?.feature,
    // カスタムパラメータ
    engagement_duration: data?.duration,
    user_journey_step: data?.step,
  });
};

// パフォーマンス計測
export const trackPerformance = (metric: string, value: number) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', 'performance_metric', {
    event_category: 'Performance',
    metric_name: metric,
    metric_value: value,
    // Web Vitals対応
    custom_map: {
      metric_1: metric,
      metric_2: value,
    },
  });
};

// エラートラッキング（Sentryと連携）
export const trackError = (error: Error, context?: any) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', 'exception', {
    description: error.message,
    fatal: false,
    // エラーコンテキスト
    error_type: error.name,
    error_context: context?.page,
    user_action: context?.action,
  });
};

// A/Bテスト対応
export const trackExperiment = (experimentId: string, variant: string) => {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return;

  window.gtag('event', 'ab_test_impression', {
    event_category: 'Experiments',
    experiment_id: experimentId,
    variant_id: variant,
  });
};

// 型定義
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'consent',
      targetId: string,
      config?: any
    ) => void;
  }
}