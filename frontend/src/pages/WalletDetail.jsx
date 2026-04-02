import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import TransactionList from "../components/transaction/TransactionList";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import TransactionTypeSelect from "../components/transaction/TransactionTypeSelect";
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
  const [error, setError] = useState("");

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
    if (amountNumber <= 0) {
      setError(t("common.invalid_amount"));
      return;
    }
    try {
      setError("");
      const isTransfer = txForm.type === "transfer_in" || txForm.type === "transfer_out";
      await api.updateTransaction(editingTx.id, {
        type: txForm.type,
        amount: amountNumber,
        note: txForm.note,
        transaction_date: txForm.transaction_date,
        category_id: isTransfer ? null : editingTx.category_id || null,
      });
      setEditingTx(null);
      await load();
    } catch (e) {
      setError(e?.error || t("transaction.update_failed"));
    }
  };

  const deleteTx = async (txId) => {
    const ok = window.confirm(t("transaction.confirm_delete"));
    if (!ok) return;
    await api.deleteTransaction(txId);
    await load();
  };

  const deleteWallet = async () => {
    const ok = window.confirm(t("wallet.confirm_delete"));
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
        <EmptyState icon="❓" title={t("wallet.not_found_title")} desc={t("wallet.not_found_desc")} />
      ) : (
        <>
          <div className="surface-card p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{wallet.currency}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{wallet.icon} {wallet.name}</h1>
            <p className="text-2xl font-bold mt-2" style={{ color: wallet.color }}>{formatDisplayAmount(wallet.balance || 0, wallet.currency)}</p>
            {canDeleteWallet && (
              <div className="mt-3">
                <Button variant="danger" size="sm" onClick={deleteWallet}>{t("wallet.delete")}</Button>
              </div>
            )}
          </div>
          {transactions.length ? (
            <TransactionList
              transactions={transactions}
              renderActions={(tx) => (
                <div className="flex gap-2 justify-end">
                  <button className="text-xs text-amber-300 hover:underline" onClick={() => openEditTx(tx)}>{t("common.edit")}</button>
                  <button className="text-xs text-rose-300 hover:underline" onClick={() => deleteTx(tx.id)}>{t("common.delete")}</button>
                </div>
              )}
            />
          ) : (
            <EmptyState icon="📋" title={t("transaction.empty_title")} desc={t("transaction.empty_desc")} />
          )}
        </>
      )}
      <Button onClick={() => navigate("/add-transaction")} className="w-full">{t("transaction.add_title")}</Button>

      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} panelClassName="border border-amber-500/30 bg-neutral-950 p-4 text-amber-100">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-100">{t("transaction.edit_title")}</h3>
          {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-900/20 p-2 text-xs text-rose-200">{error}</p> : null}
          <TransactionTypeSelect value={txForm.type} onChange={(e) => setTxForm((s) => ({ ...s, type: e.target.value }))} />
          <Input
            type="text"
            inputMode="decimal"
            value={txForm.amount}
            onChange={(e) => setTxForm((s) => ({ ...s, amount: formatAmountInput(e.target.value, precisionByCurrency(wallet?.currency)) }))}
            placeholder={t("common.amount")}
          />
          <Input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm((s) => ({ ...s, transaction_date: e.target.value }))} />
          <Input value={txForm.note} onChange={(e) => setTxForm((s) => ({ ...s, note: e.target.value }))} placeholder={t("common.note")} />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingTx(null)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={saveEditTx}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
