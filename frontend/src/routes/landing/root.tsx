import { Outlet } from "react-router-dom";
import { Navbar } from "./_components/navbar";

export const LandingRoot = () => {
  return (
    <>
      <Navbar />
      <main className="mt-16 bg-muted/50 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </>
  );
};
