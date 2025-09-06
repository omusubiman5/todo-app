import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/swagger';

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: Swagger JSON仕様を取得
 *     description: OpenAPI 3.0 形式のAPI仕様をJSON形式で返します
 *     responses:
 *       200:
 *         description: Swagger仕様書
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}