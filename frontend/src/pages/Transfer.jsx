import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export default function Transfer() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    api.getWallets().then((d) => setWallets([...(d.owned || []), ...(d.shared || [])]));
  }, []);
  const fromWallet = wallets.find((w) => w.id === form.from_wallet_id);
  const toWallet = wallets.find((w) => w.id === form.to_wallet_id);
  const isCrossCurrency = fromWallet && toWallet && fromWallet.currency !== toWallet.currency;
  const toAmount = isCrossCurrency ? Number(Number(form.from_amount || 0) * Number(form.exchange_rate || 1)).toFixed(4) : Number(form.from_amount || 0).toFixed(4);
  const submit = async () => {
    setError("");
    try {
      await api.createTransfer({ ...form, from_amount: Number(form.from_amount), to_amount: Number(toAmount), exchange_rate: isCrossCurrency ? Number(form.exchange_rate) : null, fee: Number(form.fee || 0) });
      setForm({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
    } catch (e) {
      setError(e.error === "insufficient_balance" ? t("transfer.insufficient") : t("common.error"));
    }
  };
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-xl font-bold">{t("nav.transfer")}</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
        <select value={form.from_wallet_id} onChange={(e) => setForm((s) => ({ ...s, from_wallet_id: e.target.value }))} className="w-full border rounded-xl px-3 py-2">
          <option value="">{t("transfer.from")}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </select>
        <input type="number" value={form.from_amount} onChange={(e) => setForm((s) => ({ ...s, from_amount: e.target.value }))} className="w-full border rounded-xl px-3 py-2" placeholder={t("transfer.amount")} />
        <select value={form.to_wallet_id} onChange={(e) => setForm((s) => ({ ...s, to_wallet_id: e.target.value }))} className="w-full border rounded-xl px-3 py-2">
          <option value="">{t("transfer.to")}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </select>
        {isCrossCurrency && <input type="number" value={form.exchange_rate} onChange={(e) => setForm((s) => ({ ...s, exchange_rate: e.target.value }))} className="w-full border rounded-xl px-3 py-2" placeholder={t("transfer.rate")} />}
        <p className="text-sm">{t("transfer.you_receive")}: {Number(toAmount).toLocaleString()} {toWallet?.currency || ""}</p>
        <button onClick={submit} className="w-full rounded-xl bg-indigo-600 text-white py-2">{t("transfer.confirm")}</button>
      </div>
    </div>
  );
}
