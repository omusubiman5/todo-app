"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/");
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 bg-white/10">
        <h1 className="text-3xl font-bold text-center mb-6 text-white drop-shadow-lg">ログイン / 新規登録</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#6366f1',
                  brandAccent: '#a78bfa',
                  inputBorder: '#a5b4fc',
                  inputLabelText: '#fff',
                  inputText: '#fff',
                  messageText: '#fff',
                  anchorTextColor: '#fbbf24',
                  brandButtonText: '#fff',
                  defaultButtonBackground: '#6366f1',
                  defaultButtonBorder: '#a5b4fc',
                  inputBackground: 'rgba(255,255,255,0.1)',
                  inputPlaceholder: '#c7d2fe',
                },
              },
            },
          }}
          providers={[]}
          theme="dark"
        />
      </div>
    </div>
  );
} 