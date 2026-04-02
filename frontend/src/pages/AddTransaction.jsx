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
  const isTransferType = form.type === "transfer_in" || form.type === "transfer_out";

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

  const setTransactionType = (type) => {
    setForm((s) => {
      const next = { ...s, type };
      if (type === "transfer_in" || type === "transfer_out") {
        next.category_id = "";
      } else if (!s.category_id) {
        const first = categories.find((c) => c.type === "both" || c.type === type);
        if (first) next.category_id = first.id;
      }
      return next;
    });
  };

  const submit = async () => {
    const amountNumber = parseAmountInput(form.amount);
    if (!form.wallet_id || amountNumber <= 0) {
      setError(t("common.fill_all"));
      return;
    }
    try {
      setSaving(true);
      setError("");
      await api.createTransaction({
        wallet_id: form.wallet_id,
        type: form.type,
        amount: Number(amountNumber.toFixed(amountPrecision)),
        note: form.note,
        category_id: isTransferType ? null : form.category_id || null,
      });
      navigate("/");
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === "both" || c.type === form.type);

  const tileClass = (active, variant) => {
    const base = "rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50";
    if (!active) return `${base} border-amber-500/20 bg-neutral-900/60 text-amber-100/90 hover:border-amber-500/40`;
    if (variant === "income") return `${base} border-emerald-400/55 bg-emerald-950/35 text-emerald-100 shadow-inner shadow-emerald-900/20`;
    if (variant === "expense") return `${base} border-rose-400/50 bg-rose-950/30 text-rose-100 shadow-inner shadow-rose-900/20`;
    if (variant === "in") return `${base} border-sky-400/50 bg-sky-950/35 text-sky-100 shadow-inner shadow-sky-900/20`;
    return `${base} border-amber-400/50 bg-amber-950/40 text-amber-100 shadow-inner shadow-amber-900/20`;
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-2xl font-bold tracking-tight text-amber-100">{t("transaction.add_title")}</h1>
      {loading ? (
        <Skeleton className="h-60" />
      ) : (
        <Card className="space-y-4 border-amber-500/20 bg-neutral-950/80">
          {error && <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
          <div>
            <p className="label mb-2">{t("transfer.select_wallet")}</p>
            <Select value={form.wallet_id} onChange={(e) => setForm((s) => ({ ...s, wallet_id: e.target.value }))}>
              {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
            </Select>
          </div>

          <div>
            <p className="label mb-2">{t("transaction.type_group_records")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={tileClass(form.type === "income", "income")} onClick={() => setTransactionType("income")}>
                <span className="text-sm font-semibold">{t("transaction.type_income")}</span>
              </button>
              <button type="button" className={tileClass(form.type === "expense", "expense")} onClick={() => setTransactionType("expense")}>
                <span className="text-sm font-semibold">{t("transaction.type_expense")}</span>
              </button>
            </div>
          </div>

          <div>
            <p className="label mb-2">{t("transaction.type_group_transfers")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={tileClass(form.type === "transfer_in", "in")} onClick={() => setTransactionType("transfer_in")}>
                <span className="text-sm font-semibold">{t("transaction.type_transfer_in")}</span>
                <span className="mt-1 block text-[11px] leading-snug text-amber-200/55">+</span>
              </button>
              <button type="button" className={tileClass(form.type === "transfer_out", "out")} onClick={() => setTransactionType("transfer_out")}>
                <span className="text-sm font-semibold">{t("transaction.type_transfer_out")}</span>
                <span className="mt-1 block text-[11px] leading-snug text-amber-200/55">−</span>
              </button>
            </div>
          </div>

          {isTransferType ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-200/80">
              {t("transaction.transfer_flow_hint")}
            </div>
          ) : (
            <div>
              <p className="label mb-2">{t("transaction.category_label")}</p>
              <Select value={form.category_id} onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}>
                <option value="">{t("transaction.category_none")}</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {getCategoryDisplayName(c, i18n.language)}</option>)}
              </Select>
            </div>
          )}

          <div>
            <p className="label mb-2">{t("common.amount")}</p>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={t("common.amount")}
              value={form.amount}
              onChange={(e) => setForm((s) => ({ ...s, amount: formatAmountInput(e.target.value, amountPrecision) }))}
            />
          </div>
          <div>
            <p className="label mb-2">{t("common.note")}</p>
            <Input placeholder={t("common.note")} value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          </div>
          <Button onClick={submit} className="w-full" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
        </Card>
      )}
    </div>
  );
}
