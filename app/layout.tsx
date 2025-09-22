import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata = {
  title: 'タスク管理アプリ',
  description: '効率的なタスク管理とチーム共同作業のためのアプリケーション',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: false,
    follow: false,
  },
};

// Trusted Types初期化用のスクリプト
const trustedTypesScript = `
(function() {
  if (typeof window !== 'undefined' && window.trustedTypes && !window.trustedTypes.defaultPolicy) {
    try {
      const policy = window.trustedTypes.createPolicy('default', {
        createHTML: function(input) {
          // 開発環境では全て許可、本番環境では制限
          if (${process.env.NODE_ENV === 'development'}) {
            return input;
          }

          // 本番環境での安全化処理
          return input
            .replace(/<script[\\s\\S]*?<\\/script>/gi, '')
            .replace(/<iframe[\\s\\S]*?<\\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\\w+\\s*=/gi, '');
        },

        createScript: function(input) {
          // 開発環境でのNext.js関連スクリプトを許可
          if (${process.env.NODE_ENV === 'development'}) {
            if (input.includes('_next') ||
                input.includes('webpack') ||
                input.includes('turbopack') ||
                input.includes('__nextjs') ||
                input.includes('hot-reload') ||
                input.includes('react-refresh') ||
                /window\\.__/.test(input)) {
              return input;
            }
          }

          // 許可されたドメインからのスクリプト
          const allowedDomains = [
            'js.sentry-cdn.com',
            'vercel.live'
          ];

          const isAllowed = allowedDomains.some(domain => input.includes(domain));
          return isAllowed ? input : '';
        },

        createScriptURL: function(input) {
          const allowedOrigins = [
            location.origin,
            'https://js.sentry-cdn.com',
            'https://vercel.live'
          ];

          try {
            const url = new URL(input);
            const isAllowed = allowedOrigins.some(origin => url.origin === origin);
            return isAllowed ? input : 'about:blank';
          } catch {
            // 相対URLは許可
            return input.startsWith('/') || input.startsWith('./') ? input : 'about:blank';
          }
        }
      });

      console.log('🛡️ Trusted Types policy initialized');

      // Next.jsのための追加ポリシー
      if (!window.trustedTypes.getPolicyNames().includes('nextjs')) {
        window.trustedTypes.createPolicy('nextjs', {
          createHTML: function(input) {
            return policy.createHTML(input);
          },
          createScript: function(input) {
            return policy.createScript(input);
          },
          createScriptURL: function(input) {
            return policy.createScriptURL(input);
          }
        });
      }

    } catch (error) {
      console.warn('⚠️ Trusted Types policy setup failed:', error);
    }
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = process.env.NODE_ENV === 'development' ? 'development' : '';

  return (
    <html lang="ja" className={inter.className}>
      <head>
        {/* 🛡️ Trusted Types初期化を最優先で実行 */}
        <Script
          id="trusted-types-init"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: trustedTypesScript
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}