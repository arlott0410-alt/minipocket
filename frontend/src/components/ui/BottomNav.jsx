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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex z-50">
      {tabs.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium ${isActive ? "text-indigo-600" : "text-gray-400"}`
          }
        >
          <Icon size={20} />
          <span>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
