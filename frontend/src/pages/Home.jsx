import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import WalletCard from "../components/wallet/WalletCard";
import SummaryCards from "../components/dashboard/SummaryCards";
import TransactionItem from "../components/transaction/TransactionItem";
import EmptyState from "../components/ui/EmptyState";
import CreateWalletForm from "../components/wallet/CreateWalletForm";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const load = async () => {
    setLoading(true);
    const [w, tx] = await Promise.all([api.getWallets(), api.getTransactions({ limit: 5 })]);
    setWallets([...(w.owned || []), ...(w.shared || [])]);
    setRecentTxs(tx.transactions || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="pb-24 pt-4 px-4 space-y-5">
      <div>
        <p className="text-sm text-amber-300/75">{t("home.greeting")}</p>
        <h1 className="text-3xl font-bold tracking-tight text-amber-100">{user?.first_name} 👋</h1>
      </div>
      <SummaryCards wallets={wallets} loading={loading} />
      <div className="flex justify-between items-center">
        <h2 className="section-title">{t("wallet.my_wallets")}</h2>
        <Button onClick={() => setShowCreateWallet(true)} size="sm" className="flex items-center gap-1">
          <Plus size={15} /> {t("wallet.add")}
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : wallets.length === 0 ? (
        <EmptyState icon="💰" title={t("wallet.empty_title")} desc={t("wallet.empty_desc")} action={{ label: t("wallet.add"), onClick: () => setShowCreateWallet(true) }} />
      ) : (
        <div className="space-y-3">{wallets.map((w) => <WalletCard key={w.id} wallet={w} onClick={() => navigate(`/wallet/${w.id}`)} />)}</div>
      )}
      <div className="surface-card divide-y divide-amber-500/10">
        {recentTxs.length ? recentTxs.map((tx) => <TransactionItem key={tx.id} transaction={tx} />) : <EmptyState icon="📋" title={t("transaction.empty_title")} desc={t("transaction.empty_desc")} />}
      </div>
      <button
        onClick={() => navigate("/add-transaction")}
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-3xl leading-none text-neutral-900 shadow-xl shadow-amber-500/30 transition hover:brightness-110"
      >
        +
      </button>
      {showCreateWallet && <CreateWalletForm onClose={() => setShowCreateWallet(false)} onCreated={load} />}
    </div>
  );
}
