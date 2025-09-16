"use client";

import Image from 'next/image';
import React, { useState, useCallback, useMemo } from 'react';

// 🚀 画像最適化の型定義
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

// 🚀 画像圧縮設定
const IMAGE_QUALITY_CONFIG = {
  high: 95,      // 重要な画像（ロゴ、ヒーローなど）
  medium: 85,    // 一般的な画像
  low: 75,       // サムネイル、装飾画像
  thumbnail: 60  // 小さなプレビュー画像
};

// 🚀 レスポンシブ画像サイズ設定
const RESPONSIVE_SIZES = {
  avatar: '(max-width: 768px) 40px, 48px',
  thumbnail: '(max-width: 768px) 120px, 150px',
  card: '(max-width: 768px) 280px, 350px',
  banner: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
  fullWidth: '100vw'
};

// 🚀 ブラー用のベース64画像生成
const generateBlurDataURL = (width: number, height: number, color = '#f3f4f6') => {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return '';

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL();
};

// 🚀 メインの最適化画像コンポーネント
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = IMAGE_QUALITY_CONFIG.medium,
  placeholder = 'blur',
  blurDataURL,
  className = '',
  sizes,
  fill = false,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 🚀 自動ブラーURL生成
  const autoBlurDataURL = useMemo(() => {
    if (blurDataURL) return blurDataURL;
    if (!width || !height) return undefined;
    return generateBlurDataURL(Math.min(width, 40), Math.min(height, 40));
  }, [blurDataURL, width, height]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // 🚀 エラー時のフォールバック画像
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={autoBlurDataURL}
        sizes={sizes}
        fill={fill}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 🚀 ローディング表示 */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
          style={{ width, height }}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// 🚀 特定用途向けの最適化コンポーネント

// アバター画像（高優先度、小サイズ）
export const OptimizedAvatar: React.FC<{
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}> = ({ src, alt, size = 'md', priority = false }) => {
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
  };

  const { width, height } = dimensions[size];

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={IMAGE_QUALITY_CONFIG.high}
      sizes={RESPONSIVE_SIZES.avatar}
      className={`rounded-full w-${width} h-${height}`}
    />
  );
};

// サムネイル画像（低品質、遅延読み込み）
export const OptimizedThumbnail: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={150}
    height={150}
    priority={false}
    quality={IMAGE_QUALITY_CONFIG.thumbnail}
    sizes={RESPONSIVE_SIZES.thumbnail}
    className={`rounded-lg ${className}`}
  />
);

// カード画像（レスポンシブ）
export const OptimizedCardImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={350}
    height={200}
    priority={false}
    quality={IMAGE_QUALITY_CONFIG.medium}
    sizes={RESPONSIVE_SIZES.card}
    className={`w-full h-48 object-cover ${className}`}
  />
);

// バナー画像（高品質、レスポンシブ）
export const OptimizedBanner: React.FC<{
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}> = ({ src, alt, priority = true, className = '' }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={1200}
    height={400}
    priority={priority}
    quality={IMAGE_QUALITY_CONFIG.high}
    sizes={RESPONSIVE_SIZES.banner}
    className={`w-full h-64 lg:h-80 object-cover ${className}`}
  />
);

// 🚀 画像プリローダー
export const preloadCriticalImages = async (imageSrcs: string[]) => {
  const preloadPromises = imageSrcs.map(src => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  });

  try {
    await Promise.all(preloadPromises);
    console.log('🖼️ Critical images preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Some images failed to preload:', error);
  }
};

// 🚀 画像観察用フック（Intersection Observer）
export const useImageVisibility = () => {
  const [visibleImages, setVisibleImages] = useState(new Set<string>());

  const observerRef = React.useRef<IntersectionObserver>();

  React.useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const imgSrc = (entry.target as HTMLImageElement).src;
          if (entry.isIntersecting) {
            setVisibleImages(prev => new Set(prev).add(imgSrc));
          }
        });
      },
      {
        rootMargin: '50px' // 50px前から読み込み開始
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const observeImage = useCallback((imgElement: HTMLImageElement | null) => {
    if (imgElement && observerRef.current) {
      observerRef.current.observe(imgElement);
    }
  }, []);

  return { visibleImages, observeImage };
};

// 🚀 WebPサポートチェック
export const useWebPSupport = () => {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);

  React.useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.startsWith('data:image/webp'));
    };

    checkWebPSupport();
  }, []);

  return supportsWebP;
};

// 🚀 画像最適化ユーティリティ
export const imageUtils = {
  // 画像URLに最適化パラメータを追加
  getOptimizedUrl: (src: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg';
  }) => {
    const url = new URL(src, window.location.origin);
    if (options.width) url.searchParams.set('w', options.width.toString());
    if (options.height) url.searchParams.set('h', options.height.toString());
    if (options.quality) url.searchParams.set('q', options.quality.toString());
    if (options.format) url.searchParams.set('f', options.format);
    return url.toString();
  },

  // レスポンシブ画像のsrcset生成
  generateSrcSet: (src: string, sizes: number[]) => {
    return sizes
      .map(size => `${imageUtils.getOptimizedUrl(src, { width: size })} ${size}w`)
      .join(', ');
  }
};

export default {
  OptimizedImage,
  OptimizedAvatar,
  OptimizedThumbnail,
  OptimizedCardImage,
  OptimizedBanner,
  preloadCriticalImages,
  useImageVisibility,
  useWebPSupport,
  imageUtils,
  IMAGE_QUALITY_CONFIG,
  RESPONSIVE_SIZES
};