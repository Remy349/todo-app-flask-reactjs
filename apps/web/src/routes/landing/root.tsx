import { Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useAuthStore } from "@/stores/auth-store";
import { Navbar } from "./_components/navbar";

export const LandingRoot = () => {
  const { isLoggedIn } = useAuthStore();

  useSEO("TodoApp");

  if (isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <Navbar />
      <main className="mt-16 bg-muted/50 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
      <Toaster position="top-center" richColors />
    </>
  );
};
