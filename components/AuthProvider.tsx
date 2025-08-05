"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAuthEvent } from "@/lib/authErrors";
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCheckInterval, setSessionCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Get session error:', error.message);
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
        
        if (data.session?.expires_at) {
          setSessionExpiry(new Date(data.session.expires_at * 1000));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Session initialization error:', error);
        setLoading(false);
      }
    };
    
    getSession();
    
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.expires_at) {
        setSessionExpiry(new Date(session.expires_at * 1000));
      } else {
        setSessionExpiry(null);
      }
      
      setLoading(false);
      
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
      
      // Navigation logic
      if (!session && requireAuth && pathname !== '/login') {
        router.replace("/login");
      }
      if (session && pathname === "/login") {
        router.replace("/");
      }
    });
    
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, requireAuth, pathname, user]);

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

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      sessionExpiry,
      isSessionValid: isSessionValid(),
      loading, 
      login, 
      logout,
      refreshSession,
      checkSessionHealth
    }}>
      {(!requireAuth || (requireAuth && !loading && user && isSessionValid())) ? children : null}
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