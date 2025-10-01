import { NextRequest, NextResponse } from 'next/server'
import { LoginAttemptService } from '../services/loginAttemptService'

export interface RateLimitResult {
  allowed: boolean
  blocked: boolean
  remaining?: number
  resetTime?: number
  message?: string
}

/**
 * 認証エンドポイント用のレート制限ミドルウェア
 */
export async function withAuthRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // IPアドレスを取得
    const ip = await getClientIPFromRequest(request)

    // ブロック状態をチェック
    const blockInfo = await LoginAttemptService.getBlockInfo(ip)

    if (blockInfo?.blocked) {
      const message = blockInfo.blockedUntil
        ? `IPアドレスが一時的にブロックされています。${blockInfo.remainingMinutes}分後に再試行してください。`
        : 'IPアドレスが永続的にブロックされています。管理者にお問い合わせください。'

      return NextResponse.json(
        {
          error: 'IP_BLOCKED',
          message,
          blockedUntil: blockInfo.blockedUntil,
          remainingMinutes: blockInfo.remainingMinutes
        },
        { status: 429 }
      )
    }

    // ハンドラーを実行
    return await handler(request)

  } catch (error) {
    console.error('Rate limiter error:', error)
    // エラー時はリクエストを通す（fail-open）
    return await handler(request)
  }
}

/**
 * 一般的なレート制限（API全般用）
 */
export async function withGeneralRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  maxRequests = 100,
  windowMinutes = 15
): Promise<NextResponse> {
  try {
    const ip = await getClientIPFromRequest(request)

    // 簡易的なメモリベースのレート制限
    // 本格的な実装では Redis などを使用することを推奨
    const rateLimitResult = await checkGeneralRateLimit(ip, maxRequests, windowMinutes)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエスト制限に達しました。しばらく時間をおいて再試行してください。',
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
            'X-RateLimit-Reset': (rateLimitResult.resetTime || Date.now()).toString()
          }
        }
      )
    }

    const response = await handler(request)

    // レート制限情報をヘッダーに追加
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (rateLimitResult.remaining || 0).toString())
    response.headers.set('X-RateLimit-Reset', (rateLimitResult.resetTime || Date.now()).toString())

    return response

  } catch (error) {
    console.error('General rate limiter error:', error)
    return await handler(request)
  }
}

/**
 * リクエストからIPアドレスを取得
 */
async function getClientIPFromRequest(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  let ip: string

  if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (cfConnectingIp) {
    ip = cfConnectingIp
  } else if (realIp) {
    ip = realIp
  } else {
    ip = '127.0.0.1'
  }

  // IPv6のlocalhost表記を正規化
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1'
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '')
  }

  return ip
}

// メモリベースの簡易レート制限（本番環境では Redis 推奨）
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * 一般的なレート制限チェック
 */
async function checkGeneralRateLimit(
  ip: string,
  maxRequests: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const key = `${ip}:general`

  // 期限切れのエントリをクリーンアップ
  for (const [k, v] of requestCounts.entries()) {
    if (v.resetTime < now) {
      requestCounts.delete(k)
    }
  }

  let entry = requestCounts.get(key)

  if (!entry || entry.resetTime < now) {
    // 新しいウィンドウを開始
    entry = {
      count: 1,
      resetTime: now + windowMs
    }
    requestCounts.set(key, entry)

    return {
      allowed: true,
      blocked: false,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime
    }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      blocked: false,
      remaining: 0,
      resetTime: entry.resetTime,
      message: `レート制限に達しました。${Math.ceil((entry.resetTime - now) / 1000 / 60)}分後に再試行してください。`
    }
  }

  return {
    allowed: true,
    blocked: false,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * セキュリティヘッダーを追加するミドルウェア
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // セキュリティヘッダーを追加
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  return response
}

/**
 * ログイン試行の記録と評価を行うヘルパー関数
 */
export async function recordAndEvaluateLoginAttempt(
  ip: string,
  email?: string,
  userAgent?: string,
  success: boolean = false
) {
  try {
    return await LoginAttemptService.recordAttempt(ip, email, userAgent, success)
  } catch (error) {
    console.error('Failed to record login attempt:', error)
    return { success: false, blocked: false, message: 'システムエラーが発生しました' }
  }
}

export default {
  withAuthRateLimit,
  withGeneralRateLimit,
  addSecurityHeaders,
  recordAndEvaluateLoginAttempt
}