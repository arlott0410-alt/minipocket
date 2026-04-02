import { BarChart2, ArrowLeftRight, CreditCard, Home, PlusCircle, Settings, Share2, Shield, Wallet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const desktopLinks = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/wallet/placeholder", icon: Wallet, label: "Wallets", disabled: true },
  { to: "/add-transaction", icon: PlusCircle, label: "Add Transaction" },
  { to: "/transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
  { to: "/reports", icon: BarChart2, labelKey: "nav.reports" },
  { to: "/shared", icon: Share2, label: "Shared" },
  { to: "/subscription", icon: CreditCard, label: "Subscription" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
  { to: "/admin", icon: Shield, label: "Admin" },
];

export default function DesktopShell({ children }) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6">
      <div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="surface-card hidden p-4 lg:block">
          <p className="text-lg font-semibold tracking-tight text-amber-100">Mini Pocket</p>
          <p className="mt-1 text-xs text-amber-200/60">Enterprise Workspace</p>
          <nav className="mt-4 space-y-2">
            {desktopLinks.map(({ to, icon: Icon, labelKey, label, disabled }) => {
              if (disabled) return null;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      isActive
                        ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
                        : "border-amber-500/15 text-amber-200/80 hover:border-amber-500/30 hover:bg-neutral-900/80"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{labelKey ? t(labelKey) : label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="surface-card overflow-hidden p-0">
          <div className="border-b border-amber-500/20 px-4 py-3 md:px-6">
            <p className="text-xs uppercase tracking-wide text-amber-300/70">Desktop View</p>
            <h1 className="text-lg font-semibold text-amber-100">{location.pathname === "/" ? t("nav.home") : location.pathname}</h1>
          </div>
          <div className="desktop-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
