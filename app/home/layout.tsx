import { AuthProvider } from "@/components/AuthProvider";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider requireAuth={true}>
      {children}
    </AuthProvider>
  );
}