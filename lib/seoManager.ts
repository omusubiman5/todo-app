"use client";

import { Metadata } from 'next';
import { SharedTask, WorkspaceContext } from '@/lib/types';

// 🚀 Phase 3 Stage 3: SEO最適化とメタデータ管理システム

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noIndex?: boolean;
  structuredData?: Record<string, any>;
}

interface TaskSEOData {
  taskCount: number;
  completedCount: number;
  priorityBreakdown: Record<string, number>;
  lastUpdated: string;
  workspaceType: 'personal' | 'team';
  teamName?: string;
}

export class SEOManager {
  private static instance: SEOManager;
  private baseUrl: string;
  private siteName: string;
  private defaultImage: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://todo-app.example.com';
    this.siteName = 'TodoApp - 効率的なタスク管理';
    this.defaultImage = `${this.baseUrl}/images/og-default.png`;
  }

  public static getInstance(): SEOManager {
    if (!SEOManager.instance) {
      SEOManager.instance = new SEOManager();
    }
    return SEOManager.instance;
  }

  // メインページのメタデータ生成
  public generateMainPageMetadata(): Metadata {
    return {
      title: 'TodoApp - 効率的なタスク管理アプリ',
      description: 'React 19とSupabaseで構築された高性能なタスク管理アプリ。チーム協業、リアルタイム同期、アクセシビリティ対応。',
      keywords: ['タスク管理', 'todo', 'プロジェクト管理', 'チーム協業', 'React', 'Next.js'],
      authors: [{ name: 'TodoApp Team' }],
      creator: 'TodoApp',
      publisher: 'TodoApp',
      
      // Open Graph
      openGraph: {
        title: 'TodoApp - 効率的なタスク管理',
        description: 'チーム協業とリアルタイム同期に対応した次世代タスク管理アプリ',
        url: this.baseUrl,
        siteName: this.siteName,
        images: [
          {
            url: this.defaultImage,
            width: 1200,
            height: 630,
            alt: 'TodoApp - タスク管理アプリ',
          }
        ],
        locale: 'ja_JP',
        type: 'website',
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        title: 'TodoApp - 効率的なタスク管理',
        description: 'チーム協業とリアルタイム同期に対応した次世代タスク管理アプリ',
        images: [this.defaultImage],
        creator: '@todoapp',
      },

      // 技術的メタデータ
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },

      // その他
      alternates: {
        canonical: this.baseUrl,
      },
      
      category: 'productivity',
    };
  }

  // ワークスペース固有のメタデータ生成
  public generateWorkspaceMetadata(
    workspace: WorkspaceContext, 
    taskData?: TaskSEOData
  ): Metadata {
    const isTeam = workspace.type === 'team';
    const workspaceName = isTeam ? workspace.team_name : 'マイワークスペース';
    
    const title = `${workspaceName} - TodoApp`;
    const description = taskData 
      ? `${workspaceName}のタスク管理。${taskData.taskCount}件のタスク（${taskData.completedCount}件完了）`
      : `${workspaceName}でのタスク管理とプロジェクト進行`;

    const url = isTeam 
      ? `${this.baseUrl}/workspace/team/${workspace.team_id}`
      : `${this.baseUrl}/workspace/personal`;

    return {
      title,
      description,
      
      openGraph: {
        title,
        description,
        url,
        siteName: this.siteName,
        images: [
          {
            url: this.generateWorkspaceOGImage(workspace, taskData),
            width: 1200,
            height: 630,
            alt: `${workspaceName}のタスク管理ダッシュボード`,
          }
        ],
        type: 'article',
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [this.generateWorkspaceOGImage(workspace, taskData)],
      },

      alternates: {
        canonical: url,
      },

      robots: {
        index: !isTeam, // チームページは検索エンジンにインデックスしない
        follow: true,
      },
    };
  }

  // 構造化データの生成
  public generateStructuredData(taskData: TaskSEOData, workspace: WorkspaceContext) {
    const baseStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'TodoApp',
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web Browser',
      url: this.baseUrl,
      description: '効率的なタスク管理とチーム協業のためのWebアプリケーション',
      author: {
        '@type': 'Organization',
        name: 'TodoApp Team',
      },
      dateModified: taskData.lastUpdated,
    };

    // ワークスペース固有の構造化データ
    if (workspace.type === 'team' && workspace.team_name) {
      return {
        ...baseStructuredData,
        '@type': ['WebApplication', 'CollaborativeWorkspace'],
        workspaceType: 'team',
        teamName: workspace.team_name,
        taskStatistics: {
          '@type': 'QuantitativeValue',
          totalTasks: taskData.taskCount,
          completedTasks: taskData.completedCount,
          completionRate: Math.round((taskData.completedCount / taskData.taskCount) * 100),
        },
      };
    }

    return baseStructuredData;
  }

  // OGイメージ生成用URL
  private generateWorkspaceOGImage(workspace: WorkspaceContext, taskData?: TaskSEOData): string {
    const params = new URLSearchParams({
      type: workspace.type,
      name: workspace.type === 'team' ? workspace.team_name || 'Team' : 'Personal',
      ...(taskData && {
        tasks: taskData.taskCount.toString(),
        completed: taskData.completedCount.toString(),
      }),
    });

    return `${this.baseUrl}/api/og?${params.toString()}`;
  }

  // JSON-LD構造化データの注入
  public injectStructuredData(structuredData: Record<string, any>): string {
    return `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
  }

  // パフォーマンス最適化のためのプリロード
  public generatePreloadLinks(workspace: WorkspaceContext): string[] {
    const preloads = [
      `<link rel="preload" href="/fonts/geist-sans.woff2" as="font" type="font/woff2" crossorigin>`,
      `<link rel="preload" href="/api/tasks" as="fetch" crossorigin>`,
    ];

    if (workspace.type === 'team') {
      preloads.push(
        `<link rel="preload" href="/api/teams/${workspace.team_id}" as="fetch" crossorigin>`
      );
    }

    return preloads;
  }

  // サイトマップ用のURL生成
  public generateSitemapUrls(): Array<{
    url: string;
    lastModified: Date;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
  }> {
    return [
      {
        url: this.baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${this.baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/features`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ];
  }
}

