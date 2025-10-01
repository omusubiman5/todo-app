/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像最適化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zmxnsfjmusgmapxbcbpn.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // 🚀 最新の画像最適化設定
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1年キャッシュ
    dangerouslyAllowSVG: true, // SVGを許可
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // SVG用のCSP
  },

  // パフォーマンス最適化
  reactStrictMode: true,

  // 🚀 強化された実験的機能
  experimental: {
    // App Routerでのコード分割最適化
    optimizePackageImports: [
      'react-icons',
      'recharts',
      'lucide-react',
      '@supabase/auth-ui-react',
      '@tanstack/react-query'
    ],
    // 🚀 新しい最適化機能
    optimizeCss: true, // CSS最適化
    scrollRestoration: true, // スクロール位置復元
    largePageDataBytes: 128 * 1000, // 128KB - 大きなページデータのしきい値
    serverComponentsExternalPackages: [
      '@supabase/supabase-js',
      '@supabase/auth-js'
    ], // サーバーコンポーネントで外部パッケージを使用
  },

  // ワークスペース設定
  outputFileTracingRoot: __dirname,

  // 🚀 大幅に強化されたWebpack設定
  webpack: (config, { dev, isServer, webpack }) => {
    // 🚀 プロダクション環境の最適化
    if (!dev) {
      // Tree shaking強化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // 🚀 より積極的なminification
      config.optimization.minimizer.push(
        new webpack.optimize.ModuleConcatenationPlugin() // Scope hoisting
      );

      // 🚀 最適化されたチャンク分割戦略
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000, // 20KB
        maxSize: 244000, // 244KB max chunk size
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        cacheGroups: {
          // ⚡ Core React libraries - 最優先
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            priority: 100,
            chunks: 'all',
            reuseExistingChunk: true,
            enforce: true, // 必ず分割
          },

          // ⚡ Next.js core - 2番目の優先度
          nextjs: {
            test: /[\\/]node_modules[\\/](next)[\\/]/,
            name: 'nextjs-core',
            priority: 90,
            chunks: 'all',
            reuseExistingChunk: true,
          },

          // ⚡ Supabase core（軽量・必須）
          supabaseCore: {
            test: /[\\/]node_modules[\\/]@supabase[\\/](supabase-js|auth-js|ssr)[\\/]/,
            name: 'supabase-core',
            priority: 80,
            chunks: 'all',
            reuseExistingChunk: true,
          },

          // 🎨 UI Libraries（頻繁に使用）
          ui: {
            test: /[\\/]node_modules[\\/](@supabase[\\/](auth-ui-react|auth-ui-shared)|@tanstack[\\/]react-query)[\\/]/,
            name: 'ui-libs',
            priority: 70,
            chunks: 'all',
            reuseExistingChunk: true,
          },

          // 📊 Charts library（重い、遅延読み込み推奨）
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            name: 'charts',
            priority: 60,
            chunks: 'async',
            reuseExistingChunk: true,
          },

          // 🎯 Icons（オンデマンド読み込み）
          icons: {
            test: /[\\/]node_modules[\\/](react-icons|lucide-react)[\\/]/,
            name: 'icons',
            priority: 50,
            chunks: 'async',
            reuseExistingChunk: true,
          },

          // 🔧 Utilities
          utils: {
            test: /[\\/]node_modules[\\/](date-fns|lodash|ramda|clsx|classnames)[\\/]/,
            name: 'utils',
            priority: 40,
            chunks: 'all',
            reuseExistingChunk: true,
          },

          // 📦 Large vendors（細分化）
          largeVendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1];

              if (!packageName) return 'vendor-misc';

              // パッケージサイズベースでの分類
              const largePackages = [
                '@supabase', 'react-query', 'recharts',
                'react-icons', 'lucide-react'
              ];

              const isLarge = largePackages.some(pkg => packageName.startsWith(pkg));
              const cleanName = packageName.replace('@', '').replace('/', '-');

              return isLarge ? `vendor-${cleanName}` : 'vendor-small';
            },
            priority: 30,
            chunks: 'all',
            minChunks: 1,
            maxSize: 100000, // 100KB max for vendor chunks
            reuseExistingChunk: true,
          },

          // 🏠 App common code
          common: {
            name: 'common',
            minChunks: 2,
            priority: 20,
            chunks: 'all',
            reuseExistingChunk: true,
            maxSize: 50000, // 50KB
          },

          // 🎨 CSS chunks
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            priority: 10,
            chunks: 'all',
            enforce: true,
          },
        },
      };

      // 🚀 モジュール解決の最適化
      config.resolve.alias = {
        ...config.resolve.alias,
        // React DevToolsを本番から除外
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      };

      // 🚀 未使用のエクスポートを削除
      config.optimization.providedExports = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // 🚀 全環境での最適化
    // Bundle analyzer用の設定
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.ANALYZE': JSON.stringify('true')
        })
      );
    }

    // 🚀 動的importの最適化
    config.module.rules.push({
      test: /\.(tsx|ts)$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            plugins: [
              // 動的importを最適化
              ['babel-plugin-import', {
                libraryName: 'react-icons',
                libraryDirectory: '',
                camel2DashComponentName: false,
              }, 'react-icons'],
              ['babel-plugin-import', {
                libraryName: 'lucide-react',
                libraryDirectory: 'dist/esm/icons',
                camel2DashComponentName: false,
              }, 'lucide-react'],
            ],
          },
        },
      ],
      exclude: /node_modules/,
    });

    return config;
  },

  // 🚀 出力最適化
  output: 'standalone',
  poweredByHeader: false,
  compress: true, // gzip圧縮を有効化

  // 🚀 新しいヘッダー最適化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // 🚀 静的アセットのキャッシュ最適化
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// 🚀 Bundle analyzer有効時の設定
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
    openAnalyzer: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}