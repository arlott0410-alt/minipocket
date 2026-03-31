import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import TransactionList from "../components/transaction/TransactionList";

export default function WalletDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const wallet = useMemo(() => wallets.find((w) => w.id === id), [wallets, id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [w, tx] = await Promise.all([api.getWallets(), api.getTransactions({ wallet_id: id, limit: 100 })]);
      setWallets([...(w.owned || []), ...(w.shared || [])]);
      setTransactions(tx.transactions || []);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : !wallet ? (
        <EmptyState icon="❓" title="Wallet not found" desc="Please go back and choose another wallet." />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <p className="text-sm text-gray-500">{wallet.currency}</p>
            <h1 className="text-xl font-bold mt-1">{wallet.icon} {wallet.name}</h1>
            <p className="text-2xl font-bold mt-2" style={{ color: wallet.color }}>{Number(wallet.balance || 0).toLocaleString()}</p>
          </div>
          {transactions.length ? (
            <TransactionList transactions={transactions} />
          ) : (
            <EmptyState icon="📋" title="No transactions yet" desc="Start adding transactions for this wallet." />
          )}
        </>
      )}
      <button onClick={() => navigate("/add-transaction")} className="w-full rounded-xl bg-indigo-600 text-white py-2.5 font-medium">
        Add Transaction
      </button>
    </div>
  );
}
