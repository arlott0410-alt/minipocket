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

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const load = async () => {
    const [w, tx] = await Promise.all([api.getWallets(), api.getTransactions({ limit: 5 })]);
    setWallets([...(w.owned || []), ...(w.shared || [])]);
    setRecentTxs(tx.transactions || []);
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="pb-24 pt-4 px-4 space-y-5">
      <div>
        <p className="text-sm text-gray-500">{t("home.greeting")}</p>
        <h1 className="text-xl font-bold">{user?.first_name} 👋</h1>
      </div>
      <SummaryCards wallets={wallets} />
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">{t("wallet.my_wallets")}</h2>
        <button onClick={() => setShowCreateWallet(true)} className="text-indigo-600 text-sm flex items-center gap-1"><Plus size={16} /> {t("wallet.add")}</button>
      </div>
      {wallets.length === 0 ? (
        <EmptyState icon="💰" title={t("wallet.empty_title")} desc={t("wallet.empty_desc")} action={{ label: t("wallet.add"), onClick: () => setShowCreateWallet(true) }} />
      ) : (
        <div className="space-y-3">{wallets.map((w) => <WalletCard key={w.id} wallet={w} onClick={() => navigate(`/wallet/${w.id}`)} />)}</div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl divide-y">
        {recentTxs.length ? recentTxs.map((tx) => <TransactionItem key={tx.id} transaction={tx} />) : <EmptyState icon="📋" title={t("transaction.empty_title")} desc={t("transaction.empty_desc")} />}
      </div>
      <button onClick={() => navigate("/add-transaction")} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-indigo-600 text-white text-3xl leading-none">+</button>
      {showCreateWallet && <CreateWalletForm onClose={() => setShowCreateWallet(false)} onCreated={load} />}
    </div>
  );
}
