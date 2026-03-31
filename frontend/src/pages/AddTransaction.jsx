import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

export default function AddTransaction() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ wallet_id: "", type: "expense", amount: "", note: "", category_id: "" });
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
    if (!form.wallet_id || !form.amount) {
      setError("Please fill all required fields");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await api.createTransaction({ ...form, amount: Number(Number(form.amount).toFixed(4)), category_id: form.category_id || null });
      navigate("/");
    } catch {
      setError("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };
  const filteredCategories = categories.filter((c) => c.type === "both" || c.type === form.type);

  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">Add Transaction</h1>
      {loading ? (
        <Skeleton className="h-60" />
      ) : (
        <Card className="space-y-3">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <Select value={form.wallet_id} onChange={(e) => setForm((s) => ({ ...s, wallet_id: e.target.value }))}>
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
          </Select>
          <Select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="income">income</option>
            <option value="expense">expense</option>
          </Select>
          <Select value={form.category_id} onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}>
            <option value="">No category</option>
            {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name_lo || c.name_en}</option>)}
          </Select>
          <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
          <Input placeholder="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          <Button onClick={submit} className="w-full" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </Card>
      )}
    </div>
  );
}
