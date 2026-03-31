import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  const { login, loading } = useAuthStore();
  const { colorScheme } = useTelegram();

  const isTelegram = !!window.Telegram?.WebApp;
  const isAdminRoute = window.location?.pathname?.startsWith("/admin");

  useEffect(() => {
    if (isTelegram) login();
  }, [login, isTelegram]);

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
      <div className="min-h-screen max-w-md mx-auto relative bg-slate-100 dark:bg-slate-950">
        <BrowserRouter>
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
          <BottomNav />
        </BrowserRouter>
      </div>
    </div>
  );
}
