/**
 * アナリティクステスト用のサンプルデータ生成
 */

// テストデータ生成（ダッシュボード表示確認用）
export const generateSampleAnalyticsData = () => {
  if (typeof window === 'undefined') return;

  const today = new Date();
  const daysToGenerate = 7;

  // 過去7日分のデータを生成
  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // その日のランダムなアクティビティを生成
    const dayData = {
      task_created: generateTaskCreatedData(date, Math.floor(Math.random() * 8) + 2),
      task_completed: generateTaskCompletedData(date, Math.floor(Math.random() * 6) + 1),
      feature_used: generateFeatureUsageData(date, Math.floor(Math.random() * 15) + 5),
    };

    // LocalStorageに保存
    const storageKey = `todo_analytics_${dateStr}`;
    localStorage.setItem(storageKey, JSON.stringify(dayData));
  }

  console.log('📊 7日分のサンプルアナリティクスデータを生成しました');
};

// タスク作成データの生成
const generateTaskCreatedData = (date: Date, count: number) => {
  const tasks = [];
  const taskTitles = [
    'プロジェクト計画の作成',
    'チームミーティングの準備',
    'レポート作成',
    'クライアント対応',
    'バグ修正',
    '新機能の設計',
    'ドキュメント更新',
    'テストケース作成',
    'コードレビュー',
    '企画書作成',
  ];

  const priorities = ['high', 'medium', 'low'];
  const workspaceTypes = ['personal', 'team'];

  for (let i = 0; i < count; i++) {
    const randomHour = Math.floor(Math.random() * 16) + 8; // 8:00-23:00
    const randomMinute = Math.floor(Math.random() * 60);

    const taskDate = new Date(date);
    taskDate.setHours(randomHour, randomMinute);

    tasks.push({
      title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: 'pending',
      workspaceType: workspaceTypes[Math.floor(Math.random() * workspaceTypes.length)],
      createdAt: taskDate.toISOString(),
      complexity: ['simple', 'medium', 'complex'][Math.floor(Math.random() * 3)],
      event_timestamp: taskDate.toISOString(),
    });
  }

  return tasks;
};

// タスク完了データの生成
const generateTaskCompletedData = (date: Date, count: number) => {
  const tasks = [];
  const priorities = ['high', 'medium', 'low'];
  const workspaceTypes = ['personal', 'team'];

  for (let i = 0; i < count; i++) {
    const randomHour = Math.floor(Math.random() * 16) + 8; // 8:00-23:00
    const randomMinute = Math.floor(Math.random() * 60);

    const completedDate = new Date(date);
    completedDate.setHours(randomHour, randomMinute);

    // 作成から完了までの時間（分単位）
    const timeToComplete = Math.floor(Math.random() * 4320) + 30; // 30分〜3日

    const createdDate = new Date(completedDate);
    createdDate.setMinutes(createdDate.getMinutes() - timeToComplete);

    tasks.push({
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: 'completed',
      workspaceType: workspaceTypes[Math.floor(Math.random() * workspaceTypes.length)],
      createdAt: createdDate.toISOString(),
      completedAt: completedDate.toISOString(),
      timeToComplete,
    });
  }

  return tasks;
};

// 機能使用データの生成
const generateFeatureUsageData = (date: Date, count: number) => {
  const features = [
    'task_create',
    'task_edit',
    'task_delete',
    'task_complete',
    'team_create',
    'team_join',
    'workspace_switch',
    'filter_tasks',
    'search_tasks',
    'export_tasks',
  ];

  const usageData = [];

  for (let i = 0; i < count; i++) {
    const randomHour = Math.floor(Math.random() * 16) + 8;
    const randomMinute = Math.floor(Math.random() * 60);

    const usageDate = new Date(date);
    usageDate.setHours(randomHour, randomMinute);

    usageData.push({
      feature: features[Math.floor(Math.random() * features.length)],
      timestamp: usageDate.toISOString(),
      context: {
        source: ['button_click', 'keyboard_shortcut', 'menu'][Math.floor(Math.random() * 3)],
        stage: ['initial', 'active', 'completion'][Math.floor(Math.random() * 3)],
      },
    });
  }

  return usageData;
};

// データクリア機能
export const clearAnalyticsData = () => {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage).filter(key =>
    key.startsWith('todo_analytics_')
  );

  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ ${keys.length}個のアナリティクスデータを削除しました`);
};

// データエクスポート機能
export const exportAnalyticsData = () => {
  if (typeof window === 'undefined') return;

  const analyticsData: Record<string, any> = {};
  const keys = Object.keys(localStorage).filter(key =>
    key.startsWith('todo_analytics_')
  );

  keys.forEach(key => {
    const date = key.replace('todo_analytics_', '');
    try {
      analyticsData[date] = JSON.parse(localStorage.getItem(key) || '{}');
    } catch (error) {
      console.warn(`Failed to parse data for ${date}:`, error);
    }
  });

  // JSONファイルとしてダウンロード
  const dataBlob = new Blob([JSON.stringify(analyticsData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `todo_analytics_export_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('📥 アナリティクスデータをエクスポートしました');
};

// リアルタイムアクティビティシミュレーター（デモ用）
export const simulateRealTimeActivity = () => {
  if (typeof window === 'undefined') return;

  const activities = [
    () => generateTaskCreatedData(new Date(), 1)[0],
    () => generateTaskCompletedData(new Date(), 1)[0],
    () => generateFeatureUsageData(new Date(), 1)[0],
  ];

  setInterval(() => {
    if (Math.random() < 0.3) { // 30%の確率で活動を生成
      const activity = activities[Math.floor(Math.random() * activities.length)]();

      const today = new Date().toISOString().split('T')[0];
      const storageKey = `todo_analytics_${today}`;

      try {
        const existingData = localStorage.getItem(storageKey);
        const dailyStats = existingData ? JSON.parse(existingData) : {};

        // アクティビティタイプを決定
        let eventType: string;
        if (activity.hasOwnProperty('title')) {
          eventType = 'task_created';
        } else if (activity.hasOwnProperty('completedAt')) {
          eventType = 'task_completed';
        } else {
          eventType = 'feature_used';
        }

        if (!dailyStats[eventType]) {
          dailyStats[eventType] = [];
        }

        dailyStats[eventType].push(activity);
        localStorage.setItem(storageKey, JSON.stringify(dailyStats));

        console.log(`📊 リアルタイムアクティビティ生成: ${eventType}`);
      } catch (error) {
        console.warn('Failed to simulate activity:', error);
      }
    }
  }, 10000); // 10秒ごとに実行
};

// 開発者用ヘルパー関数
export const getAnalyticsDataSummary = () => {
  if (typeof window === 'undefined') return null;

  const keys = Object.keys(localStorage).filter(key =>
    key.startsWith('todo_analytics_')
  );

  const summary = {
    totalDays: keys.length,
    dates: keys.map(key => key.replace('todo_analytics_', '')).sort(),
    totalSize: keys.reduce((size, key) => {
      const data = localStorage.getItem(key);
      return size + (data ? data.length : 0);
    }, 0),
  };

  console.table(summary);
  return summary;
};