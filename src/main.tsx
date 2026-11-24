import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { ApiError } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { Layout } from "@/components/layout";
import { Notice, PageLoader } from "@/components/ui";
import { ChangePasswordPage, LoginPage } from "@/pages/login";
import MatchesPage from "@/pages/matches";

// Pages load on demand so the first screen stays small.
const NewMatch = lazy(() => import("@/pages/new-match"));
const MatchControl = lazy(() => import("@/pages/match-control"));
const Maps = lazy(() => import("@/pages/maps"));
const MyEarnings = lazy(() => import("@/pages/my-earnings"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Payments = lazy(() => import("@/pages/payments"));
const Moderation = lazy(() => import("@/pages/moderation"));
const Players = lazy(() => import("@/pages/players"));
const PlayerDetail = lazy(() => import("@/pages/player-detail"));
const Managers = lazy(() => import("@/pages/managers"));
const Earnings = lazy(() => import("@/pages/earnings"));
const ManagerEarning = lazy(() => import("@/pages/manager-earning"));
const Revenue = lazy(() => import("@/pages/revenue"));
const Templates = lazy(() => import("@/pages/templates"));
const Catalog = lazy(() => import("@/pages/catalog"));
const Files = lazy(() => import("@/pages/files"));
const Admins = lazy(() => import("@/pages/admins"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const Audit = lazy(() => import("@/pages/audit"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2 },
  },
});

function Guard({ need, children }: { need: "admin" | "owner" | "manager"; children: React.ReactNode }) {
  const { user, isAdmin, isOwner } = useAuth();
  const ok = need === "owner" ? isOwner : need === "admin" ? isAdmin : user?.role === "MANAGER";
  if (!ok) return <Notice title="No access">{need === "owner" ? "Only the Super Admin can open this page." : need === "admin" ? "Only Admins can open this page." : "This page is for managers."}</Notice>;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  const { user, loading, isAdmin } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="skeleton h-10 w-40" />
      </div>
    );
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ChangePasswordPage forced />;
  const S = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={isAdmin ? <Guard need="admin"><Dashboard /></Guard> : <Navigate to="/matches" replace />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="matches/new" element={S(<NewMatch />)} />
        <Route path="matches/:id" element={S(<MatchControl />)} />
        <Route path="maps" element={S(<Maps />)} />
        <Route path="my-earnings" element={<Guard need="manager"><MyEarnings /></Guard>} />
        <Route path="payments" element={<Guard need="admin"><Payments /></Guard>} />
        <Route path="moderation" element={<Guard need="admin"><Moderation /></Guard>} />
        <Route path="players" element={<Guard need="admin"><Players /></Guard>} />
        <Route path="players/:id" element={<Guard need="admin"><PlayerDetail /></Guard>} />
        <Route path="managers" element={<Guard need="admin"><Managers /></Guard>} />
        <Route path="earnings" element={<Guard need="admin"><Earnings /></Guard>} />
        <Route path="earnings/:id" element={<Guard need="admin"><ManagerEarning /></Guard>} />
        <Route path="revenue" element={<Guard need="owner"><Revenue /></Guard>} />
        <Route path="templates" element={<Guard need="owner"><Templates /></Guard>} />
        <Route path="catalog" element={<Guard need="owner"><Catalog /></Guard>} />
        <Route path="files" element={<Guard need="owner"><Files /></Guard>} />
        <Route path="admins" element={<Guard need="owner"><Admins /></Guard>} />
        <Route path="settings" element={<Guard need="owner"><SettingsPage /></Guard>} />
        <Route path="audit" element={<Guard need="owner"><Audit /></Guard>} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Notice title="Not found">This page does not exist.</Notice>} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
