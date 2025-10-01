"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="text-center p-8 rounded-2xl backdrop-blur-md border bg-white/10 border-white/20 text-white">
        <h1 className="text-3xl font-bold mb-4">🎯 やることリスト</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-sm opacity-75">読み込み中...</p>
      </div>
    </div>
  );
}
