import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // ヘッダーからIPアドレスを取得（優先順位順）
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
    const xClusterClientIp = request.headers.get('x-cluster-client-ip')
    const remoteAddr = request.headers.get('remote-addr')

    let clientIp: string

    if (forwarded) {
      // X-Forwarded-For は複数のIPが含まれる場合がある
      clientIp = forwarded.split(',')[0].trim()
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp
    } else if (realIp) {
      clientIp = realIp
    } else if (xClusterClientIp) {
      clientIp = xClusterClientIp
    } else if (remoteAddr) {
      clientIp = remoteAddr
    } else {
      // フォールバック
      clientIp = '127.0.0.1'
    }

    // IPv6のlocalhost表記を正規化
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      clientIp = '127.0.0.1'
    }

    // IPv6の形式を簡略化（必要に応じて）
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '')
    }

    return NextResponse.json({
      ip: clientIp,
      headers: {
        'x-forwarded-for': forwarded,
        'x-real-ip': realIp,
        'cf-connecting-ip': cfConnectingIp,
        'x-cluster-client-ip': xClusterClientIp,
        'remote-addr': remoteAddr
      }
    })

  } catch (error) {
    console.error('Error getting client IP:', error)

    return NextResponse.json(
      {
        ip: '127.0.0.1',
        error: 'Failed to determine client IP'
      },
      { status: 500 }
    )
  }
}