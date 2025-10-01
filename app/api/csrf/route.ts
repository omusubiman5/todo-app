import { NextRequest, NextResponse } from 'next/server';
import { securityManager } from '@/lib/security/securityManager';

// 🚀 Phase 3 Stage 3: CSRFトークン取得API

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = (request as NextRequest & { ip?: string }).ip || request.headers.get('x-forwarded-for') || undefined;
    
    // 新しいCSRFトークンを生成
    const token = securityManager.generateCSRFToken(userAgent, ip);
    
    return NextResponse.json({ 
      token,
      expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分後
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }
    
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = (request as NextRequest & { ip?: string }).ip || request.headers.get('x-forwarded-for') || undefined;
    
    // トークンの検証
    const isValid = securityManager.validateCSRFToken(token, userAgent, ip);
    
    return NextResponse.json({ 
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Token is invalid or expired'
    });
  } catch (error) {
    console.error('CSRF token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate CSRF token' },
      { status: 500 }
    );
  }
}