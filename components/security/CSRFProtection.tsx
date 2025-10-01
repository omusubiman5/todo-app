"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { securityManager } from '@/lib/security/securityManager';

// 🚀 Phase 3 Stage 3: CSRF保護プロバイダー

interface CSRFContextType {
  token: string | null;
  refreshToken: () => void;
  addCSRFToRequest: (data: any) => any;
  addCSRFToHeaders: (headers: Record<string, string>) => Record<string, string>;
}

const CSRFContext = createContext<CSRFContextType | null>(null);

interface CSRFProtectionProps {
  children: React.ReactNode;
}

export function CSRFProtection({ children }: CSRFProtectionProps) {
  const [token, setToken] = useState<string | null>(null);
  
  // 初期トークン生成
  useEffect(() => {
    generateNewToken();
  }, []);
  
  const generateNewToken = () => {
    const userAgent = navigator.userAgent;
    const newToken = securityManager.generateCSRFToken(userAgent);
    setToken(newToken);
  };
  
  const refreshToken = () => {
    generateNewToken();
  };
  
  const addCSRFToRequest = (data: any) => {
    if (!token) return data;
    return { ...data, _csrf: token };
  };
  
  const addCSRFToHeaders = (headers: Record<string, string> = {}) => {
    if (!token) return headers;
    return { ...headers, 'X-CSRF-Token': token };
  };
  
  // トークンの定期更新（25分ごと）
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      refreshToken();
    }, 25 * 60 * 1000); // 25分
    
    return () => clearInterval(interval);
  }, [token]);
  
  const contextValue: CSRFContextType = {
    token,
    refreshToken,
    addCSRFToRequest,
    addCSRFToHeaders,
  };
  
  return (
    <CSRFContext.Provider value={contextValue}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF(): CSRFContextType {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within CSRFProtection');
  }
  return context;
}

// セキュアフェッチヘルパー
export function useSecureFetch() {
  const csrf = useCSRF();
  
  const secureFetch = async (url: string, options: RequestInit = {}) => {
    const headers = csrf.addCSRFToHeaders(options.headers as Record<string, string>);
    
    // XSS検出チェック（POSTデータ）
    if (options.body && typeof options.body === 'string') {
      try {
        const parsedBody = JSON.parse(options.body);
        const hasXSS = checkForXSS(parsedBody);
        
        if (hasXSS) {
          console.warn('Potential XSS detected in request body');
          throw new Error('Invalid request data');
        }
      } catch (e) {
        // JSON以外のbodyまたはXSS検出エラー
        if (e instanceof Error && e.message === 'Invalid request data') {
          throw e;
        }
      }
    }
    
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'same-origin', // CSRF攻撃防止
    };
    
    return fetch(url, secureOptions);
  };
  
  return { secureFetch };
}

// 再帰的XSSチェック
function checkForXSS(obj: any, depth = 0): boolean {
  if (depth > 10) return false; // 深すぎる場合は停止
  
  if (typeof obj === 'string') {
    return securityManager.detectXSS(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.some(item => checkForXSS(item, depth + 1));
  }
  
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(value => checkForXSS(value, depth + 1));
  }
  
  return false;
}

// セキュアフォームヘルパー
interface SecureFormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  className?: string;
}

export function SecureForm({ onSubmit, children, className }: SecureFormProps) {
  const csrf = useCSRF();
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    // 入力値のサニタイゼーション
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        const sanitized = securityManager.sanitizeInput(value);
        
        // XSS検出
        if (securityManager.detectXSS(value)) {
          console.warn(`Potential XSS detected in field: ${key}`);
          return acc; // 危険なフィールドは除外
        }
        
        acc[key] = sanitized;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // CSRFトークン追加
    const secureData = csrf.addCSRFToRequest(sanitizedData);
    onSubmit(secureData);
  };
  
  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      {/* Hidden CSRF token field */}
      <input 
        type="hidden" 
        name="_csrf" 
        value={csrf.token || ''} 
      />
    </form>
  );
}

// セキュリティ状態表示コンポーネント（開発用）
export function SecurityStatus() {
  const csrf = useCSRF();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
      <div>CSRF: {csrf.token ? '✅' : '❌'}</div>
      <div>Token: {csrf.token?.slice(0, 8)}...</div>
    </div>
  );
}