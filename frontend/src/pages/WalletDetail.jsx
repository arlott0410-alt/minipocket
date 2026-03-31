import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import TransactionList from "../components/transaction/TransactionList";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "react-i18next";
import { formatAmountInput, formatDisplayAmount, parseAmountInput, precisionByCurrency } from "../lib/amount";

export default function WalletDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState(null);
  const [txForm, setTxForm] = useState({ type: "expense", amount: "", note: "", transaction_date: "" });

  const wallet = useMemo(() => wallets.find((w) => w.id === id), [wallets, id]);
  const canDeleteWallet = wallet && wallet.owner_id === user?.id;

  const load = async () => {
    setLoading(true);
    const [w, tx] = await Promise.all([api.getWallets(), api.getTransactions({ wallet_id: id, limit: 100 })]);
    setWallets([...(w.owned || []), ...(w.shared || [])]);
    setTransactions(tx.transactions || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const openEditTx = (tx) => {
    setEditingTx(tx);
    setTxForm({
      type: tx.type,
      amount: formatAmountInput(String(tx.amount || ""), precisionByCurrency(wallet?.currency)),
      note: tx.note || "",
      transaction_date: tx.transaction_date || "",
    });
  };

  const saveEditTx = async () => {
    if (!editingTx) return;
    const amountNumber = parseAmountInput(txForm.amount);
    if (amountNumber <= 0) return;
    await api.updateTransaction(editingTx.id, {
      type: txForm.type,
      amount: amountNumber,
      note: txForm.note,
      transaction_date: txForm.transaction_date,
      category_id: editingTx.category_id || null,
    });
    setEditingTx(null);
    await load();
  };

  const deleteTx = async (txId) => {
    const ok = window.confirm("Delete this transaction?");
    if (!ok) return;
    await api.deleteTransaction(txId);
    await load();
  };

  const deleteWallet = async () => {
    const ok = window.confirm("Delete this wallet? This will archive it.");
    if (!ok) return;
    await api.deleteWallet(id);
    navigate("/");
  };

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
          <div className="surface-card p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{wallet.currency}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{wallet.icon} {wallet.name}</h1>
            <p className="text-2xl font-bold mt-2" style={{ color: wallet.color }}>{formatDisplayAmount(wallet.balance || 0, wallet.currency)}</p>
            {canDeleteWallet && (
              <div className="mt-3">
                <Button variant="danger" size="sm" onClick={deleteWallet}>Delete Wallet</Button>
              </div>
            )}
          </div>
          {transactions.length ? (
            <TransactionList
              transactions={transactions}
              renderActions={(tx) => (
                <div className="flex gap-2 justify-end">
                  <button className="text-xs text-amber-300 hover:underline" onClick={() => openEditTx(tx)}>Edit</button>
                  <button className="text-xs text-rose-300 hover:underline" onClick={() => deleteTx(tx.id)}>Delete</button>
                </div>
              )}
            />
          ) : (
            <EmptyState icon="📋" title="No transactions yet" desc="Start adding transactions for this wallet." />
          )}
        </>
      )}
      <Button onClick={() => navigate("/add-transaction")} className="w-full">Add Transaction</Button>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} panelClassName="p-4">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-100">Edit Transaction</h3>
          <Select value={txForm.type} onChange={(e) => setTxForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="income">{t("transaction.type_income")}</option>
            <option value="expense">{t("transaction.type_expense")}</option>
          </Select>
          <Input
            type="text"
            inputMode="decimal"
            value={txForm.amount}
            onChange={(e) => setTxForm((s) => ({ ...s, amount: formatAmountInput(e.target.value, precisionByCurrency(wallet?.currency)) }))}
            placeholder="Amount"
          />
          <Input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm((s) => ({ ...s, transaction_date: e.target.value }))} />
          <Input value={txForm.note} onChange={(e) => setTxForm((s) => ({ ...s, note: e.target.value }))} placeholder="Note" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingTx(null)}>Cancel</Button>
            <Button className="flex-1" onClick={saveEditTx}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
