import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import DashboardPage from "@/pages/DashboardPage";
import ContactsPage from "@/pages/ContactsPage";
import NewExpensePage from "@/pages/NewExpensePage";
import GroupPage from "@/pages/GroupPage";
import PersonPage from "@/pages/PersonPage";
import SettlementPage from "@/pages/SettlementPage";
import InsightsPage from "@/pages/InsightsPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/sign-in" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <Toaster richColors />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={<PublicRoute><SignInPage /></PublicRoute>} />
          <Route path="/sign-up" element={<PublicRoute><SignUpPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
          <Route path="/expenses/new" element={<ProtectedRoute><NewExpensePage /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
          <Route path="/person/:id" element={<ProtectedRoute><PersonPage /></ProtectedRoute>} />
          <Route path="/settlements/:type/:id" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
