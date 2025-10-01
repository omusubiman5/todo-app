'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackTaskEvent, trackTeamEvent, trackUserEvent } from '@/lib/analytics';

// ページトラッキング用フック
export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      const title = document.title;
      trackPageView(url, title);
    }
  }, [pathname]);
}

// タスク関連イベントトラッキング
export function useTaskAnalytics() {
  const trackTaskCreate = (data: any) => {
    trackTaskEvent('task_create', {
      taskTitle: data.title?.substring(0, 50), // プライバシー配慮：50文字まで
      priority: data.priority,
      workspaceType: data.team_id ? 'team' : 'personal',
      taskCount: 1,
    });
  };

  const trackTaskComplete = (data: any) => {
    trackTaskEvent('task_complete', {
      priority: data.priority,
      workspaceType: data.team_id ? 'team' : 'personal',
      status: 'completed',
    });
  };

  const trackTaskDelete = (data: any) => {
    trackTaskEvent('task_delete', {
      priority: data.priority,
      workspaceType: data.team_id ? 'team' : 'personal',
      status: data.status,
    });
  };

  const trackTaskUpdate = (data: any) => {
    trackTaskEvent('task_update', {
      priority: data.priority,
      workspaceType: data.team_id ? 'team' : 'personal',
      status: data.status,
    });
  };

  return {
    trackTaskCreate,
    trackTaskComplete,
    trackTaskDelete,
    trackTaskUpdate,
  };
}

// チーム関連イベントトラッキング
export function useTeamAnalytics() {
  const trackTeamCreate = (data: any) => {
    trackTeamEvent('team_create', {
      memberCount: 1, // 作成者のみ
    });
  };

  const trackTeamJoin = (data: any) => {
    trackTeamEvent('team_join', {
      memberCount: data.memberCount,
      invitationMethod: data.invitationMethod, // 'email' | 'link'
      role: data.role,
    });
  };

  const trackTeamInvite = (data: any) => {
    trackTeamEvent('team_invite', {
      invitationMethod: 'email',
      role: data.role,
    });
  };

  const trackWorkspaceSwitch = (workspaceType: 'personal' | 'team') => {
    trackUserEvent('workspace_switch', {
      feature: 'workspace_switcher',
      step: workspaceType,
    });
  };

  return {
    trackTeamCreate,
    trackTeamJoin,
    trackTeamInvite,
    trackWorkspaceSwitch,
  };
}

// ユーザーエンゲージメントトラッキング
export function useEngagementAnalytics() {
  const trackFeatureUsage = (feature: string) => {
    trackUserEvent('feature_usage', {
      feature,
    });
  };

  const trackTimeSpent = (page: string, duration: number) => {
    // 5秒以上の場合のみトラッキング（意味のあるエンゲージメント）
    if (duration >= 5000) {
      trackUserEvent('time_on_page', {
        feature: page,
        duration: Math.round(duration / 1000), // 秒単位に変換
      });
    }
  };

  const trackUserJourney = (step: string) => {
    trackUserEvent('user_journey', {
      step,
      user_journey_step: step,
    });
  };

  return {
    trackFeatureUsage,
    trackTimeSpent,
    trackUserJourney,
  };
}

// セッション開始時の設定
export function useSessionTracking() {
  useEffect(() => {
    // セッション開始イベント
    trackUserEvent('session_start', {
      feature: 'app_launch',
      step: 'initial_load',
    });

    // ページ離脱時の処理
    const handleBeforeUnload = () => {
      trackUserEvent('session_end', {
        feature: 'app_exit',
        step: 'page_unload',
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}