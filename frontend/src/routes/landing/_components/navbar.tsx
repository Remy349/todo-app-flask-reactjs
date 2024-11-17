import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 w-full bg-background z-50 border-b">
      <nav className="flex items-center h-16 cs-container">
        <Link to="/" className="font-bold text-lg">
          TodoApp
        </Link>
      </nav>
    </header>
  );
};
