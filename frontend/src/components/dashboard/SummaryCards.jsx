import { formatDisplayAmount } from "../../lib/amount";
import { useTranslation } from "react-i18next";
import Skeleton from "../ui/Skeleton";

export default function SummaryCards({ wallets, loading, onSelectWallet }) {
  const { t } = useTranslation();
  return (
    <div className="surface-card p-4 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
      <div>
        <p className="section-title">{t("wallet.my_wallets")}</p>
        {loading ? (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (wallets || []).length === 0 ? (
          <p className="mt-2 text-sm text-amber-200/70">{t("wallet.empty_desc")}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(wallets || []).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelectWallet?.(w)}
                className="surface-muted p-3 text-left transition hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-amber-50 line-clamp-2">{w.icon} {w.name}</p>
                  <p className="text-[10px] font-medium text-amber-300/80">{w.currency}</p>
                </div>
                <p className="mt-2 text-lg font-bold tracking-tight" style={{ color: w.color }}>{formatDisplayAmount(w.balance || 0, w.currency)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
