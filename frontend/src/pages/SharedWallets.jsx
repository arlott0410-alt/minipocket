import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import WalletCard from "../components/wallet/WalletCard";
import { api } from "../lib/api";

export default function SharedWallets() {
  const { t } = useTranslation();
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWallets().then((d) => {
      setShared(d.shared || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell">
      <h1 className="page-title">{t("shared.title")}</h1>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : shared.length === 0 ? (
        <EmptyState icon="🤝" title={t("shared.title")} desc={t("shared.empty_desc")} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shared.map((w) => <WalletCard key={w.id} wallet={w} />)}
        </div>
      )}
    </div>
  );
}
