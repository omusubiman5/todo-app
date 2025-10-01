"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <head>
        <title>エラーが発生しました</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: 0,
        padding: '2rem',
        backgroundColor: '#f9fafb',
        color: '#111827'
      }}>
        <div style={{
          maxWidth: '32rem',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#dc2626'
          }}>
            🚨 アプリケーションエラー
          </h1>
          <p style={{
            fontSize: '1rem',
            marginBottom: '1.5rem',
            color: '#6b7280'
          }}>
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <h2 style={{
              fontSize: '0.875rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#991b1b'
            }}>
              エラー詳細:
            </h2>
            <pre style={{
              fontSize: '0.75rem',
              fontFamily: 'ui-monospace, monospace',
              color: '#7f1d1d',
              overflow: 'auto',
              maxHeight: '6rem'
            }}>
              {error.message || 'Unknown error occurred'}
            </pre>
            {error.digest && (
              <p style={{
                fontSize: '0.75rem',
                color: '#991b1b',
                marginTop: '0.5rem'
              }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              marginRight: '0.75rem'
            }}
          >
            ページを再読み込み
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            前のページに戻る
          </button>
        </div>
      </body>
    </html>
  );
}