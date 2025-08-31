'use client'

import Link from 'next/link'
import { useWorkspace } from '@/components/WorkspaceProvider'
import { FiArrowLeft, FiActivity } from 'react-icons/fi'

export default function SimpleStatsPage() {
  const { currentWorkspace } = useWorkspace()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー（戻るボタン付き） */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/home"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            <FiArrowLeft className="w-4 h-4" />
            ホームに戻る
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentWorkspace.type === 'team' ? `${currentWorkspace.team_name} 統計` : '個人統計'}
            </h1>
            <p className="text-gray-600">
              統計機能は準備中です
            </p>
          </div>
          <div className="w-[140px]"></div> {/* スペーサー */}
        </div>

        {/* シンプルな統計表示 */}
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <FiActivity className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">統計ダッシュボード</h2>
          <p className="text-gray-600 mb-4">
            現在のワークスペース: {currentWorkspace.team_name}
          </p>
          <p className="text-gray-500">
            統計機能は近日中に実装予定です
          </p>
          
          <div className="mt-6">
            <Link 
              href="/home"
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              タスク管理に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}