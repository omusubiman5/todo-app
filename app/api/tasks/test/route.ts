import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/tasks/test:
 *   get:
 *     summary: API動作確認テスト
 *     description: APIサーバーが正常に動作しているかを確認するテスト用エンドポイント
 *     tags:
 *       - Test
 *     responses:
 *       200:
 *         description: API動作確認成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API is working!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T12:00:00.000Z"
 *                 url:
 *                   type: string
 *                   example: "http://localhost:3000/api/tasks/test"
 *                 method:
 *                   type: string
 *                   example: "GET"
 *   post:
 *     summary: POSTリクエストテスト
 *     description: POSTリクエストの動作を確認するテスト用エンドポイント
 *     tags:
 *       - Test
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               test_data:
 *                 type: string
 *                 example: "Hello API"
 *     responses:
 *       200:
 *         description: POSTリクエスト成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST API is working!"
 *                 received_data:
 *                   type: object
 *                   example: { "test_data": "Hello API" }
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 url:
 *                   type: string
 *                 method:
 *                   type: string
 *                   example: "POST"
 *       400:
 *         description: 無効なJSONデータ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid JSON body"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// 認証なしのテスト用API
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: 'GET'
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    return NextResponse.json({
      success: true,
      message: 'POST API is working!',
      received_data: body,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: 'POST'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid JSON body',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}