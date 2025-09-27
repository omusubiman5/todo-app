import { NextRequest, NextResponse } from 'next/server'
import { withAuthRateLimit, recordAndEvaluateLoginAttempt } from '@/lib/middleware/rateLimiter'

async function loginHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, captchaToken } = body

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')

    let clientIP: string
    if (forwarded) {
      clientIP = forwarded.split(',')[0].trim()
    } else if (cfConnectingIp) {
      clientIP = cfConnectingIp
    } else if (realIp) {
      clientIP = realIp
    } else {
      clientIP = '127.0.0.1'
    }

    // Normalize IPv6 localhost
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
      clientIP = '127.0.0.1'
    }
    if (clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.replace('::ffff:', '')
    }

    const userAgent = request.headers.get('user-agent') || ''

    // Basic validation
    if (!email || !password) {
      await recordAndEvaluateLoginAttempt(clientIP, email, userAgent, false)
      return NextResponse.json(
        { error: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      )
    }

    // This is a demonstration endpoint - in production, implement actual authentication
    // For now, simulate authentication logic
    const isValidCredentials = await validateCredentials(email, password)

    if (isValidCredentials) {
      // Record successful attempt
      await recordAndEvaluateLoginAttempt(clientIP, email, userAgent, true)

      return NextResponse.json({
        success: true,
        message: 'ログインに成功しました'
      })
    } else {
      // Record failed attempt and evaluate for blocking
      const attemptResult = await recordAndEvaluateLoginAttempt(clientIP, email, userAgent, false)

      if (attemptResult.blocked) {
        return NextResponse.json(
          {
            error: 'LOGIN_BLOCKED',
            message: attemptResult.message,
            blockDuration: attemptResult.blockDuration
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'システムエラーが発生しました' },
      { status: 500 }
    )
  }
}

// Simulate credential validation - replace with actual authentication
async function validateCredentials(email: string, password: string): Promise<boolean> {
  // This is just a demo - DO NOT use in production
  // In production, use proper password hashing and database validation
  return email === 'demo@example.com' && password === 'demo123'
}

// Apply rate limiting middleware
export async function POST(request: NextRequest) {
  return withAuthRateLimit(request, loginHandler)
}