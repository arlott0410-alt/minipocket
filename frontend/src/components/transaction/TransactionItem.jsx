export default function TransactionItem({ transaction }) {
  const sign = transaction.type === "income" ? "+" : "-";
  const color = transaction.type === "income" ? "text-green-600" : "text-red-500";
  return (
    <div className="flex items-center justify-between p-3">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{transaction.category?.name_lo || transaction.category?.name_en || "General"}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{transaction.transaction_date}</p>
      </div>
      <p className={`font-semibold ${color}`}>{sign}{Number(transaction.amount || 0).toLocaleString()}</p>
    </div>
  );
}
