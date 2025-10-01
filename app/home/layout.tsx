import { AuthProvider } from "@/components/AuthProvider";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In development mode, disable auth requirement to avoid redirect loops
  const requireAuth = process.env.NODE_ENV === 'development' ? false : true;
  
  return (
    <AuthProvider requireAuth={requireAuth}>
      {children}
    </AuthProvider>
  );
}
