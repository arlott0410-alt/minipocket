export default function SummaryCards({ wallets, loading }) {
  const totalsByCurrency = (wallets || []).reduce((acc, w) => {
    const c = w.currency || "N/A";
    acc[c] = (acc[c] || 0) + Number(w.balance || 0);
    return acc;
  }, {});
  const currencyRows = Object.entries(totalsByCurrency);
  const count = wallets?.length || 0;
  return (
    <div className="surface-card p-4 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
      <p className="label">{loading ? "..." : "Portfolio by currency"}</p>
      {currencyRows.length === 0 ? (
        <p className="mt-1 text-3xl font-bold tracking-tight text-amber-100">0</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {currencyRows.map(([currency, amount]) => (
            <div key={currency} className="surface-muted p-2">
              <p className="text-[11px] text-amber-300/75">{currency}</p>
              <p className="text-lg font-bold text-amber-100">{Number(amount).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm text-amber-200/70">{count} wallet{count === 1 ? "" : "s"} active</p>
    </div>
  );
}
