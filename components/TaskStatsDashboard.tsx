'use client'

import { useTaskStatistics } from '@/hooks/useTaskStatistics'

export default function TaskStatsDashboard() {
  const { statistics, loading, error } = useTaskStatistics()

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-2">統計を読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">エラー: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">📊 タスク統計ダッシュボード</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statistics.map((stat) => (
          <div key={stat.user_id} className="bg-white rounded-lg shadow-lg p-6 border">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-800">{stat.display_name}</h3>
                <p className="text-sm text-gray-500">活動期間: {stat.days_since_first_task}日</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">総タスク数</span>
                <span className="font-bold text-lg text-blue-600">{stat.total_tasks}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">完了率</span>
                <span className="font-bold text-lg text-green-600">{stat.completion_rate}%</span>
              </div>

              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stat.completion_rate}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">完了</p>
                  <p className="font-bold text-green-600">{stat.completed_tasks}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">未完了</p>
                  <p className="font-bold text-orange-600">{stat.incomplete_tasks}</p>
                </div>
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-sm text-gray-500 mb-2">優先度別</p>
                <div className="flex justify-between text-sm">
                  <span>高: <span className="font-semibold text-red-500">{stat.priority_high}</span></span>
                  <span>中: <span className="font-semibold text-yellow-500">{stat.priority_medium}</span></span>
                  <span>低: <span className="font-semibold text-green-500">{stat.priority_low}</span></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}