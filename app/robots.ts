import { MetadataRoute } from 'next';

// 🚀 Phase 3 Stage 3: SEO最適化 - robots.txt生成

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://todo-app.example.com';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/workspace/team/*', // チームワークスペースは非公開
          '/admin/',
          '/_next/',
          '/.*\\.json$',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/workspace/team/*',
          '/admin/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}