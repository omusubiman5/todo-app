import type { Metadata, Viewport } from 'next';
import { Inter, Roboto, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { WorkspaceProvider } from '@/components/WorkspaceProvider';

// 🚀 フォント最適化設定

// 1. メインフォント（英語・数字）- 高頻度使用
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // フォント読み込み中も文字を表示
  weight: ['400', '500', '600', '700'], // 必要な重みのみ
  variable: '--font-inter',
  preload: true, // 重要なフォントは事前読み込み
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'sans-serif'
  ]
});

// 2. 日本語フォント - 必要時のみ読み込み
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'], // 軽量化
  variable: '--font-noto-sans-jp',
  preload: false, // 日本語フォントは遅延読み込み
  fallback: [
    'Hiragino Kaku Gothic ProN',
    'Hiragino Sans',
    'Yu Gothic Medium',
    'Meiryo',
    'sans-serif'
  ]
});

// 3. 数字専用フォント（統計画面用）
const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-roboto-mono',
  preload: false, // オンデマンド読み込み
});

// 🚀 メタデータ最適化
export const metadata: Metadata = {
  title: {
    template: '%s | Todo App',
    default: 'Todo App - 効率的なタスク管理'
  },
  description: '高速で使いやすいタスク管理アプリ。チーム協業とパフォーマンス最適化を実現。',
  keywords: ['タスク管理', 'Todo', '効率化', 'チーム協業', '高速'],
  authors: [{ name: 'Todo App Team' }],
  creator: 'Todo App',
  publisher: 'Todo App',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // 🚀 Open Graph最適化
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://your-todo-app.com',
    title: 'Todo App - 効率的なタスク管理',
    description: '高速で使いやすいタスク管理アプリ',
    siteName: 'Todo App',
  },

  // 🚀 Twitter Card最適化
  twitter: {
    card: 'summary_large_image',
    title: 'Todo App - 効率的なタスク管理',
    description: '高速で使いやすいタスク管理アプリ',
    creator: '@your_todo_app',
  },

  // 🚀 フォント関連のプリロード
  other: {
    'font-display': 'swap',
  }
};

// 🚀 ビューポート最適化
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
};

// 🚀 フォント読み込み戦略コンポーネント
function FontOptimizer({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 🚀 重要なフォントの事前読み込み */}
      <link
        rel="preload"
        href="/_next/static/media/inter-latin-400-normal.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/_next/static/media/inter-latin-500-normal.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />

      {/* 🚀 フォント表示の最適化 */}
      <style jsx global>{`
        /* フォント読み込み中のレイアウトシフト防止 */
        html {
          font-family: ${inter.style.fontFamily}, system-ui, sans-serif;
        }

        /* フォント読み込み中も文字を表示 */
        .font-loading {
          font-display: swap;
          visibility: visible;
        }

        /* 日本語フォントは必要時のみ適用 */
        .japanese-text {
          font-family: ${notoSansJP.style.fontFamily}, ${inter.style.fontFamily}, sans-serif;
        }

        /* 数字専用スタイル */
        .numeric-text {
          font-family: ${roboto.style.fontFamily}, 'Courier New', monospace;
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJP.variable} ${roboto.variable}`}
    >
      <head>
        {/* 🚀 重要なリソースの事前読み込み */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* 🚀 フォント最適化のCSS */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical font styles */
            @font-face {
              font-family: 'Inter Fallback';
              src: local('Arial'), local('Helvetica'), local('sans-serif');
              font-display: swap;
              ascent-override: 90.20%;
              descent-override: 22.48%;
              line-gap-override: 0.00%;
              size-adjust: 107.40%;
            }

            /* フォント読み込み最適化 */
            .font-inter { font-family: var(--font-inter), 'Inter Fallback', system-ui, sans-serif; }
            .font-noto-sans-jp { font-family: var(--font-noto-sans-jp), system-ui, sans-serif; }
            .font-roboto-mono { font-family: var(--font-roboto-mono), 'Courier New', monospace; }

            /* レイアウトシフト防止 */
            body { font-family: var(--font-inter), system-ui, sans-serif; }
          `
        }} />
      </head>

      <body className="font-inter antialiased">
        <FontOptimizer>
          <AuthProvider>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <main className="font-loading">
                  {children}
                </main>
              </div>
            </WorkspaceProvider>
          </AuthProvider>
        </FontOptimizer>
      </body>
    </html>
  );
}