'use client';

import React, { useState } from 'react';
import { 
  useEnhancedTasks, 
  usePriorities, 
  useTaskFilters,
  useRealtimeTaskUpdates 
} from '@/hooks/useEnhancedTasks';
import { useAuth } from '@/components/AuthProvider';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  Clock,
  Flag,
  User,
  Archive,
  CheckCircle2,
  Circle,
  PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// タスクカードコンポーネント
interface TaskCardProps {
  task: SharedTask; // EnhancedTask型
  onUpdate: (id: string, updates: Partial<SharedTask>) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onUpdate, 
  onDelete, 
  isSelected, 
  onSelect 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const isOverdue = date < now && task.status !== 'completed';
    
    return (
      <span className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
        📅 {format(date, 'MM/dd', { locale: ja })}
        {isOverdue && ' (期限切れ)'}
      </span>
    );
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(task.id, !!checked)}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(task.status)}
              <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
            )}
            
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getStatusBadgeColor(task.status)}>
                {task.status === 'completed' ? '完了' :
                 task.status === 'in_progress' ? '進行中' : '未着手'}
              </Badge>
              
              {task.priority && (
                <Badge 
                  style={{ backgroundColor: task.priority.color_code }}
                  className="text-white"
                >
                  {task.priority.icon} {task.priority.display_name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {task.assignee && (
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {task.assignee.display_name}
                  </span>
                )}
                
                {formatDueDate(task.due_date)}
                
                {task.comment_count > 0 && (
                  <span>{task.comment_count} コメント</span>
                )}
              </div>
              
              <span>{format(new Date(task.created_at), 'MM/dd', { locale: ja })}</span>
            </div>
            
            {/* カスタムフィールド表示 */}
            {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(task.custom_fields).map(([key, value]) => (
                    <span key={key} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onUpdate(task.id, { 
                status: task.status === 'completed' ? 'pending' : 'completed' 
              })}>
                {task.status === 'completed' ? '未完了にする' : '完了にする'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdate(task.id, { 
                status: task.status === 'in_progress' ? 'pending' : 'in_progress' 
              })}>
                {task.status === 'in_progress' ? '未着手にする' : '進行中にする'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-red-600"
              >
                <Archive className="h-4 w-4 mr-2" />
                アーカイブ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

// メインコンポーネント
export default function EnhancedTaskManager() {
  const { workspace } = useWorkspace();
  
  // フック
  const {
    tasks,
    totalCount,
    isLoading,
    hasMore,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    loadMore,
    updateFilters
  } = useEnhancedTasks({
    autoRefresh: true,
    refreshInterval: 30000 // 30秒ごとに自動更新
  });

  const { priorities } = usePriorities();
  const {
    searchText,
    selectedStatus,
    selectedPriorities,
    hasActiveFilters,
    setSearchText,
    setSelectedStatus,
    setSelectedPriorities,
    buildFilters,
    clearAllFilters
  } = useTaskFilters();

  // 状態管理
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // リアルタイム更新
  useRealtimeTaskUpdates((payload) => {
    console.log('タスクがリアルタイム更新されました:', payload);
    // 必要に応じて手動でリフレッシュ
  });

  // フィルター適用
  const applyFilters = () => {
    const filters = buildFilters();
    updateFilters(filters);
  };

  // 検索実行
  const handleSearch = () => {
    applyFilters();
  };

  // タスク選択管理
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => 
      selected 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const selectAllTasks = () => {
    setSelectedTasks(tasks.map(task => task.id));
  };

  const clearSelection = () => {
    setSelectedTasks([]);
  };

  // 新規タスク作成
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    const success = await createTask({
      title: newTaskTitle.trim()
    });

    if (success) {
      setNewTaskTitle('');
      setShowNewTaskForm(false);
    }
  };

  // 一括操作
  const handleBulkAction = async (action: string) => {
    if (selectedTasks.length === 0) return;

    const updates: Record<string, string | number | boolean> = {};
    
    switch (action) {
      case 'complete':
        updates.status = 'completed';
        break;
      case 'progress':
        updates.status = 'in_progress';
        break;
      case 'pending':
        updates.status = 'pending';
        break;
    }

    if (Object.keys(updates).length > 0) {
      await bulkUpdateTasks(selectedTasks, updates);
      clearSelection();
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            タスク管理 {workspace.type === 'team' && `- ${workspace.team_name}`}
          </h1>
          <p className="text-gray-600">
            全{totalCount}件のタスク {hasActiveFilters && '(フィルター適用中)'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          >
            {viewMode === 'list' ? 'カンバン表示' : 'リスト表示'}
          </Button>
          
          <Button onClick={() => setShowNewTaskForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規タスク
          </Button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* 検索バー */}
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="タスクを検索..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>検索</Button>
            </div>

            {/* フィルター */}
            <div className="flex flex-wrap gap-2">
              {/* ステータスフィルター */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    ステータス {selectedStatus.length > 0 && `(${selectedStatus.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={selectedStatus.includes('pending')}
                    onCheckedChange={(checked) => {
                      setSelectedStatus(prev => 
                        checked 
                          ? [...prev, 'pending']
                          : prev.filter(s => s !== 'pending')
                      );
                    }}
                  >
                    未着手
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedStatus.includes('in_progress')}
                    onCheckedChange={(checked) => {
                      setSelectedStatus(prev => 
                        checked 
                          ? [...prev, 'in_progress']
                          : prev.filter(s => s !== 'in_progress')
                      );
                    }}
                  >
                    進行中
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedStatus.includes('completed')}
                    onCheckedChange={(checked) => {
                      setSelectedStatus(prev => 
                        checked 
                          ? [...prev, 'completed']
                          : prev.filter(s => s !== 'completed')
                      );
                    }}
                  >
                    完了
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 優先度フィルター */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Flag className="h-4 w-4 mr-2" />
                    優先度 {selectedPriorities.length > 0 && `(${selectedPriorities.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {priorities.map((priority) => (
                    <DropdownMenuCheckboxItem
                      key={priority.id}
                      checked={selectedPriorities.includes(priority.id)}
                      onCheckedChange={(checked) => {
                        setSelectedPriorities(prev => 
                          checked 
                            ? [...prev, priority.id]
                            : prev.filter(id => id !== priority.id)
                        );
                      }}
                    >
                      <span 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: priority.color_code }}
                      />
                      {priority.icon} {priority.display_name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  フィルタークリア
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 一括操作パネル */}
      {selectedTasks.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedTasks.length}件のタスクを選択中
              </span>
              
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('complete')}>
                  完了にする
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('progress')}>
                  進行中にする
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('pending')}>
                  未着手にする
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  選択解除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* タスク一覧 */}
      <div className="space-y-4">
        {/* ツールバー */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={selectAllTasks}>
              全選択
            </Button>
            {tasks.length > 0 && (
              <span className="text-sm text-gray-500">
                表示中: {tasks.length}件
              </span>
            )}
          </div>
        </div>

        {/* タスクカード */}
        {isLoading && tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">読み込み中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2" />
            <p>タスクが見つかりませんでした</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  isSelected={selectedTasks.includes(task.id)}
                  onSelect={handleTaskSelect}
                />
              ))}
            </div>

            {/* さらに読み込み */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? '読み込み中...' : 'さらに読み込む'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新規タスク作成フォーム */}
      {showNewTaskForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>新規タスクの作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="タスクのタイトルを入力..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              autoFocus
            />
            
            <div className="flex space-x-2">
              <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
                作成
              </Button>
              <Button variant="ghost" onClick={() => setShowNewTaskForm(false)}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}