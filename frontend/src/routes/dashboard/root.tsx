import { Outlet } from "react-router-dom";
import { Navbar } from "./_components/navbar";
import { useSEO } from "@/hooks/useSEO";

export const DashboardRoot = () => {
  useSEO("Dashboard | TodoApp");

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
    </>
  );
};
