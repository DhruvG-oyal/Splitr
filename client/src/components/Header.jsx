import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logos/logo.png"
            alt="Splitr Logo"
            className="h-11 w-auto object-contain"
          />
        </Link>

        {isLanding && (
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-green-600 transition">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-green-600 transition">
              How It Works
            </a>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="outline" className="hidden md:inline-flex items-center gap-2 hover:text-green-600 hover:border-green-600 transition">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/insights">
                <Button variant="ghost" className="hidden md:inline-flex items-center gap-2 hover:text-green-600 transition">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback>{user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/sign-up">
                <Button className="bg-green-600 hover:bg-green-700 border-none">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
