import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReports } from "../hooks/useReports";
import Skeleton from "../components/ui/Skeleton";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { summary, chart, categories, loading } = useReports(month);
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("nav.reports")}</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded-xl px-3 py-1.5 text-sm" />
      </div>
      {loading ? <Skeleton className="h-24 rounded-2xl" /> : (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs">{t("report.income")}</p><p>{Number(summary?.income || 0).toLocaleString()}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs">{t("report.expense")}</p><p>{Number(summary?.expense || 0).toLocaleString()}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs">{t("report.net")}</p><p>{Number(summary?.net || 0).toLocaleString()}</p></div>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => Number(v).toLocaleString()} /><Bar dataKey="income" fill="#10b981" /><Bar dataKey="expense" fill="#ef4444" /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 h-64">
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
