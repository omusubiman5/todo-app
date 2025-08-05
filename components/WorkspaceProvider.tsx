"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { WorkspaceContext } from '@/lib/types';
import { SharedTaskService } from '@/lib/sharedTaskService';
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

  // ワークスペース一覧を取得
  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const workspaces = await SharedTaskService.getUserWorkspaces(user.id);
      setAvailableWorkspaces(workspaces);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ワークスペース切り替え
  const switchWorkspace = (workspace: WorkspaceContext) => {
    setCurrentWorkspace(workspace);
    // ローカルストレージに保存
    localStorage.setItem('current-workspace', JSON.stringify(workspace));
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