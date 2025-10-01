import { NextRequest, NextResponse } from 'next/server';
import { securityManager } from '@/lib/security/securityManager';

// 🚀 Phase 3 Stage 3: セキュリティミドルウェア（完全版）

export async function middleware(request: NextRequest) {
  try {
    // セキュリティマネージャーを使用した包括的なセキュリティ処理
    const response = NextResponse.next();

    // セキュリティヘッダーの追加
    const securityHeaders = securityManager.generateSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate Limiting
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = securityManager.checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'リクエスト制限を超過しました' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Rate Limit ヘッダーの追加
    response.headers.set('X-RateLimit-Limit', '1000');
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // エラー時は基本的なセキュリティヘッダーのみ適用
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
  }
}

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: [
    // API routes
    '/api/:path*',
    // App pages (but not static files)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};