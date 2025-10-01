/**
 * データプライバシー管理
 * GDPR・CCPA対応
 */

// データ削除リクエスト
export const requestDataDeletion = async (userId: string, email: string) => {
  // 1. GA4データの削除申請
  const deletionRequest = {
    userId,
    email,
    timestamp: new Date().toISOString(),
    source: 'user_request',
  };

  // 2. ログに記録（GDPR対応のため）
  console.log('🗑️ Data deletion requested:', deletionRequest);

  // 3. 実際の削除処理（本番環境では適切なAPIを呼び出し）
  try {
    // Google Analytics Data API を使用してユーザーデータ削除申請
    // await googleAnalyticsDataDeletion(userId);

    return { success: true, requestId: `del_${Date.now()}` };
  } catch (error) {
    console.error('Data deletion failed:', error);
    return { success: false, error: error.message };
  }
};

// 同意撤回処理
export const revokeConsent = () => {
  if (typeof window === 'undefined') return;

  // 1. ローカルストレージから同意情報を削除
  localStorage.removeItem('cookie-consent');

  // 2. GA4の同意を拒否に変更
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
    });
  }

  // 3. 既存のCookieを削除
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

    // GA関連Cookieの削除
    if (name.startsWith('_ga') || name.startsWith('_gid')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    }
  });

  console.log('🔒 User consent revoked and data cleared');
};

// データポータビリティ（データエクスポート）
export const exportUserData = async (userId: string) => {
  // ユーザーのデータを収集してエクスポート
  const userData = {
    userId,
    exportDate: new Date().toISOString(),
    analyticsData: {
      // 実際の実装では、GA4 Reporting APIを使用
      note: 'Analytics data export requires GA4 Reporting API implementation',
    },
    consentHistory: localStorage.getItem('cookie-consent'),
    preferences: {
      // ユーザー設定データ
    },
  };

  // JSON形式でダウンロード
  const dataBlob = new Blob([JSON.stringify(userData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user_data_export_${userId}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('📥 User data exported');
};

// データ処理の法的根拠
export const LEGAL_BASIS = {
  ANALYTICS: 'legitimate_interest', // 正当な利益
  FUNCTIONAL: 'necessary', // 必要不可欠
  MARKETING: 'consent', // 同意
} as const;

// データ保持期間設定
export const DATA_RETENTION = {
  ANALYTICS: 14 * 30 * 24 * 60 * 60 * 1000, // 14ヶ月（ミリ秒）
  CONSENT_RECORDS: 3 * 365 * 24 * 60 * 60 * 1000, // 3年
  SESSION: 0, // セッション終了まで
} as const;

// プライバシー設定の取得
export const getPrivacySettings = () => {
  if (typeof window === 'undefined') return null;

  return {
    cookieConsent: localStorage.getItem('cookie-consent'),
    analyticsEnabled: localStorage.getItem('cookie-consent') === 'accepted',
    consentTimestamp: localStorage.getItem('consent-timestamp'),
    lastUpdated: localStorage.getItem('privacy-settings-updated'),
  };
};

// プライバシー設定の更新
export const updatePrivacySettings = (settings: any) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem('privacy-settings-updated', new Date().toISOString());

  if (settings.analyticsEnabled !== undefined) {
    setCookieConsent(settings.analyticsEnabled);
  }
};

// Cookie同意の設定（再利用）
const setCookieConsent = (accepted: boolean) => {
  localStorage.setItem('cookie-consent', accepted ? 'accepted' : 'declined');
  localStorage.setItem('consent-timestamp', new Date().toISOString());

  if (accepted) {
    // Analytics有効化
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  } else {
    revokeConsent();
  }
};