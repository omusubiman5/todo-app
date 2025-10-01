import { createClient } from '@supabase/supabase-js';

// セキュリティサービス - パスワードリセット強化
export class SecurityService {
  private supabase;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * セキュアなパスワードリセット
   * ユーザー存在を漏洩しない実装
   */
  async securePasswordReset(email: string, clientIP?: string): Promise<{
    success: boolean;
    message: string;
    rateLimited?: boolean;
  }> {
    try {
      // 1. レート制限チェック
      const rateLimitResult = this.checkRateLimit(email, clientIP);
      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent({
          event: 'password_reset_rate_limited',
          email: this.hashEmail(email),
          ip: clientIP,
          timestamp: new Date().toISOString(),
        });
        
        return {
          success: false,
          message: 'リセット要求が多すぎます。しばらく待ってから再試行してください。',
          rateLimited: true
        };
      }

      // 2. リダイレクトURL検証
      const redirectTo = this.getSecureRedirectURL();
      
      // 3. パスワードリセット実行
      let resetSuccess = false;
      let errorDetails = '';
      
      try {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        
        if (error) {
          errorDetails = error.message;
          // エラーの種類を内部で判定するが、ユーザーには漏洩しない
          if (error.message.includes('User not found')) {
            resetSuccess = false; // ユーザー不存在
          } else if (error.message.includes('rate limit')) {
            resetSuccess = false; // レート制限
          } else {
            resetSuccess = false; // その他エラー
          }
        } else {
          resetSuccess = true; // リセット成功
        }
      } catch (e) {
        errorDetails = (e as Error).message;
        resetSuccess = false;
      }

      // 4. セキュリティログ記録
      await this.logSecurityEvent({
        event: 'password_reset_attempt',
        email: this.hashEmail(email),
        ip: clientIP,
        success: resetSuccess,
        errorDetails: resetSuccess ? undefined : errorDetails,
        timestamp: new Date().toISOString(),
      });

      // 5. 正規化されたレスポンス（常に同じメッセージ）
      return {
        success: true, // UI上は常に成功
        message: 'リセット用のメールを送信しました。該当するアカウントがある場合、メールをご確認ください。',
      };

    } catch (error) {
      // 予期しないエラーもログに記録
      await this.logSecurityEvent({
        event: 'password_reset_system_error',
        email: this.hashEmail(email),
        ip: clientIP,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });

      // ユーザーには一般的なエラーメッセージのみ
      return {
        success: false,
        message: 'システムエラーが発生しました。しばらく待ってから再試行してください。',
      };
    }
  }

  /**
   * レート制限チェック
   */
  private checkRateLimit(email: string, clientIP?: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15分
    const maxAttempts = 3;
    
    // メールアドレスとIPアドレスの両方でチェック
    const keys = [email];
    if (clientIP) {
      keys.push(clientIP);
    }
    
    for (const key of keys) {
      const record = this.rateLimitMap.get(key);
      
      if (record) {
        if (now < record.resetTime) {
          // 制限時間内
          if (record.count >= maxAttempts) {
            return { allowed: false, resetTime: record.resetTime };
          }
          record.count++;
        } else {
          // 制限時間経過、リセット
          record.count = 1;
          record.resetTime = now + windowMs;
        }
      } else {
        // 新規記録
        this.rateLimitMap.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
      }
    }
    
    return { allowed: true };
  }

  /**
   * セキュアなリダイレクトURL生成
   */
  private getSecureRedirectURL(): string {
    const allowedDomains = [
      'localhost:3000',
      'localhost:3001',
      // 本番環境のドメインを追加
    ];
    
    const currentDomain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    
    if (allowedDomains.includes(currentDomain)) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${currentDomain}/reset-password`;
    }
    
    // デフォルトの安全なURL
    return 'http://localhost:3000/reset-password';
  }

  /**
   * メールアドレスのハッシュ化（ログ用）
   */
  private hashEmail(email: string): string {
    // 簡易ハッシュ（実際にはより強力なハッシュを推奨）
    const parts = email.split('@');
    if (parts.length === 2) {
      const localPart = parts[0].length > 2 ? 
        parts[0].substring(0, 2) + '*'.repeat(parts[0].length - 2) : 
        '*'.repeat(parts[0].length);
      return `${localPart}@${parts[1]}`;
    }
    return '***@***.***';
  }

  /**
   * セキュリティイベントログ
   */
  private async logSecurityEvent(event: {
    event: string;
    email: string;
    ip?: string;
    success?: boolean;
    errorDetails?: string;
    error?: string;
    timestamp: string;
  }): Promise<void> {
    try {
      // ローカルストレージまたはAPIエンドポイントに記録
      if (typeof window !== 'undefined') {
        const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        logs.push(event);
        
        // 最新100件のみ保持
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('security_logs', JSON.stringify(logs));
      }
      
      // 本番環境では専用のログサービスに送信
      if (process.env.NODE_ENV === 'production') {
        // await sendToLogService(event);
        console.log('Security Event:', event);
      } else {
        console.log('Security Event:', event);
      }
      
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * セキュリティログの取得（管理者用）
   */
  getSecurityLogs(): Array<{
    event: string;
    email: string;
    ip?: string;
    success?: boolean;
    errorDetails?: string;
    error?: string;
    timestamp: string;
  }> {
    try {
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('security_logs') || '[]');
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * レート制限情報のクリア（テスト用）
   */
  clearRateLimit(key: string): void {
    this.rateLimitMap.delete(key);
  }

  /**
   * 現在のレート制限状態取得
   */
  getRateLimitStatus(email: string, clientIP?: string): { 
    email: { count: number; remaining: number; resetTime: number } | null;
    ip: { count: number; remaining: number; resetTime: number } | null;
  } {
    const emailRecord = this.rateLimitMap.get(email);
    const ipRecord = clientIP ? this.rateLimitMap.get(clientIP) : null;
    
    const formatRecord = (record: { count: number; resetTime: number } | undefined) => record ? {
      count: record.count,
      remaining: Math.max(0, 3 - record.count),
      resetTime: record.resetTime,
    } : null;
    
    return {
      email: formatRecord(emailRecord),
      ip: formatRecord(ipRecord),
    };
  }
}

// シングルトンインスタンス
export const securityService = new SecurityService();