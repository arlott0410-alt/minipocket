import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function AddTransaction() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ wallet_id: "", type: "expense", amount: "", note: "" });
  const [wallets, setWallets] = useState([]);
  useEffect(() => {
    api.getWallets().then((d) => {
      const all = [...(d.owned || []), ...(d.shared || [])];
      setWallets(all);
      if (all[0]) setForm((s) => ({ ...s, wallet_id: all[0].id }));
    });
  }, []);
  const submit = async () => {
    await api.createTransaction({ ...form, amount: Number(Number(form.amount).toFixed(4)) });
    navigate("/");
  };
  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-xl font-bold">Add Transaction</h1>
      <select className="w-full border rounded-xl px-3 py-2" value={form.wallet_id} onChange={(e) => setForm((s) => ({ ...s, wallet_id: e.target.value }))}>
        {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
      </select>
      <select className="w-full border rounded-xl px-3 py-2" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}><option value="income">income</option><option value="expense">expense</option></select>
      <input type="number" className="w-full border rounded-xl px-3 py-2" placeholder="Amount" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
      <input className="w-full border rounded-xl px-3 py-2" placeholder="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
      <button onClick={submit} className="w-full rounded-xl bg-indigo-600 text-white py-2">Save</button>
    </div>
  );
}
