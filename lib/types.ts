// チーム機能の型定義

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  invited_by?: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  team?: {
    name: string;
    description?: string;
  };
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member' | 'guest';
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
  member_count: number;
  current_user_is_owner?: boolean;
  current_user_role?: string | null;
}

export interface UserTeams {
  owned_teams: Team[];
  member_teams: Team[];
  guest_teams: Team[];
}

// 拡張タスク型定義（チーム共有機能対応）
export interface SharedTask {
  id: string;
  text: string;
  completed: boolean;
  priority: "高" | "中" | "低";
  user_id: string;
  team_id?: string | null;
  assigned_to?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  assignee?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
  creator?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  } | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'completed' | 'assigned' | 'commented' | 'deleted';
  changes: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string | null;
      avatar_url?: string | null;
    };
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_mentioned' | 'task_deadline' | 'task_completed' | 'task_commented';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

export interface WorkspaceContext {
  type: 'personal' | 'team';
  team_id?: string | null;
  team_name?: string;
  // Internal field for React change detection
  _switchedAt?: number;
}

// Pagination interfaces
export interface PaginationOptions {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigned_to?: string;
  cursor?: string;
}

export interface PaginatedTasksResult {
  tasks: SharedTask[];
  hasMore: boolean;
  totalCount: number;
  nextCursor?: string;
  currentPage: number;
}