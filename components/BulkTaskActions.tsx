'use client';

import React, { useState } from 'react';
import { RPCService, BulkUpdateResult } from '@/lib/rpcService';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  Clock, 
  Pause, 
  Trash2, 
  UserCheck, 
  Flag,
  MoreHorizontal
} from 'lucide-react';

interface BulkTaskActionsProps {
  selectedTaskIds: string[];
  onActionComplete?: () => void;
  teamMembers?: Array<{
    user_id: string;
    user?: {
      email: string;
      user_metadata?: {
        full_name?: string;
      };
    };
  }>;
}

export default function BulkTaskActions({ 
  selectedTaskIds, 
  onActionComplete,
  teamMembers = []
}: BulkTaskActionsProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleBulkUpdate = async (updates: Record<string, string | boolean | number>, actionName: string) => {
    if (!user || selectedTaskIds.length === 0) return;

    try {
      setIsLoading(true);
      
      const result: BulkUpdateResult = await RPCService.bulkUpdateTasks(
        selectedTaskIds,
        user.id,
        updates
      );

      if (result.success) {
        toast({
          title: "一括更新完了",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "更新エラー",
          description: result.message,
          variant: "destructive",
        });
      }

      if (onActionComplete) {
        onActionComplete();
      }

    } catch (error) {
      console.error(`${actionName}エラー:`, error);
      toast({
        title: "エラー",
        description: `${actionName}に失敗しました。`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (status: string) => {
    const statusNames = {
      'completed': '完了',
      'in_progress': '進行中',
      'pending': '未着手'
    };
    
    handleBulkUpdate(
      { status }, 
      `ステータスを「${statusNames[status as keyof typeof statusNames]}」に変更`
    );
  };

  const handlePriorityChange = (priority: string) => {
    handleBulkUpdate(
      { priority }, 
      `優先度を「${priority}」に変更`
    );
  };

  const handleAssignment = (assigneeId: string | null) => {
    const assigneeName = assigneeId 
      ? teamMembers.find(m => m.user_id === assigneeId)?.user?.user_metadata?.full_name || 'メンバー'
      : '未割り当て';
    
    handleBulkUpdate(
      { assigned_to: assigneeId }, 
      `担当者を「${assigneeName}」に変更`
    );
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // タスク削除は status を削除済みマークに変更する方法を使用
      // または直接削除する場合は別途 delete RPC関数を作成
      const result = await RPCService.bulkUpdateTasks(
        selectedTaskIds,
        user.id,
        { status: 'deleted', updated_at: new Date().toISOString() }
      );

      if (result.success) {
        toast({
          title: "削除完了",
          description: `${result.updated_count}件のタスクを削除しました。`,
        });
        
        if (onActionComplete) {
          onActionComplete();
        }
      }

    } catch (error) {
      console.error('削除エラー:', error);
      toast({
        title: "削除エラー",
        description: "タスクの削除に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (selectedTaskIds.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        タスクを選択してください
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm font-medium text-blue-700">
        {selectedTaskIds.length}件選択中
      </span>
      
      <div className="flex space-x-1">
        {/* ステータス変更 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Clock className="h-4 w-4 mr-2" />
              ステータス
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              完了にする
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              進行中にする
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
              <Pause className="h-4 w-4 mr-2 text-gray-500" />
              未着手にする
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 優先度変更 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Flag className="h-4 w-4 mr-2" />
              優先度
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handlePriorityChange('高')}>
              <Flag className="h-4 w-4 mr-2 text-red-500" />
              高優先度
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange('中')}>
              <Flag className="h-4 w-4 mr-2 text-yellow-500" />
              中優先度
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange('低')}>
              <Flag className="h-4 w-4 mr-2 text-green-500" />
              低優先度
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 担当者変更（チームタスクの場合のみ） */}
        {teamMembers.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <UserCheck className="h-4 w-4 mr-2" />
                担当者
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAssignment(null)}>
                <UserCheck className="h-4 w-4 mr-2 text-gray-500" />
                未割り当てにする
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {teamMembers.map((member) => (
                <DropdownMenuItem 
                  key={member.user_id}
                  onClick={() => handleAssignment(member.user_id)}
                >
                  <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                  {member.user?.user_metadata?.full_name || member.user?.email || 'ユーザー'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* その他のアクション */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除する
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクの削除</AlertDialogTitle>
            <AlertDialogDescription>
              選択した{selectedTaskIds.length}件のタスクを削除しますか？
              この操作は取り消すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}