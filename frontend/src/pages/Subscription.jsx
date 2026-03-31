import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Subscription() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ amount_lak: "", transfer_ref: "", note: "", slip_url: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.getSettings(), api.getMyPayments()])
      .then(([s, p]) => {
        setSettings(s.settings || {});
        setPayments(p.payments || []);
      });
  }, []);

  const submitPayment = async () => {
    if (!form.amount_lak) return setMessage("ກະລຸນາໃສ່ຈຳນວນເງິນ");
    setSaving(true);
    setMessage("");
    try {
      await api.createPaymentRequest({
        amount_lak: Number(form.amount_lak),
        transfer_ref: form.transfer_ref,
        note: form.note,
        slip_url: form.slip_url,
      });
      const latest = await api.getMyPayments();
      setPayments(latest.payments || []);
      setForm({ amount_lak: "", transfer_ref: "", note: "", slip_url: "" });
      setMessage("ສົ່ງຄຳຂໍກວດສອບການຈ່າຍແລ້ວ");
    } catch {
      setMessage("ສົ່ງຄຳຂໍບໍ່ສຳເລັດ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
      {!settings ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <>
          <Card className="space-y-2">
            <p className="text-sm text-slate-500">Monthly Price</p>
            <p className="text-2xl font-bold text-indigo-600">{Number(settings.subscription_price_lak || 0).toLocaleString()} LAK</p>
            <p className="text-sm">Trial: {settings.free_trial_days} days</p>
            <p className="text-sm">Status: {user?.is_paid ? "Premium" : "Free"}</p>
            {user?.paid_until && <p className="text-sm">Paid until: {new Date(user.paid_until).toLocaleDateString()}</p>}
          </Card>

          <Card className="space-y-3">
            <p className="label">Submit monthly payment</p>
            <Input type="number" placeholder="Amount (LAK)" value={form.amount_lak} onChange={(e) => setForm((s) => ({ ...s, amount_lak: e.target.value }))} />
            <Input placeholder="Transfer ref / Transaction ID" value={form.transfer_ref} onChange={(e) => setForm((s) => ({ ...s, transfer_ref: e.target.value }))} />
            <Input placeholder="Slip URL (optional)" value={form.slip_url} onChange={(e) => setForm((s) => ({ ...s, slip_url: e.target.value }))} />
            <Input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
            {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
            <Button onClick={submitPayment} className="w-full" disabled={saving}>{saving ? "Submitting..." : "Submit for review"}</Button>
          </Card>

          <Card className="space-y-2">
            <p className="label">Payment history</p>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payment requests yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="surface-muted p-3 text-sm">
                    <div className="flex justify-between">
                      <span>{Number(p.amount_lak || 0).toLocaleString()} LAK</span>
                      <span className="font-medium">{p.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
