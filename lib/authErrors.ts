/**
 * Secure Authentication Error Handling
 * Safe error messages without sensitive information exposure
 */

export interface AuthError {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userMessage: string;
  action?: string;
}

export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  ACCOUNT_LOCKED: 'account_locked',
  
  // Session errors
  SESSION_EXPIRED: 'session_expired',
  INVALID_SESSION: 'invalid_session',
  
  // Network/Service errors
  NETWORK_ERROR: 'network_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  
  // Validation errors
  INVALID_EMAIL: 'invalid_email',
  WEAK_PASSWORD: 'weak_password',
  PASSWORD_MISMATCH: 'password_mismatch',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Generic
  UNKNOWN_ERROR: 'unknown_error'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

/**
 * Map Supabase errors to safe user messages
 */
export function mapSupabaseError(error: any): AuthError {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      code: AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
      message: 'Rate limit exceeded',
      severity: 'warning',
      userMessage: 'ログイン試行回数が制限を超えました。しばらく時間をおいてから再度お試しください。',
      action: 'wait_and_retry'
    };
  }
  
  // Invalid credentials
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('email not confirmed') ||
      errorMessage.includes('invalid user')) {
    return {
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
      severity: 'error',
      userMessage: 'メールアドレスまたはパスワードが正しくありません。',
      action: 'retry_login'
    };
  }
  
  // Email not confirmed
  if (errorMessage.includes('email not confirmed')) {
    return {
      code: AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED,
      message: 'Email not confirmed',
      severity: 'warning',
      userMessage: 'メールアドレスが確認されていません。確認メールをご確認ください。',
      action: 'check_email'
    };
  }
  
  // Network errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
    return {
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
      message: 'Network error',
      severity: 'warning',
      userMessage: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      action: 'check_connection'
    };
  }
  
  // Service unavailable
  if (errorMessage.includes('service unavailable') ||
      errorMessage.includes('server error') ||
      errorMessage.includes('internal error')) {
    return {
      code: AUTH_ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'Service temporarily unavailable',
      severity: 'error',
      userMessage: 'サービスが一時的に利用できません。しばらくしてから再度お試しください。',
      action: 'retry_later'
    };
  }
  
  // Session errors
  if (errorMessage.includes('session') || errorMessage.includes('token')) {
    return {
      code: AUTH_ERROR_CODES.SESSION_EXPIRED,
      message: 'Session expired',
      severity: 'info',
      userMessage: 'セッションが期限切れです。再度ログインしてください。',
      action: 'relogin'
    };
  }
  
  // Default unknown error
  return {
    code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
    message: 'Unknown authentication error',
    severity: 'error',
    userMessage: '認証エラーが発生しました。問題が続く場合はサポートにお問い合わせください。',
    action: 'contact_support'
  };
}

/**
 * Client-side input validation
 */
