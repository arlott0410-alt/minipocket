export default function SummaryCards({ wallets, loading }) {
  const total = (wallets || []).reduce((s, w) => s + Number(w.balance || 0), 0);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500">{loading ? "..." : "Total Balance"}</p>
      <p className="text-2xl font-bold">{Number(total).toLocaleString()}</p>
    </div>
  );
}
