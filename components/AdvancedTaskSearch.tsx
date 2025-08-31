'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdvancedTaskSearch } from '@/lib/rpcService';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  X,
  Clock,
  Flag,
  User,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SearchFilters {
  searchText: string;
  status: string[];
  priority: string[];
  assignedTo: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  dueFrom: Date | undefined;
  dueTo: Date | undefined;
  hasDueDate: boolean | undefined;
}

const initialFilters: SearchFilters = {
  searchText: '',
  status: [],
  priority: [],
  assignedTo: '',
  dateFrom: undefined,
  dateTo: undefined,
  dueFrom: undefined,
  dueTo: undefined,
  hasDueDate: undefined,
};

export default function AdvancedTaskSearch() {
  const { results, isLoading, error, search } = useAdvancedTaskSearch();
  const { workspace } = useWorkspace();
  
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusOptions = [
    { value: 'pending', label: '未着手', color: 'bg-gray-100 text-gray-800' },
    { value: 'in_progress', label: '進行中', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: '完了', color: 'bg-green-100 text-green-800' }
  ];

  const priorityOptions = [
    { value: '高', label: '高優先度', color: 'bg-red-100 text-red-800' },
    { value: '中', label: '中優先度', color: 'bg-yellow-100 text-yellow-800' },
    { value: '低', label: '低優先度', color: 'bg-green-100 text-green-800' }
  ];

  const handleSearch = useCallback(() => {
    search({
      team_id: workspace.type === 'team' ? workspace.team_id : undefined,
      search_text: filters.searchText || undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      priority: filters.priority.length > 0 ? filters.priority : undefined,
      assigned_to: filters.assignedTo || undefined,
      date_from: filters.dateFrom?.toISOString(),
      date_to: filters.dateTo?.toISOString(),
      due_from: filters.dueFrom ? format(filters.dueFrom, 'yyyy-MM-dd') : undefined,
      due_to: filters.dueTo ? format(filters.dueTo, 'yyyy-MM-dd') : undefined,
      has_due_date: filters.hasDueDate,
      limit: 100
    });
  }, [search, workspace, filters]);

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = () => {
    return filters.searchText !== '' ||
           filters.status.length > 0 ||
           filters.priority.length > 0 ||
           filters.assignedTo !== '' ||
           filters.dateFrom ||
           filters.dateTo ||
           filters.dueFrom ||
           filters.dueTo ||
           filters.hasDueDate !== undefined;
  };

  const toggleArrayFilter = (array: string[], value: string) => {
    return array.includes(value) 
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const formatDate = (dateString: string | undefined) => {
    return dateString ? format(new Date(dateString), 'yyyy/MM/dd', { locale: ja }) : '';
  };

  const getDaysUntilDue = (daysUntilDue: number | undefined) => {
    if (daysUntilDue === undefined || daysUntilDue === null) return null;
    
    if (daysUntilDue < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {Math.abs(daysUntilDue)}日遅れ
        </Badge>
      );
    } else if (daysUntilDue === 0) {
      return (
        <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
          <CalendarIcon className="h-3 w-3 mr-1" />
          今日期限
        </Badge>
      );
    } else if (daysUntilDue <= 3) {
      return (
        <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700">
          <CalendarIcon className="h-3 w-3 mr-1" />
          あと{daysUntilDue}日
        </Badge>
      );
    }
    return null;
  };

  // 初回検索実行
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  return (
    <div className="space-y-6">
      {/* 検索フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            タスク検索
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 基本検索 */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="タスクを検索..."
                value={filters.searchText}
                onChange={(e) => setFilters({...filters, searchText: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? '検索中...' : '検索'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              詳細フィルター
            </Button>
          </div>

          {/* 詳細フィルター */}
          {showAdvanced && (
            <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* ステータス */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">ステータス</Label>
                  <div className="space-y-2">
                    {statusOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={filters.status.includes(option.value)}
                          onCheckedChange={() => 
                            setFilters({
                              ...filters, 
                              status: toggleArrayFilter(filters.status, option.value)
                            })
                          }
                        />
                        <label 
                          htmlFor={`status-${option.value}`}
                          className={`text-xs px-2 py-1 rounded ${option.color} cursor-pointer`}
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 優先度 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">優先度</Label>
                  <div className="space-y-2">
                    {priorityOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`priority-${option.value}`}
                          checked={filters.priority.includes(option.value)}
                          onCheckedChange={() => 
                            setFilters({
                              ...filters, 
                              priority: toggleArrayFilter(filters.priority, option.value)
                            })
                          }
                        />
                        <label 
                          htmlFor={`priority-${option.value}`}
                          className={`text-xs px-2 py-1 rounded ${option.color} cursor-pointer`}
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 期限日 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">期限日</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-due-date-true"
                        checked={filters.hasDueDate === true}
                        onCheckedChange={(checked) => 
                          setFilters({...filters, hasDueDate: checked ? true : undefined})
                        }
                      />
                      <label htmlFor="has-due-date-true" className="text-sm cursor-pointer">
                        期限あり
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-due-date-false"
                        checked={filters.hasDueDate === false}
                        onCheckedChange={(checked) => 
                          setFilters({...filters, hasDueDate: checked ? false : undefined})
                        }
                      />
                      <label htmlFor="has-due-date-false" className="text-sm cursor-pointer">
                        期限なし
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 日付範囲 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">作成日期間</Label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dateFrom ? formatDate(filters.dateFrom.toISOString()) : '開始日'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => setFilters({...filters, dateFrom: date})}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dateTo ? formatDate(filters.dateTo.toISOString()) : '終了日'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => setFilters({...filters, dateTo: date})}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">期限日期間</Label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dueFrom ? formatDate(filters.dueFrom.toISOString()) : '開始日'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dueFrom}
                          onSelect={(date) => setFilters({...filters, dueFrom: date})}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {filters.dueTo ? formatDate(filters.dueTo.toISOString()) : '終了日'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dueTo}
                          onSelect={(date) => setFilters({...filters, dueTo: date})}
                          locale={ja}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* クリアボタン */}
              {hasActiveFilters() && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    フィルターをクリア
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 検索結果 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>検索結果</CardTitle>
            {results && (
              <div className="text-sm text-gray-500">
                {results.total_count}件中 {results.tasks.length}件表示
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">検索中...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}

          {results && results.tasks.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2" />
              <p>該当するタスクが見つかりませんでした</p>
            </div>
          )}

          {results && results.tasks.length > 0 && (
            <div className="space-y-3">
              {results.tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <div className="flex items-center space-x-2">
                      {getDaysUntilDue(task.days_until_due)}
                      <Badge 
                        className={
                          statusOptions.find(s => s.value === task.status)?.color || 'bg-gray-100'
                        }
                      >
                        {statusOptions.find(s => s.value === task.status)?.label || task.status}
                      </Badge>
                      <Badge 
                        className={
                          priorityOptions.find(p => p.value === task.priority)?.color || 'bg-gray-100'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {task.assignee_name && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {task.assignee_name}
                      </div>
                    )}
                    
                    {task.team_name && (
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 mr-1" />
                        {task.team_name}
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(task.created_at)}
                    </div>
                    
                    {task.comment_count > 0 && (
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {task.comment_count}件
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {results.has_more && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => {
                    // さらに読み込みの実装
                    // offset を増やして再検索
                  }}>
                    さらに読み込む
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}