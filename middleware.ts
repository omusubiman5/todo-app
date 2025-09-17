import { NextRequest, NextResponse } from 'next/server';

// 🚀 Phase 3 Stage 3: セキュリティミドルウェア (簡略版)
// TODO: securityManagerの問題修正後に完全版を有効化

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 基本的なセキュリティヘッダーの追加
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// TODO: handleAPIRequest関数は後でセキュリティマネージャー修正後に復活

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: [
    // API routes
    '/api/:path*',
    // App pages (but not static files)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};