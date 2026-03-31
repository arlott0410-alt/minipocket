import { useEffect, useState } from "react";
import { api, clearAdminAccessToken, setAdminAccessToken } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";

const BRAND_PRESETS = [
  "#6366f1",
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#0f766e",
  "#059669",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
];

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("settings");
  const [paymentFilter, setPaymentFilter] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, u, p] = await Promise.all([
        api.adminGetSettings(),
        api.adminGetUsers(),
        api.adminGetPayments(paymentFilter),
      ]);
      setSettings(Object.fromEntries((s.settings || []).map((x) => [x.key, x.value])));
      setUsers(u.users || []);
      setPayments(p.payments || []);
      if (tab === "audit") {
        const l = await api.adminGetAuditLogs();
        setLogs(l.logs || []);
      }
      setError("");
    } catch {
      setError("Forbidden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthed) return;
    loadDashboard();
  }, [adminAuthed, paymentFilter, tab]);

  const signIn = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await api.adminLogin({ email, password });
      if (!res?.access_token) throw new Error("no-token");
      setAdminAccessToken(res.access_token);
      setAdminAuthed(true);
    } catch (e) {
      setError("ອີເມວ/ລະຫັດຜິດ");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.adminSaveSettings(settings);
      await loadDashboard();
    } catch (e) {
      setError("ບໍ່ສາມາດບັນທຶກໄດ້");
    } finally {
      setSaving(false);
    }
  };

  const reviewPayment = async (id, status) => {
    setSaving(true);
    setError("");
    try {
      await api.adminReviewPayment(id, { status });
      await loadDashboard();
    } catch {
      setError("ອັບເດດສະຖານະບໍ່ສຳເລັດ");
    } finally {
      setSaving(false);
    }
  };

  const setUserPaid = async (userId, isPaid) => {
    setSaving(true);
    setError("");
    try {
      const paid_until = isPaid ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      await api.adminUpdateUser(userId, { is_paid: isPaid, paid_until });
      await loadDashboard();
    } catch {
      setError("ອັບເດດ user ບໍ່ສຳເລັດ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>

      {!adminAuthed ? (
        <Card className="space-y-3">
          <p className="label">Login</p>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ລະຫັດ" />
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
          <Button onClick={signIn} className="w-full" disabled={saving}>
            {saving ? "Signing in..." : "ເຂົ້າສູ່ระบบ"}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">Admin ตั้งค่าเว็บได้เฉพาะผู้ที่ได้รับอนุญาตเท่านั้น</p>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant={tab === "settings" ? "primary" : "secondary"} size="sm" onClick={() => setTab("settings")}>
                Settings
              </Button>
              <Button variant={tab === "users" ? "primary" : "secondary"} size="sm" onClick={() => setTab("users")}>
                Users
              </Button>
              <Button variant={tab === "payments" ? "primary" : "secondary"} size="sm" onClick={() => setTab("payments")}>
                Payments
              </Button>
              <Button variant={tab === "audit" ? "primary" : "secondary"} size="sm" onClick={() => setTab("audit")}>
                Audit
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clearAdminAccessToken();
                setAdminAuthed(false);
              }}
            >
              Logout
            </Button>
          </div>

          {tab === "settings" ? (
            <Card className="space-y-3">
              <p className="section-title">App Settings</p>
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{key}</label>
                  {key === "primary_color" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={value || "#6366f1"}
                          onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                          className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                          aria-label="Primary color picker"
                        />
                        <Input
                          value={value}
                          onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                          placeholder="#6366f1"
                        />
                        <div className="h-11 min-w-16 rounded-lg border border-slate-200 dark:border-slate-700" style={{ backgroundColor: value || "#6366f1" }} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BRAND_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, [key]: preset }))}
                            className={`h-7 w-7 rounded-full border-2 transition ${value === preset ? "border-slate-900 dark:border-white scale-110" : "border-transparent hover:scale-105"}`}
                            style={{ backgroundColor: preset }}
                            aria-label={`Use preset color ${preset}`}
                            title={preset}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Input value={value} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} />
                  )}
                </div>
              ))}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </div>
              )}
              <Button onClick={save} className="w-full" disabled={saving}>
                {saving ? "Saving..." : "ບັນທຶກ"}
              </Button>
            </Card>
          ) : tab === "users" ? (
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{u.first_name} {u.last_name || ""}</p>
                    <p className="text-xs text-slate-500">@{u.username || u.telegram_id}</p>
                    {u.paid_until && <p className="text-xs text-indigo-500">paid until: {new Date(u.paid_until).toLocaleDateString()}</p>}
                  </div>
                  <Button
                    variant={u.is_paid ? "secondary" : "primary"}
                    size="sm"
                    disabled={saving}
                    onClick={() => setUserPaid(u.id, !u.is_paid)}
                  >
                    {u.is_paid ? "Set Free" : "Set Premium"}
                  </Button>
                </Card>
              ))}
            </div>
          ) : tab === "payments" ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-title">Monthly Payment Reviews</p>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payment requests.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="surface-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {(p.user?.first_name || "")} {(p.user?.last_name || "")} @{p.user?.username || p.user?.telegram_id}
                          </p>
                          <p className="text-xs text-slate-500">{Number(p.amount_lak || 0).toLocaleString()} LAK • {p.status}</p>
                        </div>
                        <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</p>
                      </div>
                      {p.transfer_ref && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Ref: {p.transfer_ref}</p>}
                      {p.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Note: {p.note}</p>}
                      {p.slip_url && (
                        <a className="mt-1 block text-xs text-indigo-600 hover:underline" href={p.slip_url} target="_blank" rel="noreferrer">
                          Open Slip URL
                        </a>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" disabled={saving || p.status === "approved"} onClick={() => reviewPayment(p.id, "approved")}>
                          Approve
                        </Button>
                        <Button variant="secondary" size="sm" disabled={saving || p.status === "rejected"} onClick={() => reviewPayment(p.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="section-title">Admin Audit Logs</p>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500">No logs available.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="surface-muted p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{log.action}</p>
                        <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{log.admin_email}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
