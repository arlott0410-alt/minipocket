import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import SummaryCards from "../components/dashboard/SummaryCards";
import TransactionItem from "../components/transaction/TransactionItem";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { formatAmountInput, parseAmountInput, precisionByCurrency } from "../lib/amount";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState(null);
  const [txForm, setTxForm] = useState({ type: "expense", amount: "", note: "", transaction_date: "" });
  const [error, setError] = useState("");
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

  const openEditTx = (tx) => {
    setEditingTx(tx);
    setError("");
    setTxForm({
      type: tx.type,
      amount: formatAmountInput(String(tx.amount || ""), precisionByCurrency(tx.wallet?.currency)),
      note: tx.note || "",
      transaction_date: tx.transaction_date || "",
    });
  };

  const saveEditTx = async () => {
    if (!editingTx) return;
    const amountNumber = parseAmountInput(txForm.amount);
    if (amountNumber <= 0) {
      setError("Invalid amount");
      return;
    }
    try {
      setError("");
      await api.updateTransaction(editingTx.id, {
        type: txForm.type,
        amount: amountNumber,
        note: txForm.note,
        transaction_date: txForm.transaction_date,
        category_id: editingTx.category_id || null,
      });
      setEditingTx(null);
      await load();
    } catch (e) {
      setError(e?.error || "Unable to update transaction");
    }
  };

  const deleteTx = async (txId) => {
    const ok = window.confirm("Delete this transaction?");
    if (!ok) return;
    await api.deleteTransaction(txId);
    await load();
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-5">
      <div>
        <p className="text-sm text-amber-300/75">{t("home.greeting")}</p>
        <h1 className="text-3xl font-bold tracking-tight text-amber-100">{user?.first_name} 👋</h1>
      </div>
      <SummaryCards wallets={wallets} loading={loading} />
      <div className="flex justify-between items-center">
        <h2 className="section-title">{t("transaction.recent")}</h2>
      </div>
      <div className="surface-card divide-y divide-amber-500/10">
        {recentTxs.length ? recentTxs.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            actions={(
              <div className="flex gap-2 justify-end">
                <button className="text-xs text-amber-300 hover:underline" onClick={() => openEditTx(tx)}>Edit</button>
                <button className="text-xs text-rose-300 hover:underline" onClick={() => deleteTx(tx.id)}>Delete</button>
              </div>
            )}
          />
        )) : <EmptyState icon="📋" title={t("transaction.empty_title")} desc={t("transaction.empty_desc")} />}
      </div>
      <button
        onClick={() => navigate("/add-transaction")}
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-3xl leading-none text-neutral-900 shadow-xl shadow-amber-500/30 transition hover:brightness-110"
      >
        +
      </button>
      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} panelClassName="border border-amber-500/30 bg-neutral-950 p-4 text-amber-100">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-100">Edit Transaction</h3>
          {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-900/20 p-2 text-xs text-rose-200">{error}</p> : null}
          <Select value={txForm.type} onChange={(e) => setTxForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="income">{t("transaction.type_income")}</option>
            <option value="expense">{t("transaction.type_expense")}</option>
          </Select>
          <Input
            type="text"
            inputMode="decimal"
            value={txForm.amount}
            onChange={(e) => setTxForm((s) => ({ ...s, amount: formatAmountInput(e.target.value, precisionByCurrency(editingTx?.wallet?.currency)) }))}
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
