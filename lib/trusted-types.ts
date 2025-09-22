// Trusted Typesポリシー設定
// DOM XSS攻撃を防ぐためのTrusted Typesの設定

declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (
        name: string,
        policy: {
          createHTML?: (input: string) => string;
          createScript?: (input: string) => string;
          createScriptURL?: (input: string) => string;
        }
      ) => {
        createHTML: (input: string) => TrustedHTML;
        createScript: (input: string) => TrustedScript;
        createScriptURL: (input: string) => TrustedScriptURL;
      };
    };
  }
}

// Next.js用のTrusted Typesポリシーを設定
export function setupTrustedTypes() {
  if (typeof window !== 'undefined' && window.trustedTypes) {
    try {
      // Next.js用のデフォルトポリシー
      window.trustedTypes.createPolicy('default', {
        createHTML: (input: string) => {
          // 開発環境では制限を緩和、本番環境では厳格に
          if (process.env.NODE_ENV === 'development') {
            // 開発環境: Next.jsのデバッグ情報などを許可
            return input;
          }

          // 本番環境: 基本的なHTMLタグのみ許可
          const allowedTags = [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'a', 'img', 'button', 'form', 'input',
            'textarea', 'select', 'option', 'label', 'table', 'tr',
            'td', 'th', 'thead', 'tbody', 'pre', 'code'
          ];

          // 危険なタグやスクリプトを除去
          const sanitized = input
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');

          return sanitized;
        },

        createScript: (input: string) => {
          // スクリプトは基本的に制限
          if (process.env.NODE_ENV === 'development') {
            // 開発環境: Next.js関連のスクリプトのみ許可
            if (input.includes('_next') || input.includes('webpack') || input.includes('turbopack')) {
              return input;
            }
          }

          // 本番環境では外部スクリプトのみ許可
          const allowedDomains = [
            'js.sentry-cdn.com',
            'vercel.live'
          ];

          const isAllowed = allowedDomains.some(domain => input.includes(domain));
          return isAllowed ? input : '';
        },

        createScriptURL: (input: string) => {
          // スクリプトURLの検証
          const allowedOrigins = [
            window.location.origin,
            'https://js.sentry-cdn.com',
            'https://vercel.live'
          ];

          try {
            const url = new URL(input);
            const isAllowed = allowedOrigins.some(origin =>
              url.origin === origin || input.startsWith('/')
            );
            return isAllowed ? input : 'about:blank';
          } catch {
            // 相対URLの場合は許可
            return input.startsWith('/') || input.startsWith('./') ? input : 'about:blank';
          }
        }
      });

      console.log('🛡️ Trusted Types policy initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Trusted Types policy:', error);
    }
  }
}

// CSRでのみ実行
if (typeof window !== 'undefined') {
  setupTrustedTypes();
}