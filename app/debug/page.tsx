"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function DebugPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runDatabaseTest = async () => {
    if (!user) {
      setResults(['❌ 認証が必要です']);
      return;
    }

    setIsLoading(true);
    const testResults: string[] = [];
    
    try {
      testResults.push('🔍 データベース構造確認開始...');
      testResults.push(`✅ 認証済みユーザー: ${user.email}`);
      
      // profiles テーブル確認
      testResults.push('\n1️⃣ profiles テーブル確認...');
      try {
        const { error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (profilesError) {
          testResults.push(`❌ profiles テーブルエラー: ${JSON.stringify({
            message: profilesError.message,
            code: profilesError.code,
            details: profilesError.details
          }, null, 2)}`);
        } else {
          testResults.push('✅ profiles テーブル正常');
        }
      } catch (e: unknown) {
        testResults.push(`❌ profiles テーブル接続エラー: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      // tasks テーブル確認
      testResults.push('\n2️⃣ tasks テーブル確認...');
      try {
        const { error: tasksError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true });
          
        if (tasksError) {
          testResults.push(`❌ tasks テーブルエラー: ${JSON.stringify({
            message: tasksError.message,
            code: tasksError.code,
            details: tasksError.details
          }, null, 2)}`);
        } else {
          testResults.push('✅ tasks テーブル正常');
        }
      } catch (e: unknown) {
        testResults.push(`❌ tasks テーブル接続エラー: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      // notifications テーブル確認
      testResults.push('\n3️⃣ notifications テーブル確認...');
      try {
        const { error: notificationsError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true });
          
        if (notificationsError) {
          testResults.push(`❌ notifications テーブルエラー: ${JSON.stringify({
            message: notificationsError.message,
            code: notificationsError.code,
            details: notificationsError.details
          }, null, 2)}`);
        } else {
          testResults.push('✅ notifications テーブル正常');
        }
      } catch (e: unknown) {
        testResults.push(`❌ notifications テーブル接続エラー: ${e instanceof Error ? e.message : String(e)}`);
      }
      
    } catch (error: unknown) {
      testResults.push(`💥 全体エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setResults(testResults);
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">データベースデバッグ</h1>
          <p>ログインが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-6">🔍 データベースデバッグ</h1>
          
          <button
            onClick={runDatabaseTest}
            disabled={isLoading}
            className="mb-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
          >
            {isLoading ? '🔄 テスト実行中...' : '🚀 データベーステスト実行'}
          </button>
          
          <div className="bg-black/20 rounded-xl p-6 font-mono text-sm text-white">
            <pre className="whitespace-pre-wrap">
              {results.length > 0 ? results.join('\n') : 'テスト結果がここに表示されます'}
            </pre>
          </div>
          
          <a
            href="/home"
            className="mt-6 inline-block px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
          >
            ← ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}