import { MetadataRoute } from 'next';
import { seoManager } from '@/lib/seoManager';

// 🚀 Phase 3 Stage 3: 動的サイトマップ生成

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrls = seoManager.generateSitemapUrls();
  
  return baseUrls.map(url => ({
    url: url.url,
    lastModified: url.lastModified,
    changeFrequency: url.changeFrequency,
    priority: url.priority,
  }));
}