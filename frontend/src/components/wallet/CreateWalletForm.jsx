import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Modal from "../ui/Modal";

export default function CreateWalletForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", currency: "LAK", color: "#6366f1", icon: "💰" });
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api.getMeta().then((m) => {
      setCurrencies(m.currencies || []);
      if (m.currencies?.[0]?.code) setForm((s) => ({ ...s, currency: m.currencies[0].code }));
    });
  }, []);
  const submit = async () => {
    try {
      await api.createWallet(form);
      onCreated?.();
      onClose?.();
    } catch (e) {
      setError(e.error || "ບໍ່ສາມາດສ້າງກະເປົ໋າ");
    }
  };
  return (
    <Modal open onClose={onClose}>
      <div className="space-y-3">
        <h3 className="font-semibold">Create Wallet</h3>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <select className="w-full border rounded-xl px-3 py-2" value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}>
          {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
        </select>
        <button onClick={submit} className="w-full rounded-xl bg-indigo-600 text-white py-2">Save</button>
      </div>
    </Modal>
  );
}
