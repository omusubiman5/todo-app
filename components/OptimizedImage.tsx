/**
 * 🚀 最適化されたImageコンポーネント
 * Next.js Imageのベストプラクティスを適用
 */

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
  /** 画像の種類（最適化設定を自動選択） */
  type?: 'avatar' | 'profile' | 'banner' | 'thumbnail' | 'icon';
  /** カスタムblurDataURL（指定しない場合は自動生成） */
  customBlur?: string;
  /** エラー時のフォールバック画像 */
  fallbackSrc?: string;
}

// 🎨 画像タイプ別のデフォルト設定
const IMAGE_PRESETS = {
  avatar: {
    quality: 80,
    priority: false,
    sizes: '(max-width: 768px) 40px, 64px',
  },
  profile: {
    quality: 90,
    priority: true,
    sizes: '(max-width: 768px) 96px, 128px',
  },
  banner: {
    quality: 85,
    priority: true,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  },
  thumbnail: {
    quality: 75,
    priority: false,
    sizes: '(max-width: 768px) 80px, 120px',
  },
  icon: {
    quality: 95,
    priority: false,
    sizes: '24px',
  },
};

// 🌫️ デフォルトblurデータURL（8x8の軽量版）
const DEFAULT_BLUR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";

export default function OptimizedImage({
  type = 'thumbnail',
  customBlur,
  fallbackSrc,
  alt,
  onError,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(props.src);
  const [isError, setIsError] = useState(false);
  
  const preset = IMAGE_PRESETS[type];
  
  // エラーハンドリング
  const handleError = () => {
    setIsError(true);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    onError?.();
  };

  // エラー時のフォールバック表示
  if (isError && !fallbackSrc) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center text-gray-400 ${props.className || ''}`}
        style={{
          width: props.width,
          height: props.height,
        }}
      >
        <svg
          className="w-1/3 h-1/3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      // 🚀 最適化設定を自動適用
      quality={props.quality || preset.quality}
      priority={props.priority !== undefined ? props.priority : preset.priority}
      sizes={props.sizes || preset.sizes}
      placeholder="blur"
      blurDataURL={customBlur || DEFAULT_BLUR}
      loading={preset.priority ? undefined : "lazy"}
      onError={handleError}
    />
  );
}

// 🎯 使用例とタイプ別コンポーネント
export function AvatarImage(props: Omit<OptimizedImageProps, 'type'>) {
  return <OptimizedImage {...props} type="avatar" />;
}

export function ProfileImage(props: Omit<OptimizedImageProps, 'type'>) {
  return <OptimizedImage {...props} type="profile" />;
}

export function BannerImage(props: Omit<OptimizedImageProps, 'type'>) {
  return <OptimizedImage {...props} type="banner" />;
}

export function ThumbnailImage(props: Omit<OptimizedImageProps, 'type'>) {
  return <OptimizedImage {...props} type="thumbnail" />;
}

export function IconImage(props: Omit<OptimizedImageProps, 'type'>) {
  return <OptimizedImage {...props} type="icon" />;
}