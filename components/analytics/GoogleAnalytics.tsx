'use client';

import Script from 'next/script';
import { GA_MEASUREMENT_ID, initGA } from '@/lib/analytics';

export function GoogleAnalytics() {
  // 開発環境またはGA_MEASUREMENT_IDが未設定の場合はスキップ
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    return null;
  }

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // プライバシー設定：デフォルトで同意を拒否
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              functionality_storage: 'denied',
              personalization_storage: 'denied',
              security_storage: 'granted', // セキュリティ関連は許可
              wait_for_update: 2000, // 2秒待機
            });

            gtag('js', new Date());

            // 初期化は analytics.ts で制御
            window.gtag = gtag;
          `,
        }}
      />
    </>
  );
}