export const validateAuthInput = {
  email: (email: string): { isValid: boolean; error?: AuthError } => {
    if (!email || email.trim().length === 0) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.INVALID_EMAIL,
          message: 'Email is required',
          severity: 'error',
          userMessage: 'メールアドレスを入力してください。'
        }
      };
    }
    
    // Security: Check for malicious patterns first
    const maliciousPatterns = [
      /<script|javascript:|DROP\s+TABLE|SELECT\s+\*|\.\.\/|<\/|&lt;|&gt;/i,
      /\$\{[^}]*\}/, // Template injection
      /eval\s*\(|setTimeout\s*\(|setInterval\s*\(/i,
      /<img|<iframe|<object|<embed/i
    ];
    
    if (maliciousPatterns.some(pattern => pattern.test(email))) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.INVALID_EMAIL,
          message: 'Invalid email format',
          severity: 'error',
          userMessage: '有効なメールアドレスを入力してください。'
        }
      };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.INVALID_EMAIL,
          message: 'Invalid email format',
          severity: 'error',
          userMessage: '有効なメールアドレスを入力してください。'
        }
      };
    }
    
    // Additional security: prevent email enumeration
    if (email.length > 254) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.INVALID_EMAIL,
          message: 'Email too long',
          severity: 'error',
          userMessage: 'メールアドレスが長すぎます。'
        }
      };
    }
    
    return { isValid: true };
  },
  
  password: (password: string): { isValid: boolean; error?: AuthError } => {
    if (!password || password.trim().length === 0) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.WEAK_PASSWORD,
          message: 'Password is required',
          severity: 'error',
          userMessage: 'パスワードを入力してください。'
        }
      };
    }
    
    if (password.length < 8) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.WEAK_PASSWORD,
          message: 'Password too short',
          severity: 'error',
          userMessage: 'パスワードは8文字以上で入力してください。'
        }
      };
    }
    
    if (password.length > 128) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.WEAK_PASSWORD,
          message: 'Password too long',
          severity: 'error',
          userMessage: 'パスワードが長すぎます。'
        }
      };
    }
    
    // Security: Check for malicious patterns
    const maliciousPatterns = [
      /<script|javascript:|DROP\s+TABLE|SELECT\s+\*|\.\.\/|<\/|&lt;|&gt;/i,
      /\$\{[^}]*\}/, // Template injection
      /eval\s*\(|setTimeout\s*\(|setInterval\s*\(/i,
      /<img|<iframe|<object|<embed/i
    ];
    
    if (maliciousPatterns.some(pattern => pattern.test(password))) {
      return {
        isValid: false,
        error: {
          code: AUTH_ERROR_CODES.WEAK_PASSWORD,
          message: 'Invalid password format',
          severity: 'error',
          userMessage: 'パスワードに無効な文字が含まれています。'
        }
      };
    }
    
    return { isValid: true };
  }
};

/**
 * Security monitoring for authentication attempts
 */
export class AuthSecurityMonitor {
  private static instance: AuthSecurityMonitor;
  private attemptLog: Map<string, number> = new Map();
  private lockoutLog: Map<string, number> = new Map();
  
  static getInstance(): AuthSecurityMonitor {
    if (!AuthSecurityMonitor.instance) {
      AuthSecurityMonitor.instance = new AuthSecurityMonitor();
    }
    return AuthSecurityMonitor.instance;
  }
  
  /**
   * Check if IP/email is rate limited
   */
  checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const attempts = this.attemptLog.get(identifier) || 0;
    const lockoutTime = this.lockoutLog.get(identifier);
    
    // Check if currently locked out
    if (lockoutTime && Date.now() < lockoutTime) {
      return {
        allowed: false,
        retryAfter: Math.ceil((lockoutTime - Date.now()) / 1000)
      };
    }
    
    // Allow if under limit
    if (attempts < 5) {
      return { allowed: true };
    }
    
    // Rate limited
    return { allowed: false, retryAfter: 300 }; // 5 minutes
  }
  
  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(identifier: string): void {
    const attempts = (this.attemptLog.get(identifier) || 0) + 1;
    this.attemptLog.set(identifier, attempts);
    
    // Lock out after 5 attempts
    if (attempts >= 5) {
      this.lockoutLog.set(identifier, Date.now() + (5 * 60 * 1000)); // 5 minutes
    }
    
    // Clean up old entries (prevent memory leak)
    setTimeout(() => {
      this.attemptLog.delete(identifier);
      this.lockoutLog.delete(identifier);
    }, 15 * 60 * 1000); // 15 minutes
  }
  
  /**
   * Record successful authentication (reset counters)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.attemptLog.delete(identifier);
    this.lockoutLog.delete(identifier);
  }
}

/**
 * Secure logging (no sensitive data)
 */
export function logAuthEvent(
  event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout',
  details: {
    userId?: string;
    email?: string;
    errorCode?: string;
    userAgent?: string;
    ip?: string;
  }
): void {
  // In production, integrate with your logging service
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    userId: details.userId,
    // Hash email for privacy (don't log raw email)
    emailHash: details.email ? hashString(details.email) : undefined,
    errorCode: details.errorCode,
    userAgent: details.userAgent?.substring(0, 100), // Truncate
    // Don't log actual IP, just first 2 octets for general location
    ipPrefix: details.ip?.split('.').slice(0, 2).join('.') + '.x.x'
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth Event:', logData);
  }
  
  // TODO: Send to logging service in production
}

/**
 * Simple hash function for privacy-preserving logging
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}