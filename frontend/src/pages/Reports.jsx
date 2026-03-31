import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReports } from "../hooks/useReports";
import Skeleton from "../components/ui/Skeleton";
import { useWallets } from "../hooks/useWallets";
import html2canvas from "html2canvas";
import Button from "../components/ui/Button";

const COLORS = ["#fbbf24", "#f59e0b", "#f97316", "#eab308", "#fcd34d", "#fca5a5"];

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState("month");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [walletId, setWalletId] = useState("");
  const { wallets } = useWallets();
  const { summary, chart, categories, loading } = useReports({ period, date, walletId });
  const exportRef = useRef(null);

  const exportImage = async () => {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { backgroundColor: "#050505", scale: 2 });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `mini-pocket-report-${Date.now()}.png`;
    a.click();
  };

  const getDateInputType = () => {
    if (period === "day") return "date";
    if (period === "month") return "month";
    return "number";
  };

  const getDateInputValue = () => {
    if (period === "year") return String(new Date(date).getFullYear());
    if (period === "month") return date.slice(0, 7);
    return date.slice(0, 10);
  };

  const onDateChange = (value) => {
    if (period === "year") setDate(`${value}-01-01`);
    else if (period === "month") setDate(`${value}-01`);
    else setDate(value);
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-amber-100">{t("report.title")}</h1>
        <Button size="sm" onClick={exportImage}>{t("report.export_png")}</Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className={`rounded-xl border px-3 py-2 text-sm ${period === "day" ? "border-amber-300 bg-amber-300 text-neutral-900" : "border-amber-500/30 text-amber-100"}`} onClick={() => setPeriod("day")}>{t("report.period_day")}</button>
        <button className={`rounded-xl border px-3 py-2 text-sm ${period === "month" ? "border-amber-300 bg-amber-300 text-neutral-900" : "border-amber-500/30 text-amber-100"}`} onClick={() => setPeriod("month")}>{t("report.period_month")}</button>
        <button className={`rounded-xl border px-3 py-2 text-sm ${period === "year" ? "border-amber-300 bg-amber-300 text-neutral-900" : "border-amber-500/30 text-amber-100"}`} onClick={() => setPeriod("year")}>{t("report.period_year")}</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type={getDateInputType()}
          min={period === "year" ? "2000" : undefined}
          max={period === "year" ? "2100" : undefined}
          value={getDateInputValue()}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-xl border border-amber-500/30 bg-neutral-900 px-3 py-2 text-sm text-amber-100"
        />
        <select
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          className="w-full rounded-xl border border-amber-500/30 bg-neutral-900 px-3 py-2 text-sm text-amber-100"
        >
          <option value="">{t("report.all_wallets")}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name} ({w.currency})</option>)}
        </select>
      </div>

      <div ref={exportRef} className="space-y-4 rounded-2xl bg-neutral-950 p-2">
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
              <XAxis dataKey="period" stroke="#fcd34d" />
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
    </div>
  );
}
