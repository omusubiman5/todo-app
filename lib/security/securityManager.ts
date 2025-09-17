import { NextRequest, NextResponse } from 'next/server';
// Edge Runtime対応のCrypto API
const getCrypto = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  throw new Error('Web Crypto API not available');
};

// 🚀 Phase 3 Stage 3: セキュリティ強化システム

interface SecurityConfig {
  csrfProtection: boolean;
  xssProtection: boolean;
  contentTypeValidation: boolean;
  rateLimiting: boolean;
  inputSanitization: boolean;
}

interface CSRFTokenData {
  token: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

interface RateLimitData {
  requests: number;
  resetTime: number;
  blocked: boolean;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private csrfTokens: Map<string, CSRFTokenData> = new Map();
  private rateLimitData: Map<string, RateLimitData> = new Map();
  private config: SecurityConfig;

  private constructor() {
    this.config = {
      csrfProtection: true,
      xssProtection: true,
      contentTypeValidation: true,
      rateLimiting: true,
      inputSanitization: true,
    };
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // CSRF トークン生成
  public generateCSRFToken(userAgent?: string, ip?: string): string {
    // Web Crypto API使用でEdge Runtime対応
    const crypto = getCrypto();
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const tokenData: CSRFTokenData = {
      token,
      timestamp: Date.now(),
      userAgent,
      ip,
    };
    
    this.csrfTokens.set(token, tokenData);
    
    // 古いトークンを定期的にクリーンアップ（30分）
    this.cleanupExpiredTokens();
    
    return token;
  }

  // CSRF トークン検証
  public validateCSRFToken(
    token: string, 
    userAgent?: string, 
    ip?: string
  ): boolean {
    if (!this.config.csrfProtection) return true;
    
    const tokenData = this.csrfTokens.get(token);
    if (!tokenData) return false;

    // トークンの有効期限チェック（30分）
    const isExpired = Date.now() - tokenData.timestamp > 30 * 60 * 1000;
    if (isExpired) {
      this.csrfTokens.delete(token);
      return false;
    }

    // User-Agent検証（オプション）
    if (tokenData.userAgent && userAgent && tokenData.userAgent !== userAgent) {
      return false;
    }

    // IP検証（オプション、開発環境では無効）
    if (process.env.NODE_ENV === 'production' && tokenData.ip && ip && tokenData.ip !== ip) {
      return false;
    }

    return true;
  }

  // 期限切れCSRFトークンのクリーンアップ
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.csrfTokens.entries()) {
      if (now - data.timestamp > 30 * 60 * 1000) {
        this.csrfTokens.delete(token);
      }
    }
  }

  // XSS防御：HTML エスケープ
  public escapeHtml(unsafe: string): string {
    if (!this.config.xssProtection) return unsafe;
    
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }

  // XSS防御：JavaScript危険文字列検出
  public detectXSS(input: string): boolean {
    if (!this.config.xssProtection) return false;
    
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /<img[\s\S]*?onerror[\s\S]*?>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*javascript/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /<form[\s\S]*?>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // 入力サニタイゼーション
  public sanitizeInput(input: string): string {
    if (!this.config.inputSanitization) return input;
    
    // 基本的なサニタイゼーション
    let sanitized = input.trim();
    
    // 制御文字の除去
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 連続する空白の正規化
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // HTMLタグの除去（基本的なもの）
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // SQLインジェクション対策の基本文字列
    const sqlPatterns = [
      /['`;|*%]/gi,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        // 疑わしいパターンが見つかった場合、ログに記録
        console.warn('Potential SQL injection attempt detected:', {
          input: input.substring(0, 100) + '...',
          pattern: pattern.source,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
    
    return sanitized;
  }

  // Rate Limiting
  public checkRateLimit(
    identifier: string, 
    limit: number = 100, 
    windowMs: number = 15 * 60 * 1000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    if (!this.config.rateLimiting) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs };
    }
    
    const now = Date.now();
    let rateData = this.rateLimitData.get(identifier);
    
    // 新しいウィンドウまたは期限切れの場合
    if (!rateData || now > rateData.resetTime) {
      rateData = {
        requests: 1,
        resetTime: now + windowMs,
        blocked: false,
      };
      this.rateLimitData.set(identifier, rateData);
      return { allowed: true, remaining: limit - 1, resetTime: rateData.resetTime };
    }
    
    // リクエスト数増加
    rateData.requests++;
    
    if (rateData.requests > limit) {
      rateData.blocked = true;
      return { allowed: false, remaining: 0, resetTime: rateData.resetTime };
    }
    
    return { 
      allowed: true, 
      remaining: limit - rateData.requests, 
      resetTime: rateData.resetTime 
    };
  }

  // コンテンツタイプ検証
  public validateContentType(request: NextRequest, allowedTypes: string[]): boolean {
    if (!this.config.contentTypeValidation) return true;
    
    const contentType = request.headers.get('content-type');
    if (!contentType) return false;
    
    return allowedTypes.some(type => contentType.includes(type));
  }

  // セキュリティヘッダーの生成
  public generateSecurityHeaders(): Record<string, string> {
    return {
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Content Type Options
      'X-Content-Type-Options': 'nosniff',
      
      // Frame Options
      'X-Frame-Options': 'DENY',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Content Security Policy
      'Content-Security-Policy': this.generateCSP(),
      
      // Strict Transport Security (HTTPS only)
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
      }),
      
      // Permissions Policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    };
  }

  // Content Security Policy 生成
  private generateCSP(): string {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    
    return cspDirectives.join('; ');
  }

  // リクエスト検証ミドルウェア
  public createSecurityMiddleware() {
    return async (request: NextRequest) => {
      const response = NextResponse.next();
      
      // セキュリティヘッダーの追加
      const securityHeaders = this.generateSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Rate Limiting
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const rateLimit = this.checkRateLimit(ip);
      
      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too Many Requests' }),
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
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      return response;
    };
  }

  // セキュリティログ記録
  public logSecurityEvent(event: {
    type: 'csrf_violation' | 'xss_attempt' | 'rate_limit' | 'content_type_violation';
    details: Record<string, unknown>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userAgent?: string;
    ip?: string;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: 外部ログサービス統合
      console.warn('Security Event:', logEntry);
    } else {
      console.warn('Security Event:', logEntry);
    }
  }
}

// シングルトンインスタンス
export const securityManager = SecurityManager.getInstance();

// ユーティリティ関数
export function withCSRF<T extends Record<string, unknown>>(
  data: T,
  token?: string
): T & { _csrf: string } {
  const csrfToken = token || securityManager.generateCSRFToken();
  return { ...data, _csrf: csrfToken };
}

export function validateAndSanitize(input: string): {
  isValid: boolean;
  sanitized: string;
  hasXSS: boolean;
} {
  const hasXSS = securityManager.detectXSS(input);
  const sanitized = securityManager.sanitizeInput(input);
  
  return {
    isValid: !hasXSS,
    sanitized,
    hasXSS,
  };
}