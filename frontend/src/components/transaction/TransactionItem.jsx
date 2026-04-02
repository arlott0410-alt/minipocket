import { formatDisplayAmount } from "../../lib/amount";
import { useTranslation } from "react-i18next";
import { getCategoryDisplayName } from "../../lib/category";

export default function TransactionItem({ transaction, actions }) {
  const { i18n, t } = useTranslation();
  const ty = transaction.type;
  const isTransferIn = ty === "transfer_in";
  const isTransferOut = ty === "transfer_out";
  const incomeLike = ty === "income" || isTransferIn;
  const sign = incomeLike ? "+" : "-";
  const color =
    ty === "income"
      ? "text-emerald-300"
      : ty === "expense"
        ? "text-rose-300"
        : isTransferIn
          ? "text-sky-300"
          : "text-amber-200";
  const headline =
    isTransferIn ? t("transaction.type_transfer_in") : isTransferOut ? t("transaction.type_transfer_out") : getCategoryDisplayName(transaction.category, i18n.language);
  const note = String(transaction.note || "").trim();
  return (
    <div className="flex items-center justify-between p-3">
      <div className="min-w-0 flex-1 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-amber-100">{headline}</p>
          {(isTransferIn || isTransferOut) && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
              {t("transaction.report_excluded_short")}
            </span>
          )}
        </div>
        {note ? <p className="truncate text-xs text-amber-200/75">{t("common.note")}: {note}</p> : null}
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
