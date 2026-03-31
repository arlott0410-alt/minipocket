import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { formatAmountInput, parseAmountInput, precisionByCurrency } from "../lib/amount";
import { getCategoryDisplayName } from "../lib/category";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

export default function AddTransaction() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ wallet_id: "", type: "expense", amount: "", note: "", category_id: "" });
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedWallet = wallets.find((w) => w.id === form.wallet_id);
  const amountPrecision = precisionByCurrency(selectedWallet?.currency);
  useEffect(() => {
    Promise.all([api.getWallets(), api.getMeta()]).then(([d, m]) => {
      const all = [...(d.owned || []), ...(d.shared || [])];
      const cats = m.categories || [];
      setWallets(all);
      setCategories(cats);
      if (all[0]) setForm((s) => ({ ...s, wallet_id: all[0].id }));
      const firstCat = cats.find((c) => c.type === "both" || c.type === "expense");
      if (firstCat) setForm((s) => ({ ...s, category_id: firstCat.id }));
      setLoading(false);
    });
  }, []);
  const submit = async () => {
    const amountNumber = parseAmountInput(form.amount);
    if (!form.wallet_id || amountNumber <= 0) {
      setError(t("common.fill_all"));
      return;
    }
    try {
      setSaving(true);
      setError("");
      await api.createTransaction({ ...form, amount: Number(amountNumber.toFixed(amountPrecision)), category_id: form.category_id || null });
      navigate("/");
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };
  const filteredCategories = categories.filter((c) => c.type === "both" || c.type === form.type);

  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">{t("transaction.add_title")}</h1>
      {loading ? (
        <Skeleton className="h-60" />
      ) : (
        <Card className="space-y-3">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <Select value={form.wallet_id} onChange={(e) => setForm((s) => ({ ...s, wallet_id: e.target.value }))}>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
          </Select>
          <Select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="income">{t("transaction.type_income")}</option>
            <option value="expense">{t("transaction.type_expense")}</option>
          </Select>
          <Select value={form.category_id} onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}>
            <option value="">{t("transaction.category_none")}</option>
            {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {getCategoryDisplayName(c, i18n.language)}</option>)}
          </Select>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={t("common.amount")}
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: formatAmountInput(e.target.value, amountPrecision) }))}
          />
          <Input placeholder={t("common.note")} value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          <Button onClick={submit} className="w-full" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
        </Card>
      )}
    </div>
  );
}
