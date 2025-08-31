"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { WorkspaceContext } from '@/lib/types';
import { getUserTeams } from '@/lib/teamService';
import { useAuth } from './AuthProvider';

interface WorkspaceProviderProps {
  children: ReactNode;
}

interface WorkspaceContextType {
  currentWorkspace: WorkspaceContext;
  availableWorkspaces: {
    personal: WorkspaceContext;
    teams: (WorkspaceContext & { role: string })[];
  };
  switchWorkspace: (workspace: WorkspaceContext) => void;
  refreshWorkspaces: () => Promise<void>;
  isLoading: boolean;
}

const WorkspaceReactContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceContext>({
    type: 'personal',
    team_id: null,
    team_name: '個人タスク'
  });
  
  const [availableWorkspaces, setAvailableWorkspaces] = useState<{
    personal: WorkspaceContext;
    teams: (WorkspaceContext & { role: string })[];
  }>({
    personal: { type: 'personal', team_id: null, team_name: '個人タスク' },
    teams: []
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // ワークスペース一覧を取得（実際のチーム管理連携版）
  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setAvailableWorkspaces({
        personal: { type: 'personal', team_id: null, team_name: '個人タスク' },
        teams: []
      });
      setIsLoading(false);
      return;
    }

    console.log('✅ WorkspaceProvider: 実際のチーム管理連携版');
    setIsLoading(true);
    
    try {
      console.log('🔍 WorkspaceProvider: getUserTeams呼び出し開始', {
        user_email: user.email,
        user_id: user.id
      });
      
      const personalWorkspace = { type: 'personal' as const, team_id: null, team_name: '個人タスク' };
      
      let userTeams;
      
      try {
        console.log('🔍 getUserTeams呼び出し開始');
        userTeams = await getUserTeams();
        console.log('✅ getUserTeams成功:', userTeams);
      } catch (error) {
        console.error('❌ getUserTeamsエラー:', error);
        userTeams = { owned_teams: [], member_teams: [], guest_teams: [] };
      }
      
      console.log('✅ 最終的なチームデータ:', userTeams);
      
      // チームデータを WorkspaceContext 形式に変換
      const teamWorkspaces = [...userTeams.owned_teams, ...userTeams.member_teams, ...userTeams.guest_teams].map(team => ({
        type: 'team' as const,
        team_id: team.id,
        team_name: team.name,
        role: 'owner' // 簡略化
      }));
      
      setAvailableWorkspaces({
        personal: personalWorkspace,
        teams: teamWorkspaces
      });
      
      console.log('✅ ワークスペース設定完了:', {
        personal: personalWorkspace,
        teams: teamWorkspaces
      });
      
    } catch (error) {
      console.error('❌ ワークスペース取得エラー:', error);
      // エラー時は個人ワークスペースのみ
      setAvailableWorkspaces({
        personal: { type: 'personal', team_id: null, team_name: '個人タスク' },
        teams: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ワークスペース切り替え
  const switchWorkspace = (workspace: WorkspaceContext) => {
    console.log('🔄 ワークスペース切り替え:', {
      from: currentWorkspace.type,
      to: workspace.type
    });
    
    // ローディング状態をリセット（無限ローディングを防ぐ）
    setIsLoading(false);
    
    // 新しいオブジェクト参照を作成してReactの変更検知を確実にする
    const newWorkspace = {
      type: workspace.type,
      team_id: workspace.team_id,
      team_name: workspace.team_name,
      // タイムスタンプを追加してオブジェクトの一意性を保証
      _switchedAt: Date.now()
    };
    
    // ワークスペースを即座に切り替え
    setCurrentWorkspace(newWorkspace);
    
    // ローカルストレージに保存（_switchedAtは除く）
    const workspaceForStorage = {
      type: workspace.type,
      team_id: workspace.team_id,
      team_name: workspace.team_name
    };
    localStorage.setItem('current-workspace', JSON.stringify(workspaceForStorage));
    
    console.log('✅ ワークスペース切り替え完了:', newWorkspace.type);
  };

  // 初期化
  useEffect(() => {
    if (!user) {
      setCurrentWorkspace({
        type: 'personal',
        team_id: null,
        team_name: '個人タスク'
      });
      setAvailableWorkspaces({
        personal: { type: 'personal', team_id: null, team_name: '個人タスク' },
        teams: []
      });
      return;
    }

    // ローカルストレージから前回のワークスペースを復元
    try {
      const saved = localStorage.getItem('current-workspace');
      if (saved) {
        const workspace = JSON.parse(saved);
        setCurrentWorkspace(workspace);
      }
    } catch (error) {
      console.error('Failed to restore workspace:', error);
    }

    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    availableWorkspaces,
    switchWorkspace,
    refreshWorkspaces,
    isLoading
  };

  return (
    <WorkspaceReactContext.Provider value={value}>
      {children}
    </WorkspaceReactContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceReactContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}