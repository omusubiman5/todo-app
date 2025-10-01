import { NextRequest, NextResponse } from 'next/server';

// 🚀 Phase 3 Stage 3: 動的OGイメージ生成（一時的に無効化）

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'personal';
    const name = searchParams.get('name') || 'Workspace';
    const tasks = searchParams.get('tasks') || '0';
    const completed = searchParams.get('completed') || '0';

    // 一時的にプレーンテキストレスポンスを返す
    const completionRate = parseInt(tasks) > 0 
      ? Math.round((parseInt(completed) / parseInt(tasks)) * 100)
      : 0;

    const ogData = {
      type,
      name,
      tasks,
      completed,
      completionRate,
      title: `TodoApp - ${name}`,
      description: `${type === 'team' ? 'チームワークスペース' : '個人ワークスペース'} | ${tasks}タスク中${completed}完了 (${completionRate}%)`
    };

    return NextResponse.json(ogData, {
      headers: {
        'content-type': 'application/json',
      }
    });
  } catch (e: unknown) {
    console.error('OG data generation error:', e);
    return new Response(`Failed to generate OG data`, {
      status: 500,
    });
  }
}