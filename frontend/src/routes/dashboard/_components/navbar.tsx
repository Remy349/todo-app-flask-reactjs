import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

export const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 w-full bg-background z-50 border-b">
      <nav className="flex items-center justify-between h-16 cs-container">
        <Link to="/dashboard" className="font-bold text-lg">
          TodoApp
        </Link>
        <Button
          className="font-medium"
          size="sm"
          variant="outline"
          onClick={() => navigate("/")}
        >
          Logout
        </Button>
      </nav>
    </header>
  );
};
