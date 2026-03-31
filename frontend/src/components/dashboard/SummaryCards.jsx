export default function SummaryCards({ wallets, loading }) {
  const total = (wallets || []).reduce((s, w) => s + Number(w.balance || 0), 0);
  const count = wallets?.length || 0;
  return (
    <div className="surface-card p-4 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
      <p className="label">{loading ? "..." : "Portfolio overview"}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-amber-100">{Number(total).toLocaleString()}</p>
      <p className="mt-2 text-sm text-amber-200/70">{count} wallet{count === 1 ? "" : "s"} active</p>
    </div>
  );
}
