import { Navigate, Outlet } from "react-router-dom";
import { Navbar } from "./_components/navbar";
import { useSEO } from "@/hooks/useSEO";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

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
