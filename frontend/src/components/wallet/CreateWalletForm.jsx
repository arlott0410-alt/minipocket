import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";

export default function CreateWalletForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", currency: "LAK", color: "#6366f1", icon: "💰" });
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMeta().then((m) => {
      setCurrencies(m.currencies || []);
      if (m.currencies?.[0]?.code) setForm((s) => ({ ...s, currency: m.currencies[0].code }));
    });
  }, []);

  const submit = async () => {
    if (!form.name?.trim()) {
      setError("ກະລຸນາໃສ່ຊື່ກະເປົ໋າ");
      return;
    }
    try {
      setSaving(true);
      await api.createWallet(form);
      onCreated?.();
      onClose?.();
    } catch (e) {
      setError(e.error || "ບໍ່ສາມາດສ້າງກະເປົ໋າ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} panelClassName="max-h-[80vh] overflow-hidden">
      <div className="relative flex max-h-[80vh] flex-col">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create Wallet</h3>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4 pb-24">
        {error && <p className="text-sm text-red-500">{error}</p>}
          <Input placeholder="Wallet Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Select value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}>
          {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </Select>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