// ユーティリティ関数
export const seoManager = SEOManager.getInstance();

// フック：タスクデータからSEO情報を生成
export function useTaskSEOData(tasks: SharedTask[], workspace: WorkspaceContext): TaskSEOData {
  const taskCount = tasks.length;
  const completedCount = tasks.filter(task => task.completed).length;
  
  const priorityBreakdown = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lastUpdated = tasks.length > 0 
    ? Math.max(...tasks.map(task => new Date(task.updated_at || task.created_at).getTime()))
    : Date.now();

  return {
    taskCount,
    completedCount,
    priorityBreakdown,
    lastUpdated: new Date(lastUpdated).toISOString(),
    workspaceType: workspace.type,
    teamName: workspace.type === 'team' ? workspace.team_name : undefined,
  };
}

// メタタグ生成ヘルパー
export function generateMetaTags(metadata: Metadata): string {
  const tags: string[] = [];

  if (metadata.title) {
    tags.push(`<title>${metadata.title}</title>`);
  }

  if (metadata.description) {
    tags.push(`<meta name="description" content="${metadata.description}">`);
  }

  if (metadata.keywords && Array.isArray(metadata.keywords)) {
    tags.push(`<meta name="keywords" content="${metadata.keywords.join(', ')}">`);
  }

  // Open Graph tags
  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) tags.push(`<meta property="og:title" content="${og.title}">`);
    if (og.description) tags.push(`<meta property="og:description" content="${og.description}">`);
    if (og.url) tags.push(`<meta property="og:url" content="${og.url}">`);
    if (og.type) tags.push(`<meta property="og:type" content="${og.type}">`);
    if (og.siteName) tags.push(`<meta property="og:site_name" content="${og.siteName}">`);
    
    if (og.images && Array.isArray(og.images)) {
      og.images.forEach(image => {
        if (typeof image === 'string') {
          tags.push(`<meta property="og:image" content="${image}">`);
        } else {
          tags.push(`<meta property="og:image" content="${image.url}">`);
          if (image.width) tags.push(`<meta property="og:image:width" content="${image.width}">`);
          if (image.height) tags.push(`<meta property="og:image:height" content="${image.height}">`);
          if (image.alt) tags.push(`<meta property="og:image:alt" content="${image.alt}">`);
        }
      });
    }
  }

  // Twitter Card tags
  if (metadata.twitter) {
    const twitter = metadata.twitter;
    if (twitter.card) tags.push(`<meta name="twitter:card" content="${twitter.card}">`);
    if (twitter.title) tags.push(`<meta name="twitter:title" content="${twitter.title}">`);
    if (twitter.description) tags.push(`<meta name="twitter:description" content="${twitter.description}">`);
    if (twitter.creator) tags.push(`<meta name="twitter:creator" content="${twitter.creator}">`);
    
    if (twitter.images && Array.isArray(twitter.images)) {
      twitter.images.forEach(image => {
        tags.push(`<meta name="twitter:image" content="${image}">`);
      });
    }
  }

  return tags.join('\n');
}