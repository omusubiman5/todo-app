"use client";

import React from 'react';
import Head from 'next/head';
import { seoManager, useTaskSEOData } from '@/lib/seoManager';
import { useWorkspace } from './WorkspaceProvider';
import { SharedTask } from '@/lib/types';

// 🚀 Phase 3 Stage 3: 動的SEO最適化コンポーネント

interface SEOOptimizerProps {
  tasks?: SharedTask[];
  pageTitle?: string;
  pageDescription?: string;
  customMetadata?: Record<string, string>;
}

const SEOOptimizer: React.FC<SEOOptimizerProps> = ({
  tasks = [],
  pageTitle,
  pageDescription,
  customMetadata = {}
}) => {
  const { currentWorkspace } = useWorkspace();
  
  // タスクデータからSEO情報を生成
  const taskSEOData = useTaskSEOData(tasks, currentWorkspace!);
  
  if (!currentWorkspace) return null;

  // ワークスペース固有のメタデータ生成
  const metadata = seoManager.generateWorkspaceMetadata(currentWorkspace, taskSEOData);
  
  // 構造化データ生成
  const structuredData = seoManager.generateStructuredData(taskSEOData, currentWorkspace);
  
  // プリロードリンク生成
  const preloadLinks = seoManager.generatePreloadLinks(currentWorkspace);

  // カスタムタイトル・説明の適用
  const finalTitle = pageTitle || metadata.title;
  const finalDescription = pageDescription || metadata.description;

  return (
    <Head>
      {/* 基本メタデータ */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      
      {/* Open Graph */}
      {metadata.openGraph && (
        <>
          <meta property="og:title" content={metadata.openGraph.title || finalTitle} />
          <meta property="og:description" content={metadata.openGraph.description || finalDescription} />
          <meta property="og:type" content={metadata.openGraph.type || 'website'} />
          <meta property="og:url" content={metadata.openGraph.url} />
          <meta property="og:site_name" content={metadata.openGraph.siteName} />
          
          {metadata.openGraph.images && Array.isArray(metadata.openGraph.images) && (
            metadata.openGraph.images.map((image, index) => {
              if (typeof image === 'string') {
                return <meta key={index} property="og:image" content={image} />;
              }
              return (
                <React.Fragment key={index}>
                  <meta property="og:image" content={image.url} />
                  {image.width && <meta property="og:image:width" content={image.width.toString()} />}
                  {image.height && <meta property="og:image:height" content={image.height.toString()} />}
                  {image.alt && <meta property="og:image:alt" content={image.alt} />}
                </React.Fragment>
              );
            })
          )}
        </>
      )}

      {/* Twitter Card */}
      {metadata.twitter && (
        <>
          <meta name="twitter:card" content={metadata.twitter.card} />
          <meta name="twitter:title" content={metadata.twitter.title || finalTitle} />
          <meta name="twitter:description" content={metadata.twitter.description || finalDescription} />
          {metadata.twitter.images && Array.isArray(metadata.twitter.images) && (
            metadata.twitter.images.map((image, index) => (
              <meta key={index} name="twitter:image" content={image} />
            ))
          )}
        </>
      )}

      {/* Canonical URL */}
      {metadata.alternates?.canonical && (
        <link rel="canonical" href={metadata.alternates.canonical} />
      )}

      {/* Robots */}
      {metadata.robots && (
        <meta 
          name="robots" 
          content={`${metadata.robots.index ? 'index' : 'noindex'},${metadata.robots.follow ? 'follow' : 'nofollow'}`} 
        />
      )}

      {/* カスタムメタデータ */}
      {Object.entries(customMetadata).map(([key, value]) => (
        <meta key={key} name={key} content={value} />
      ))}

      {/* プリロードリンク */}
      {preloadLinks.map((link, index) => (
        <React.Fragment key={index}>
          {React.createElement('div', { 
            dangerouslySetInnerHTML: { __html: link } 
          })}
        </React.Fragment>
      ))}

      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* パフォーマンス最適化 */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* リソースヒント */}
      {currentWorkspace.type === 'team' && (
        <link rel="prefetch" href={`/api/teams/${currentWorkspace.team_id}/members`} />
      )}
      
      {/* Progressive Web App メタデータ */}
      <meta name="theme-color" content="#1e293b" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="TodoApp" />
      
      {/* セキュリティヘッダー */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
    </Head>
  );
};

export default SEOOptimizer;