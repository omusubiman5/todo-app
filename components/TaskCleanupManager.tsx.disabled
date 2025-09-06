'use client';

import React, { useState } from 'react';
import { RPCService, CleanupResult } from '@/lib/rpcService';
import { useAuth } from '@/contexts/AuthProvider';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Trash2, 
  Archive, 
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
} from 'lucide-react';

interface CleanupSettings {
  daysOld: number;
  keepImportant: boolean;
  targetScope: 'personal' | 'team' | 'all';
}

const presetOptions = [
  { value: 30, label: '1ヶ月前', description: '最近完了したタスクも対象' },
  { value: 90, label: '3ヶ月前', description: '四半期の区切り' },
  { value: 180, label: '6ヶ月前', description: '推奨設定' },
  { value: 365, label: '1年前', description: '長期保存' },
];

export default function TaskCleanupManager() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  
  const [settings, setSettings] = useState<CleanupSettings>({
    daysOld: 180,
    keepImportant: true,
    targetScope: 'personal'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<CleanupResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lastCleanupResult, setLastCleanupResult] = useState<CleanupResult | null>(null);

  const handlePreview = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const result = await RPCService.cleanupCompletedTasks(
        user.id,
        {
          teamId: settings.targetScope === 'team' ? workspace.team_id : undefined,
          daysOld: settings.daysOld,
          keepImportant: settings.keepImportant,
          dryRun: true // プレビューモード
        }
      );
      
      setPreviewResult(result);
      
    } catch (error) {
      console.error('プレビューエラー:', error);
      toast({
        title: "プレビューエラー",
        description: "削除対象の確認に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const result = await RPCService.cleanupCompletedTasks(
        user.id,
        {
          teamId: settings.targetScope === 'team' ? workspace.team_id : undefined,
          daysOld: settings.daysOld,
          keepImportant: settings.keepImportant,
          dryRun: false // 実際の削除
        }
      );
      
      setLastCleanupResult(result);
      setPreviewResult(null);
      
      if (result.success) {
        toast({
          title: "整理完了",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "整理エラー",
          description: result.message,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('整理エラー:', error);
      toast({
        title: "エラー",
        description: "タスクの整理に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScopeDescription = () => {
    switch (settings.targetScope) {
      case 'personal':
        return '個人タスクのみ';
      case 'team':
        return workspace.type === 'team' ? `${workspace.team_name}のタスク` : 'チームタスク';
      case 'all':
        return '全てのタスク（個人 + 全チーム）';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 設定カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            タスク整理設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 対象期間 */}
          <div>
            <Label className="text-sm font-medium mb-3 block">完了からの経過期間</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {presetOptions.map((preset) => (
                <div
                  key={preset.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    settings.daysOld === preset.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSettings({...settings, daysOld: preset.value})}
                >
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <Label htmlFor="custom-days" className="text-sm">カスタム日数</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="custom-days"
                  type="number"
                  min="1"
                  max="3650"
                  value={settings.daysOld}
                  onChange={(e) => setSettings({...settings, daysOld: parseInt(e.target.value) || 180})}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">日前より古い完了タスクを削除</span>
              </div>
            </div>
          </div>

          {/* 対象範囲 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">削除対象範囲</Label>
            <Select 
              value={settings.targetScope}
              onValueChange={(value: 'personal' | 'team' | 'all') => 
                setSettings({...settings, targetScope: value})
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">個人タスクのみ</SelectItem>
                {workspace.type === 'team' && (
                  <SelectItem value="team">現在のチーム（{workspace.team_name}）</SelectItem>
                )}
                <SelectItem value="all">全てのタスク</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">{getScopeDescription()}</p>
          </div>

          {/* 重要タスク保護 */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div>
              <div className="font-medium text-sm">重要タスクを保護</div>
              <div className="text-xs text-gray-600 mt-1">
                高優先度、コメント多数、期限超過などのタスクを削除対象から除外
              </div>
            </div>
            <Switch
              checked={settings.keepImportant}
              onCheckedChange={(checked) => setSettings({...settings, keepImportant: checked})}
            />
          </div>

          {/* プレビューボタン */}
          <div className="flex space-x-2">
            <Button 
              onClick={handlePreview}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <Info className="h-4 w-4 mr-2" />
              {isLoading ? 'プレビュー中...' : '削除対象を確認'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* プレビュー結果 */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              削除対象の確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {previewResult.cleanup_count}
                </div>
                <div className="text-sm text-gray-500">削除対象タスク数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatDate(previewResult.cutoff_date)}
                </div>
                <div className="text-sm text-gray-500">基準日</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {previewResult.settings?.keep_important ? 'ON' : 'OFF'}
                </div>
                <div className="text-sm text-gray-500">重要タスク保護</div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800">削除前の最終確認</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    この操作は取り消すことができません。削除されたタスクは復元できませんのでご注意ください。
                  </div>
                </div>
              </div>
            </div>

            {previewResult.recommendations && previewResult.recommendations.length > 0 && (
              <div>
                <div className="font-medium text-sm mb-2">推奨事項</div>
                <div className="space-y-1">
                  {previewResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isLoading || previewResult.cleanup_count === 0}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {previewResult.cleanup_count}件のタスクを削除
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewResult(null)}
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 前回の実行結果 */}
      {lastCleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              前回の整理結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {lastCleanupResult.cleanup_count}
                </div>
                <div className="text-sm text-gray-500">削除したタスク</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {lastCleanupResult.archived_count}
                </div>
                <div className="text-sm text-gray-500">アーカイブ</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  {lastCleanupResult.error_count}
                </div>
                <div className="text-sm text-gray-500">エラー</div>
              </div>
              <div className="text-center">
                <Badge variant={lastCleanupResult.success ? "default" : "destructive"}>
                  {lastCleanupResult.success ? "成功" : "エラーあり"}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">{lastCleanupResult.message}</p>
          </CardContent>
        </Card>
      )}

      {/* 確認ダイアログ */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              タスクの削除確認
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>{previewResult?.cleanup_count}件</strong>の完了済みタスクを削除しますか？
              </p>
              <p className="text-sm">
                削除されるタスク: {formatDate(previewResult?.cutoff_date || '')}より前に完了したタスク
              </p>
              <p className="text-sm font-medium text-red-600">
                ⚠️ この操作は取り消すことができません
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? '削除中...' : '削除実行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}