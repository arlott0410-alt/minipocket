import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReports } from "../hooks/useReports";
import Skeleton from "../components/ui/Skeleton";
import { useWallets } from "../hooks/useWallets";

const COLORS = ["#fbbf24", "#f59e0b", "#f97316", "#eab308", "#fcd34d", "#fca5a5"];

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [walletId, setWalletId] = useState("");
  const { wallets } = useWallets();
  const { summary, chart, categories, loading } = useReports(month, walletId);
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-amber-100">Luxury Dashboard</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border border-amber-500/30 bg-neutral-900 px-3 py-2 text-sm text-amber-100" />
      </div>
      <select
        value={walletId}
        onChange={(e) => setWalletId(e.target.value)}
        className="w-full rounded-xl border border-amber-500/30 bg-neutral-900 px-3 py-2 text-sm text-amber-100"
      >
        <option value="">All wallets</option>
        {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name} ({w.currency})</option>)}
      </select>
      {loading ? <Skeleton className="h-24 rounded-2xl" /> : (
        <div className="grid grid-cols-3 gap-2">
          <div className="surface-card rounded-xl p-3 text-center"><p className="text-xs text-amber-300/70">{t("report.income")}</p><p className="font-semibold text-emerald-300">{Number(summary?.income || 0).toLocaleString()}</p></div>
          <div className="surface-card rounded-xl p-3 text-center"><p className="text-xs text-amber-300/70">{t("report.expense")}</p><p className="font-semibold text-rose-300">{Number(summary?.expense || 0).toLocaleString()}</p></div>
          <div className="surface-card rounded-xl p-3 text-center"><p className="text-xs text-amber-300/70">{t("report.net")}</p><p className="font-semibold text-amber-100">{Number(summary?.net || 0).toLocaleString()}</p></div>
        </div>
      )}
      <div className="surface-card h-56 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <XAxis dataKey="month" stroke="#fcd34d" />
            <YAxis stroke="#fcd34d" />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="surface-card h-64 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={categories} dataKey="total" nameKey={i18n.language === "lo" ? "name_lo" : "name_en"} innerRadius={45} outerRadius={70}>
              {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
