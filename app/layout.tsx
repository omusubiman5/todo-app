import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { CSRFProtection } from "@/components/security/CSRFProtection";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { AnalyticsInitializer } from "@/components/AnalyticsInitializer";

// 🚀 フォント最適化：必要な文字とウェイトのみ読み込み
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"], // 必要なウェイトのみ
  display: "swap", // フォント読み込み中の表示最適化
  preload: true, // 優先読み込み
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"], // 必要なウェイトのみ
  display: "swap",
  preload: false, // メインフォントではないので後回し
});

// 🚀 Phase 3 Stage 3: SEO最適化メタデータ
export const metadata: Metadata = {
  title: "TodoApp - 効率的なタスク管理アプリ",
  description: "React 19とSupabaseで構築された高性能なタスク管理アプリ。チーム協業、リアルタイム同期、アクセシビリティ対応。",
  keywords: ["タスク管理", "todo", "プロジェクト管理", "チーム協業", "React", "Next.js"],
  authors: [{ name: "TodoApp Team" }],
  creator: "TodoApp",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://todo-app.example.com'),
  
  openGraph: {
    title: "TodoApp - 効率的なタスク管理",
    description: "チーム協業とリアルタイム同期に対応した次世代タスク管理アプリ",
    type: "website",
    locale: "ja_JP",
    siteName: "TodoApp",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "TodoApp - 効率的なタスク管理",
    description: "チーム協業とリアルタイム同期に対応した次世代タスク管理アプリ",
  },
  
  robots: {
    index: true,
    follow: true,
  },
  
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CSRFProtection>
          <QueryProvider>
            <AuthProvider requireAuth={false}>
              <WorkspaceProvider>
                {/* アナリティクス初期化 */}
                <AnalyticsInitializer />
                {children}
              </WorkspaceProvider>
            </AuthProvider>
          </QueryProvider>
        </CSRFProtection>

        {/* Cookie同意バナー */}
        <CookieConsent />
      </body>
    </html>
  );
}
