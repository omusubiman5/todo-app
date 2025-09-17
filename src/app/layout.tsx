import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import { SWRProvider } from '@/providers/SWRProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSentryMonitoring } from '@/hooks/useSentryMonitoring';

const inter = Inter({ subsets: ['latin'] });

function AppMonitoring({ children }: { children: React.ReactNode }) {
  useSentryMonitoring();
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <SWRProvider>
              <AppMonitoring>
                {children}
              </AppMonitoring>
            </SWRProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}