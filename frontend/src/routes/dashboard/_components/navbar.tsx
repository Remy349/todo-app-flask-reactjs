import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const Navbar = () => {
  const navigate = useNavigate();
  const { logout, role } = useAuthStore();
  const isAdmin = role === "admin" || role === "admin_viewer" || role === "admin_manager";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-background z-50 border-b">
      <nav className="flex items-center justify-between h-16 cs-container">
        <Link to="/dashboard" className="font-bold text-lg">
          TodoApp
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button asChild className="font-medium" size="sm" variant="outline">
              <Link to="/admin">
                <Shield />
                Admin
              </Link>
            </Button>
          ) : null}
          <Button
            className="font-medium"
            size="sm"
            variant="outline"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </nav>
    </header>
  );
};
