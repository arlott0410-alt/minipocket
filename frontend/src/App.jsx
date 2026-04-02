import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useTelegram } from "./hooks/useTelegram";
import Skeleton from "./components/ui/Skeleton";
import BottomNav from "./components/ui/BottomNav";
import Home from "./pages/Home";
import WalletDetail from "./pages/WalletDetail";
import AddTransaction from "./pages/AddTransaction";
import Transfer from "./pages/Transfer";
import Reports from "./pages/Reports";
import SharedWallets from "./pages/SharedWallets";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import HowToPay from "./pages/HowToPay";
import Admin from "./pages/Admin";
import Card from "./components/ui/Card";
import DesktopShell from "./layouts/DesktopShell";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wallet/:id" element={<WalletDetail />} />
      <Route path="/add-transaction" element={<AddTransaction />} />
      <Route path="/transfer" element={<Transfer />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/shared" element={<SharedWallets />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/how-to-pay" element={<HowToPay />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppViewportFrame({ desktopMode }) {
  const location = useLocation();
  const isAdminRoute = location.pathname?.startsWith("/admin");
  const isDesktopApp = desktopMode && !isAdminRoute;

  if (isDesktopApp) {
    return (
      <DesktopShell>
        <AppRoutes />
      </DesktopShell>
    );
  }

  return (
    <div className={`${isAdminRoute ? "min-h-screen w-full max-w-7xl px-3 md:px-6 lg:px-8" : "min-h-screen max-w-md"} mx-auto relative bg-gradient-to-b from-neutral-950 via-neutral-900 to-black`}>
      <AppRoutes />
      {!isAdminRoute ? <BottomNav /> : null}
    </div>
  );
}

export default function App() {
  const { login, loading } = useAuthStore();
  const { colorScheme } = useTelegram();
  const [sdkChecked, setSdkChecked] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);

  const isTelegram = useMemo(() => !!window.Telegram?.WebApp, [sdkChecked]);
  const isAdminRoute = window.location?.pathname?.startsWith("/admin");

  useEffect(() => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (window.Telegram?.WebApp || tries >= 20) {
        setSdkChecked(true);
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  }, []);

  useEffect(() => {
    if (isTelegram) login();
  }, [login, isTelegram]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => setDesktopMode(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  if (!sdkChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isTelegram && !isAdminRoute) {
    return (
      <div className={colorScheme === "dark" ? "dark" : ""}>
        <div className="min-h-screen max-w-md mx-auto flex items-center justify-center p-4">
          <Card className="text-center space-y-2">
            <div className="text-3xl">📲</div>
            <h1 className="text-xl font-bold tracking-tight">ຕ້ອງເຂົ້າຜ່ານ Telegram ເທົ່ານັ້ນ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ກະລຸນາເປີດ Mini App ຜ່ານ Telegram app ຂອງທ່ານ</p>
          </Card>
        </div>
      </div>
    );
  }

  if (isTelegram && loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }
  return (
    <div className={colorScheme === "dark" ? "dark" : ""}>
      <BrowserRouter>
        <AppViewportFrame desktopMode={desktopMode} />
      </BrowserRouter>
    </div>
  );
}
