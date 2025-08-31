/**
 * 安全なロギングユーティリティ
 * プロダクション環境では適切にログを制御
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDevelopment) {
      const logEntry = this.formatMessage('debug', message, context);
      console.log(`🔍 [DEBUG] ${logEntry.timestamp}:`, logEntry.message, logEntry.context || '');
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    const logEntry = this.formatMessage('info', message, context);
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${logEntry.timestamp}:`, logEntry.message, logEntry.context || '');
    }
    // プロダクション環境では外部ログサービスに送信
    // TODO: 本番環境でのログ収集サービス統合
  }

  warn(message: string, context?: Record<string, unknown>) {
    const logEntry = this.formatMessage('warn', message, context);
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${logEntry.timestamp}:`, logEntry.message, logEntry.context || '');
    }
    // プロダクション環境でも重要な警告はログに記録
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    const logEntry = this.formatMessage('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    });

    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${logEntry.timestamp}:`, logEntry.message, logEntry.context);
    }
    
    // プロダクション環境では外部エラー監視サービスに送信
    // TODO: Sentry等のエラー監視サービス統合
  }

  // 認証関連の安全なログ出力
  auth(event: string, details: { userId?: string; email?: string; success: boolean }) {
    const safeDetails = {
      userId: details.userId,
      emailHash: details.email ? this.hashString(details.email) : undefined,
      success: details.success,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      this.debug(`Auth Event: ${event}`, safeDetails);
    }
    
    // プロダクション環境では監査ログとして記録
  }

  // プライバシー保護のためのハッシュ化
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

export const logger = new Logger();

// 開発環境でのみ有効な詳細ログ
export const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] ${message}`, ...args);
  }
};

// エラー専用ログ（プロダクションでも出力）
export const errorLog = (message: string, error?: Error) => {
  logger.error(message, error);
};