"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, requireAuth = false }: { children: ReactNode; requireAuth?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session && requireAuth) {
        router.replace("/login");
      }
      if (session && pathname === "/login") {
        router.replace("/");
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, requireAuth, pathname]);

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.replace("/login");
    }
  }, [loading, user, requireAuth, router]);

  const login = () => {
    router.push("/login");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {(!requireAuth || (requireAuth && !loading && user)) ? children : null}
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