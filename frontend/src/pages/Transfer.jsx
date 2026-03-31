import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import WalletCard from "../components/wallet/WalletCard";

export default function Transfer() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
  const [error, setError] = useState("");
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.getWallets().then((d) => {
      setWallets([...(d.owned || []), ...(d.shared || [])]);
      setLoadingWallets(false);
    });
  }, []);
  const fromWallet = wallets.find((w) => w.id === form.from_wallet_id);
  const toWallet = wallets.find((w) => w.id === form.to_wallet_id);
  const isCrossCurrency = fromWallet && toWallet && fromWallet.currency !== toWallet.currency;
  const toAmount = isCrossCurrency ? Number(Number(form.from_amount || 0) * Number(form.exchange_rate || 1)).toFixed(4) : Number(form.from_amount || 0).toFixed(4);
  const submit = async () => {
    setError("");
    if (!form.from_wallet_id || !form.to_wallet_id || !form.from_amount) {
      setError(t("common.fill_all"));
      return;
    }
    if (form.from_wallet_id === form.to_wallet_id) {
      setError(t("transfer.same_wallet_error"));
      return;
    }
    try {
      setSaving(true);
      await api.createTransfer({ ...form, from_amount: Number(form.from_amount), to_amount: Number(toAmount), exchange_rate: isCrossCurrency ? Number(form.exchange_rate) : null, fee: Number(form.fee || 0) });
      setForm({ from_wallet_id: "", to_wallet_id: "", from_amount: "", exchange_rate: "1", fee: "0", note: "" });
    } catch (e) {
      setError(e.error === "insufficient_balance" ? t("transfer.insufficient") : t("common.error"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-amber-100">โยกเงินระหว่างกระเป๋า</h1>
      {!loadingWallets && (
        <div className="space-y-2">
          <h2 className="section-title">กระเป๋าของฉัน</h2>
          <div className="space-y-2">
            {wallets.map((w) => <WalletCard key={w.id} wallet={w} />)}
          </div>
        </div>
      )}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
      {loadingWallets ? (
        <Skeleton className="h-56" />
      ) : (
      <Card className="space-y-3">
        <Select value={form.from_wallet_id} onChange={(e) => setForm((s) => ({ ...s, from_wallet_id: e.target.value }))}>
          <option value="">{t("transfer.from")}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </Select>
        <Input type="number" value={form.from_amount} onChange={(e) => setForm((s) => ({ ...s, from_amount: e.target.value }))} placeholder={t("transfer.amount")} />
        <Select value={form.to_wallet_id} onChange={(e) => setForm((s) => ({ ...s, to_wallet_id: e.target.value }))}>
          <option value="">{t("transfer.to")}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
        </Select>
        {isCrossCurrency && <Input type="number" value={form.exchange_rate} onChange={(e) => setForm((s) => ({ ...s, exchange_rate: e.target.value }))} placeholder={t("transfer.rate")} />}
        <Input type="number" value={form.fee} onChange={(e) => setForm((s) => ({ ...s, fee: e.target.value }))} placeholder={t("transfer.fee")} />
        <Input value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} placeholder={t("common.note")} />
        <p className="surface-muted p-3 text-sm text-slate-600 dark:text-slate-300">{t("transfer.you_receive")}: <span className="font-semibold">{Number(toAmount).toLocaleString()} {toWallet?.currency || ""}</span></p>
        <Button onClick={submit} className="w-full" disabled={saving}>{saving ? t("common.loading") : t("transfer.confirm")}</Button>
      </Card>
      )}
    </div>
  );
}
