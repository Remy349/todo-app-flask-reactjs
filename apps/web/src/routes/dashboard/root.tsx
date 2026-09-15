import { Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useAuthStore } from "@/stores/auth-store";
import { Navbar } from "./_components/navbar";

export const DashboardRoot = () => {
  const { isLoggedIn } = useAuthStore();

  useSEO("Dashboard | TodoApp");

  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <Navbar />
      <main className="mt-16 bg-muted/50 min-h-[calc(100vh-4rem)]">
        <section className="cs-section">
          <div className="cs-container">
            <Outlet />
          </div>
        </section>
      </main>
      <Toaster position="top-center" richColors />
    </>
  );
};
