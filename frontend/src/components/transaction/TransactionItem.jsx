export default function TransactionItem({ transaction, actions }) {
  const sign = transaction.type === "income" ? "+" : "-";
  const color = transaction.type === "income" ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="flex items-center justify-between p-3">
      <div>
        <p className="text-sm font-medium text-amber-100">{transaction.category?.name_lo || transaction.category?.name_en || "General"}</p>
        <p className="text-xs text-amber-200/60">{transaction.transaction_date}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${color}`}>{sign}{Number(transaction.amount || 0).toLocaleString()}</p>
        {actions && <div className="mt-1">{actions}</div>}
      </div>
    </div>
  );
}
