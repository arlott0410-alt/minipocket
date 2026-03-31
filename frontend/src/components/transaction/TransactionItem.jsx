export default function TransactionItem({ transaction }) {
  const sign = transaction.type === "income" ? "+" : "-";
  const color = transaction.type === "income" ? "text-green-600" : "text-red-500";
  return (
    <div className="p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{transaction.category?.name_lo || transaction.category?.name_en || "General"}</p>
        <p className="text-xs text-gray-500">{transaction.transaction_date}</p>
      </div>
      <p className={`font-semibold ${color}`}>{sign}{Number(transaction.amount || 0).toLocaleString()}</p>
    </div>
  );
}
