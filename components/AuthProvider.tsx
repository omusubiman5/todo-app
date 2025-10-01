"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAuthEvent } from "@/lib/authErrors";
import { logger, devLog } from "@/lib/logger";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionExpiry: Date | null;
  isSessionValid: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  checkSessionHealth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, requireAuth = false }: { children: ReactNode; requireAuth?: boolean }) {
  const [user, setUser] = useState<User | null>(() => {
    // In development mode, start with demo user to prevent redirect timing issues
    if (process.env.NODE_ENV === 'development') {
      return {
        id: 'demo-user',
        email: 'demo@example.com',
        user_metadata: {
          full_name: 'デモユーザー',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User;
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(() => {
    // In development mode, start with demo session to prevent redirect timing issues
    if (process.env.NODE_ENV === 'development') {
      const testUser = {
        id: 'demo-user',
        email: 'demo@example.com',
        user_metadata: {
          full_name: 'デモユーザー',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User;
      
      return {
        user: testUser,
        access_token: 'demo-token',
        refresh_token: 'demo-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer'
      } as Session;
    }
    return null;
  });
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true); // セッション取得まで loading=true に戻す
  const [sessionCheckInterval, setSessionCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // 強制的なタイムアウト - 5秒後に必ずloading=falseにする
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      devLog('Force timeout: Setting loading to false after 5 seconds');
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(forceTimeout);
  }, []);

  // Calculate session validity
  const isSessionValid = useCallback((): boolean => {
    if (!session || !sessionExpiry) return false;
    const now = new Date();
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();
    return timeUntilExpiry > 5 * 60 * 1000; // Valid if more than 5 minutes left
  }, [session, sessionExpiry]);

  // Refresh session proactively
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error.message);
        return false;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setSessionExpiry(new Date(data.session.expires_at! * 1000));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }, []);

  // Check session health
  const checkSessionHealth = useCallback((): boolean => {
    if (!session) return false;
    const valid = isSessionValid();
    if (!valid) {
      // Attempt refresh if session is about to expire
      refreshSession();
    }
    return valid;
  }, [session, isSessionValid, refreshSession]);

  useEffect(() => {
    let isMounted = true;
    
    const getSession = async () => {
      devLog('Starting session initialization...');
      
      try {
        // セキュリティ: Supabase管理のセッションのみ使用
        devLog('Security: Using Supabase-managed sessions only');
        
        // 2. Supabaseからセッション取得
        devLog('Fetching session from Supabase...');
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Get session error:', error.message);
          setLoading(false);
          return;
        }
        
        devLog('Session fetch result:', {
          hasSession: !!data.session,
          hasUser: !!data.session?.user,
          userEmail: data.session?.user?.email,
          expiresAt: data.session?.expires_at
        });
        
        if (data.session) {
          devLog('Session validated and ready');
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        if (data.session?.expires_at) {
          setSessionExpiry(new Date(data.session.expires_at * 1000));
        }
        
        // 開発環境: セッションがない場合はテストユーザーを設定
        if (!data.session && process.env.NODE_ENV === 'development') {
          console.log('🔧 開発環境: テストユーザーを設定');
          const testUser = {
            id: 'demo-user',
            email: 'demo@example.com',
            user_metadata: {
              full_name: 'デモユーザー',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User;
          
          setUser(testUser);
          setSession({
            user: testUser,
            access_token: 'demo-token',
            refresh_token: 'demo-refresh',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer'
          } as Session);
        }
        
        setLoading(false);
        devLog('Session initialization completed');
        
      } catch (error: unknown) {
        console.error('Session initialization error:', error instanceof Error ? error.message : String(error));
        
        if (isMounted) {
          // 開発環境: エラー時でもテストユーザーを設定
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 開発環境: エラー時もテストユーザーを設定');
            const testUser = {
              id: 'demo-user',
              email: 'demo@example.com',
              user_metadata: {
                full_name: 'デモユーザー',
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            
            setUser(testUser);
            setSession({
              user: testUser,
              access_token: 'demo-token',
              refresh_token: 'demo-refresh',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: 'bearer'
            } as Session);
          } else {
            setSession(null);
            setUser(null);
            setSessionExpiry(null);
          }
          setLoading(false);
        }
      }
    };
    
    // 強制タイムアウト（15秒）
    const forceTimeout = setTimeout(() => {
      if (isMounted) {
        logger.warn('Session initialization timeout, proceeding without session');
        setLoading(false);
      }
    }, 15000);

    getSession();
    
    return () => {
      isMounted = false;
      clearTimeout(forceTimeout);
    };
    
  }, []);
    
  // 認証状態変更の監視を別のuseEffectで管理
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      devLog('Auth state change:', event, session ? 'with session' : 'without session');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.expires_at) {
        setSessionExpiry(new Date(session.expires_at * 1000));
      } else {
        setSessionExpiry(null);
      }
      
      setLoading(false);
      
      // セキュリティ: セッション状態はSupabaseが管理
      devLog('Security: Session state managed by Supabase');
      
      // Enhanced auth event logging
      if (event === 'SIGNED_IN' && session?.user) {
        logAuthEvent('login_success', {
          userId: session.user.id,
          userAgent: navigator.userAgent
        });
      } else if (event === 'SIGNED_OUT') {
        logAuthEvent('logout', {
          userId: user?.id,
          userAgent: navigator.userAgent
        });
      }
      
      // Navigation logic (middleware無効化中は自前で管理)
      if (!session && requireAuth && pathname !== '/login') {
        devLog('Redirecting to login due to no session');
        router.replace("/login");
      }
      if (session && pathname === "/login") {
        devLog('Redirecting to home due to active session');
        router.replace("/home");
      }
    });
    
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, requireAuth, pathname, user?.id]); // user?.id のみを依存関係に追加

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.replace("/login");
    }
  }, [loading, user, requireAuth, router]);

  const login = () => {
    router.push("/login");
  };

  const logout = useCallback(async () => {
    try {
      // Log logout attempt
      logAuthEvent('logout', {
        userId: user?.id,
        userAgent: navigator.userAgent
      });
      
      // Clear session check interval
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setSessionExpiry(null);
      
      // Navigate to login
      router.replace("/login");
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even if logout fails
      router.replace("/login");
    }
  }, [user, sessionCheckInterval, router]);

  // Set up session health monitoring
  useEffect(() => {
    if (session && !sessionCheckInterval) {
      const interval = setInterval(() => {
        checkSessionHealth();
      }, 60000); // Check every minute
      
      setSessionCheckInterval(interval);
    } else if (!session && sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      setSessionCheckInterval(null);
    }
    
    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [session, sessionCheckInterval, checkSessionHealth]);

  // Auto-refresh session when it's about to expire
  useEffect(() => {
    if (!session || !sessionExpiry) return;
    
    const timeUntilExpiry = sessionExpiry.getTime() - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - (10 * 60 * 1000), 60000); // Refresh 10 min before expiry, minimum 1 min
    
    if (refreshTime > 0) {
      const timeout = setTimeout(() => {
        refreshSession();
      }, refreshTime);
      
      return () => clearTimeout(timeout);
    }
  }, [session, sessionExpiry, refreshSession]);

  // Session validity check
  const currentSessionValid = isSessionValid();
  
  // 開発環境: 認証完全スルーモード
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  const shouldShowChildren = bypassAuth || !requireAuth || (requireAuth && !loading && user && currentSessionValid);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      sessionExpiry,
      isSessionValid: currentSessionValid,
      loading, 
      login, 
      logout,
      refreshSession,
      checkSessionHealth
    }}>
      {shouldShowChildren ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 