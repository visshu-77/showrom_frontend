import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import Billing from "./pages/Billing";
import Pricing from "./pages/Pricing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { getAuthToken, clearAuthToken } from "./lib/auth";
import { API_BASE } from "./lib/api";
import { AuthContext } from "./lib/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const [location, setLocation] = useLocation();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const isAdminRoute = location.startsWith("/admin");

  // Run the token verification exactly once on mount — never on navigation.
  useEffect(() => {
    if (isAdminRoute) {
      setAuthState("unauthenticated");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setAuthState("unauthenticated");
      return;
    }

    const abortController = new AbortController();

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(() => setAuthState("authenticated"))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        clearAuthToken();
        setAuthState("unauthenticated");
      });

    return () => abortController.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute]);

  // Redirect-only effect — no network calls, runs when authState or location changes.
  useEffect(() => {
    if (authState === "loading") return;
    if (isAdminRoute) return;
    if (authState === "unauthenticated" && location !== "/signin" && location !== "/signup") {
      setLocation("/signin");
    }
    if (authState === "authenticated" && (location === "/signin" || location === "/signup")) {
      setLocation("/");
    }
  }, [authState, isAdminRoute, location, setLocation]);

  if (isAdminRoute) {
    return (
      <Switch>
        <Route path="/admin/signin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={AdminLogin} />
      </Switch>
    );
  }

  if (authState === "loading") return null;

  if (authState === "unauthenticated") {
    return (
      <AuthContext.Provider value={{ authState, setAuthState }}>
        <Switch>
          <Route path="/signin" component={SignIn} />
          <Route path="/signup" component={SignUp} />
          <Route component={NotFound} />
        </Switch>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ authState, setAuthState }}>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/categories" component={Categories} />
          <Route path="/orders" component={Orders} />
          <Route path="/customers" component={Customers} />
          <Route path="/staff" component={Staff} />
          <Route path="/billing" component={Billing} />
          <Route path="/pricing" component={Pricing} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
