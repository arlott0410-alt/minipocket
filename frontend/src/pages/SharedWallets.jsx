import { useEffect, useState } from "react";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import WalletCard from "../components/wallet/WalletCard";
import { api } from "../lib/api";

export default function SharedWallets() {
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWallets().then((d) => {
      setShared(d.shared || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-xl font-bold">Shared Wallets</h1>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : shared.length === 0 ? (
        <EmptyState icon="🤝" title="Shared Wallets" desc="No shared wallets yet" />
      ) : (
        <div className="space-y-3">
          {shared.map((w) => <WalletCard key={w.id} wallet={w} />)}
        </div>
      )}
    </div>
  );
}
