import { formatDisplayAmount } from "../../lib/amount";
import { useTranslation } from "react-i18next";
import { getCategoryDisplayName } from "../../lib/category";

export default function TransactionItem({ transaction, actions }) {
  const { i18n } = useTranslation();
  const sign = transaction.type === "income" ? "+" : "-";
  const color = transaction.type === "income" ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="flex items-center justify-between p-3">
      <div>
        <p className="text-sm font-medium text-amber-100">{getCategoryDisplayName(transaction.category, i18n.language)}</p>
        <p className="text-xs text-amber-200/60">{transaction.transaction_date}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${color}`}>
          {sign}{formatDisplayAmount(transaction.amount || 0, transaction.wallet?.currency)} {transaction.wallet?.currency || ""}
        </p>
        {actions && <div className="mt-1">{actions}</div>}
      </div>
    </div>
  );
}
