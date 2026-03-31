import { NavLink } from "react-router-dom";
import { Home, ArrowLeftRight, BarChart2, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

const tabs = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
  { to: "/reports", icon: BarChart2, labelKey: "nav.reports" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200/90 bg-white/95 pb-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      {tabs.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-[11px] font-medium transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`
          }
        >
          <Icon size={19} />
          <span>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
