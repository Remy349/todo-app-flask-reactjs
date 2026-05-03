import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { Link, useNavigate, useLocation } from "react-router-dom";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isArchivedPage = location.pathname === "/dashboard/archived";

  return (
    <header className="fixed top-0 left-0 w-full bg-background z-50 border-b">
      <nav className="flex items-center justify-between h-16 cs-container">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg">
            TodoApp
          </Link>
          <div className="flex gap-2">
            <Button
              variant={isArchivedPage ? "outline" : "default"}
              size="sm"
              asChild
            >
              <Link to="/dashboard">Tasks</Link>
            </Button>
            <Button
              variant={isArchivedPage ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link to="/dashboard/archived">Archived</Link>
            </Button>
          </div>
        </div>
        <Button
          className="font-medium"
          size="sm"
          variant="outline"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </nav>
    </header>
  );
};
