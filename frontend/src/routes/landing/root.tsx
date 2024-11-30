import { Navigate, Outlet } from "react-router-dom";
import { Navbar } from "./_components/navbar";
import { Toaster } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useAuthStore } from "@/stores/auth-store";

export const LandingRoot = () => {
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }

  useSEO("TodoApp");

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
