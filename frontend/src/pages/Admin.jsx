import { useEffect, useState } from "react";
import { api, setAdminAccessToken } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("settings");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminAuthed) return;
    setLoading(true);
    api
      .adminGetSettings()
      .then((s) => {
        setSettings(Object.fromEntries((s.settings || []).map((x) => [x.key, x.value])));
        return api.adminGetUsers();
      })
      .then((u) => {
        setUsers(u.users || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Forbidden");
        setLoading(false);
      });
  }, [adminAuthed]);

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
    } catch (e) {
      setError("ບໍ່ສາມາດບັນທຶກໄດ້");
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
          <div className="flex gap-2">
            <Button variant={tab === "settings" ? "primary" : "secondary"} size="sm" onClick={() => setTab("settings")}>
              Settings
            </Button>
            <Button variant={tab === "users" ? "primary" : "secondary"} size="sm" onClick={() => setTab("users")}>
              Users
            </Button>
          </div>

          {tab === "settings" ? (
            <Card className="space-y-3">
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{key}</label>
                  <Input value={value} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} />
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
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="surface-card rounded-2xl p-3 text-sm">
                  {u.first_name} @{u.username || u.telegram_id}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
