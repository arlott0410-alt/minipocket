export default function SummaryCards({ wallets, loading }) {
  const total = (wallets || []).reduce((s, w) => s + Number(w.balance || 0), 0);
  const count = wallets?.length || 0;
  return (
    <div className="surface-card p-4">
      <p className="label">{loading ? "..." : "Portfolio overview"}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{Number(total).toLocaleString()}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{count} wallet{count === 1 ? "" : "s"} active</p>
    </div>
  );
}
