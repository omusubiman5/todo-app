// アイコンコンポーネントの動的ロード用
"use client";

import dynamic from "next/dynamic";

// よく使われるアイコンのみを動的インポート
export const FaRocket = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaRocket })), { ssr: false });
export const FaMoon = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaMoon })), { ssr: false });
export const FaSun = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaSun })), { ssr: false });
export const FaWifi = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaWifi })), { ssr: false });
export const FaExclamationTriangle = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaExclamationTriangle })), { ssr: false });
export const FaUser = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaUser })), { ssr: false });
export const FaSignOutAlt = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaSignOutAlt })), { ssr: false });
export const FaKey = dynamic(() => import("react-icons/fa").then(mod => ({ default: mod.FaKey })), { ssr: false });

// フォールバック用の軽量アイコン
export const LoadingIcon = () => (
  <div className="animate-pulse w-4 h-4 bg-current opacity-50 rounded"></div>
);

// アイコンのローディング中のフォールバック
const iconLoadingProps = {
  loading: () => <LoadingIcon />
};

// よく使われるアイコンをプリロード用オブジェクトとしてエクスポート
export const preloadIcons = {
  FaRocket,
  FaMoon,
  FaSun,
  FaWifi,
  FaExclamationTriangle,
  FaUser,
  FaSignOutAlt,
  FaKey
};