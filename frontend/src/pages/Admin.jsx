import { useEffect, useState } from "react";
import { api, clearAdminAccessToken, setAdminAccessToken } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useTranslation } from "react-i18next";

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

const HIDDEN_SETTING_KEYS = new Set([
  "payment_bank_name",
  "payment_account_number",
  "payment_account_name",
  "payment_instructions",
  "broadcast_message",
  "broadcast_image_url",
]);

export default function Admin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name_lo: "",
    name_th: "",
    name_en: "",
    type: "both",
    emoji: "📝",
    sort_order: 0,
  });
  const [logs, setLogs] = useState([]);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcastForm, setBroadcastForm] = useState({
    target: "all",
    message: "",
    image_url: "",
  });
  const [tab, setTab] = useState("settings");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryForm, setEditCategoryForm] = useState({
    name_lo: "",
    name_th: "",
    name_en: "",
    type: "both",
    emoji: "📝",
    sort_order: 0,
  });

  const formatSettingLabel = (key) => t(`admin.settings_keys.${key}`, { defaultValue: key });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [s, u, c, b] = await Promise.all([
        api.adminGetSettings(),
        api.adminGetUsers(),
        api.adminGetCategories(),
        api.adminGetBroadcastLogs(),
      ]);
      const settingMap = Object.fromEntries((s.settings || []).map((x) => [x.key, x.value]));
      setSettings(settingMap);
      setUsers(u.users || []);
      setCategories(c.categories || []);
      setBroadcastLogs(b.logs || []);
      setBroadcastForm((prev) => ({
        ...prev,
        message: prev.message || (settingMap.broadcast_message || ""),
        image_url: prev.image_url || (settingMap.broadcast_image_url || ""),
      }));
      if (tab === "audit") {
        const l = await api.adminGetAuditLogs();
        setLogs(l.logs || []);
      }
      setError("");
    } catch {
      setError(t("admin.errors.forbidden"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthed) return;
    loadDashboard();
  }, [adminAuthed, tab]);

  const signIn = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await api.adminLogin({ email, password });
      if (!res?.access_token) throw new Error("no-token");
      setAdminAccessToken(res.access_token);
      setAdminAuthed(true);
    } catch (e) {
      setError(t("admin.errors.invalid_credentials"));
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
      setError(t("admin.errors.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const sendBroadcast = async () => {
    const message = (broadcastForm.message || "").trim();
    if (!message) {
      setError(t("admin.broadcast.message_required"));
      return;
    }
    setSaving(true);
    setError("");
    setBroadcastResult(null);
    try {
      const res = await api.adminSendBroadcast({
        target: broadcastForm.target,
        message,
        image_url: (broadcastForm.image_url || "").trim(),
      });
      setBroadcastResult(res);
      setSettings((s) => ({
        ...s,
        broadcast_message: message,
        broadcast_image_url: (broadcastForm.image_url || "").trim(),
      }));
      await api.adminSaveSettings({
        broadcast_message: message,
        broadcast_image_url: (broadcastForm.image_url || "").trim(),
      });
      await loadDashboard();
    } catch (e) {
      setError(e?.error || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const setUserPaid = async (userId, isPaid, planDurationDays = null) => {
    setSaving(true);
    setError("");
    try {
      if (planDurationDays) {
        await api.adminUpdateUser(userId, { plan_duration_days: planDurationDays });
      } else {
        await api.adminUpdateUser(userId, { is_paid: isPaid, paid_until: null });
      }
      await loadDashboard();
    } catch {
      setError(t("admin.errors.user_update_failed"));
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    if (!newCategory.name_lo || !newCategory.name_th || !newCategory.name_en) {
      setError(t("common.fill_all"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.adminCreateCategory({
        ...newCategory,
        sort_order: Number(newCategory.sort_order || 0),
      });
      setNewCategory({ name_lo: "", name_th: "", name_en: "", type: "both", emoji: "📝", sort_order: 0 });
      await loadDashboard();
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryActive = async (cat) => {
    setSaving(true);
    setError("");
    try {
      await api.adminUpdateCategory(cat.id, { is_active: !cat.is_active });
      await loadDashboard();
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCategoryForm({
      name_lo: cat.name_lo || "",
      name_th: cat.name_th || cat.name_en || "",
      name_en: cat.name_en || "",
      type: cat.type || "both",
      emoji: cat.emoji || "📝",
      sort_order: Number(cat.sort_order || 0),
    });
  };

  const saveEditCategory = async () => {
    if (!editingCategory) return;
    if (!editCategoryForm.name_lo || !editCategoryForm.name_th || !editCategoryForm.name_en) {
      setError(t("common.fill_all"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.adminUpdateCategory(editingCategory.id, {
        ...editCategoryForm,
        sort_order: Number(editCategoryForm.sort_order || 0),
      });
      setEditingCategory(null);
      await loadDashboard();
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-amber-100">{t("admin.title")}</h1>

      {!adminAuthed ? (
        <Card className="space-y-3">
          <p className="label">{t("admin.login.title")}</p>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("admin.login.email")} />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("admin.login.password")} />
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
          <Button onClick={signIn} className="w-full" disabled={saving}>
            {saving ? t("admin.login.signing_in") : t("admin.login.sign_in")}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.login.hint")}</p>
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
                {t("admin.tabs.settings")}
              </Button>
              <Button variant={tab === "users" ? "primary" : "secondary"} size="sm" onClick={() => setTab("users")}>
                {t("admin.tabs.users")}
              </Button>
              <Button variant={tab === "categories" ? "primary" : "secondary"} size="sm" onClick={() => setTab("categories")}>
                {t("admin.tabs.categories")}
              </Button>
              <Button variant={tab === "audit" ? "primary" : "secondary"} size="sm" onClick={() => setTab("audit")}>
                {t("admin.tabs.audit")}
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
              {t("admin.logout")}
            </Button>
          </div>

          {tab === "settings" ? (
            <Card className="space-y-3">
              <p className="section-title">{t("admin.settings_title")}</p>
              {Object.entries(settings).filter(([key]) => !HIDDEN_SETTING_KEYS.has(key)).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{formatSettingLabel(key)}</label>
                  {key === "primary_color" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={value || "#6366f1"}
                          onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                          className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                          aria-label={t("admin.primary_color_picker")}
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

              <div className="mt-2 rounded-2xl border border-amber-500/25 bg-neutral-900/50 p-3 space-y-3">
                <p className="section-title">{t("admin.broadcast.title")}</p>
                <p className="text-xs text-amber-200/70">{t("admin.broadcast.hint")}</p>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t("admin.broadcast.target_label")}</label>
                  <select
                    value={broadcastForm.target}
                    onChange={(e) => setBroadcastForm((s) => ({ ...s, target: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">{t("admin.broadcast.target_all")}</option>
                    <option value="paid">{t("admin.broadcast.target_paid")}</option>
                    <option value="free">{t("admin.broadcast.target_free")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t("admin.broadcast.message_label")}</label>
                  <textarea
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm((s) => ({ ...s, message: e.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder={t("admin.broadcast.message_placeholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">{t("admin.broadcast.image_url_label")}</label>
                  <Input
                    value={broadcastForm.image_url}
                    onChange={(e) => setBroadcastForm((s) => ({ ...s, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={sendBroadcast} disabled={saving} className="w-full">
                  {saving ? t("admin.saving") : t("admin.broadcast.send")}
                </Button>
                {broadcastResult ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">
                    {t("admin.broadcast.result", {
                      total: broadcastResult.total_users || 0,
                      sent: broadcastResult.sent_count || 0,
                      failed: broadcastResult.failed_count || 0,
                    })}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="label">{t("admin.broadcast.history_title")}</p>
                  {(broadcastLogs || []).length === 0 ? (
                    <p className="text-xs text-amber-200/70">{t("admin.broadcast.history_empty")}</p>
                  ) : (
                    (broadcastLogs || []).slice(0, 5).map((row) => (
                      <div key={row.id} className="surface-muted p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-amber-100">{row.target}</p>
                          <p className="text-[11px] text-amber-200/70">{new Date(row.created_at).toLocaleString()}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-200/80">{t("admin.broadcast.result", { total: row.total_users, sent: row.sent_count, failed: row.failed_count })}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button onClick={save} className="w-full" disabled={saving}>
                {saving ? t("admin.saving") : t("common.save")}
              </Button>
            </Card>
          ) : tab === "users" ? (
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-100">{u.first_name} {u.last_name || ""}</p>
                    <p className="text-xs text-amber-200/70">@{u.username || u.telegram_id}</p>
                    {u.paid_until && (
                      <p className="text-xs text-amber-300/90">{t("admin.users.paid_until")} {new Date(u.paid_until).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button size="sm" disabled={saving} onClick={() => setUserPaid(u.id, true, 30)}>{t("admin.users.plan_1m")}</Button>
                    <Button size="sm" disabled={saving} onClick={() => setUserPaid(u.id, true, 180)}>{t("admin.users.plan_6m")}</Button>
                    <Button size="sm" disabled={saving} onClick={() => setUserPaid(u.id, true, 365)}>{t("admin.users.plan_1y")}</Button>
                    <Button variant="secondary" size="sm" disabled={saving} onClick={() => setUserPaid(u.id, false, null)}>{t("admin.users.set_free")}</Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : tab === "categories" ? (
            <Card className="space-y-4">
              <p className="section-title text-amber-100">{t("admin.categories.title")}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t("admin.categories.name_lo")} value={newCategory.name_lo} onChange={(e) => setNewCategory((s) => ({ ...s, name_lo: e.target.value }))} />
                <Input placeholder={t("admin.categories.name_th")} value={newCategory.name_th} onChange={(e) => setNewCategory((s) => ({ ...s, name_th: e.target.value }))} />
                <Input placeholder={t("admin.categories.name_en")} value={newCategory.name_en} onChange={(e) => setNewCategory((s) => ({ ...s, name_en: e.target.value }))} />
                <Input placeholder={t("admin.categories.emoji")} value={newCategory.emoji} onChange={(e) => setNewCategory((s) => ({ ...s, emoji: e.target.value }))} />
                <select
                  value={newCategory.type}
                  onChange={(e) => setNewCategory((s) => ({ ...s, type: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="income">{t("transaction.type_income")}</option>
                  <option value="expense">{t("transaction.type_expense")}</option>
                  <option value="both">{t("admin.categories.type_both")}</option>
                </select>
              </div>
              <Button onClick={createCategory} disabled={saving} className="w-full">{t("wallet.add")}</Button>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="surface-muted p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-100">{cat.emoji} {cat.name_lo} / {cat.name_th || cat.name_en} / {cat.name_en}</p>
                      <p className="text-xs text-amber-200/70">{t("admin.categories.type_label")} {cat.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => openEditCategory(cat)}>
                        {t("admin.categories.edit")}
                      </Button>
                      <Button variant={cat.is_active ? "secondary" : "primary"} size="sm" disabled={saving} onClick={() => toggleCategoryActive(cat)}>
                        {cat.is_active ? t("admin.categories.disable") : t("admin.categories.enable")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="section-title text-amber-100">{t("admin.audit.title")}</p>
              {logs.length === 0 ? (
                <p className="text-sm text-amber-200/70">{t("admin.audit.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="surface-muted p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-amber-100">{log.action}</p>
                        <p className="text-xs text-amber-200/70">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-amber-200/70">{log.admin_email}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} panelClassName="max-h-[80vh] overflow-y-auto border border-amber-500/30 bg-neutral-950 p-4 text-amber-100">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-100">{t("admin.categories.edit_title")}</h3>
          <Input placeholder={t("admin.categories.name_lo")} value={editCategoryForm.name_lo} onChange={(e) => setEditCategoryForm((s) => ({ ...s, name_lo: e.target.value }))} />
          <Input placeholder={t("admin.categories.name_th")} value={editCategoryForm.name_th} onChange={(e) => setEditCategoryForm((s) => ({ ...s, name_th: e.target.value }))} />
          <Input placeholder={t("admin.categories.name_en")} value={editCategoryForm.name_en} onChange={(e) => setEditCategoryForm((s) => ({ ...s, name_en: e.target.value }))} />
          <Input placeholder={t("admin.categories.emoji")} value={editCategoryForm.emoji} onChange={(e) => setEditCategoryForm((s) => ({ ...s, emoji: e.target.value }))} />
          <select
            value={editCategoryForm.type}
            onChange={(e) => setEditCategoryForm((s) => ({ ...s, type: e.target.value }))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="income">{t("transaction.type_income")}</option>
            <option value="expense">{t("transaction.type_expense")}</option>
            <option value="both">{t("admin.categories.type_both")}</option>
          </select>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingCategory(null)}>{t("common.cancel")}</Button>
            <Button className="flex-1" disabled={saving} onClick={saveEditCategory}>{saving ? t("admin.saving") : t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
