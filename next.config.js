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
  },
  
  // パフォーマンス最適化  
  reactStrictMode: true,
  
  // 実験的機能
  experimental: {
    // App Routerでのコード分割最適化
    optimizePackageImports: ['react-icons', 'recharts'],
    // Bundle analyzer設定
    ...(process.env.ANALYZE === 'true' && {
      bundlePagesRouterDependencies: true,
    }),
  },

  // Webpack設定最適化
  webpack: (config, { dev, isServer }) => {
    // 本番環境での最適化
    if (!dev && !isServer) {
      // Tree shaking強化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // 重複除去
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },

  // 出力最適化
  output: 'standalone',
  poweredByHeader: false,
};

// Bundle analyzer有効時の設定
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}