import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function Settings() {
  const { i18n, t } = useTranslation();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings || {}));
  }, []);

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const renderRemaining = () => {
    if (!user?.is_paid || !user?.paid_until) return t("settings.sub_remaining_free");
    const diffMs = new Date(user.paid_until).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t("settings.sub_remaining_expired");
    if (diffDays < 30) return t("settings.sub_remaining_days", { days: diffDays });
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return t("settings.sub_remaining_months_days", { months, days });
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
      <Card className="space-y-3">
        <p className="label">{t("settings.language")}</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant={i18n.language === "lo" ? "primary" : "secondary"} onClick={() => setLang("lo")} className="w-full">{t("settings.lang_lo")}</Button>
          <Button variant={i18n.language === "en" ? "primary" : "secondary"} onClick={() => setLang("en")} className="w-full">{t("settings.lang_en")}</Button>
          <Button variant={i18n.language === "th" ? "primary" : "secondary"} onClick={() => setLang("th")} className="w-full">{t("settings.lang_th")}</Button>
        </div>
      </Card>
      <Card className="space-y-2">
        <p className="label">{t("settings.sub_remaining_title")}</p>
        <p className="text-sm text-slate-700 dark:text-slate-200">{renderRemaining()}</p>
      </Card>
      <Card className="space-y-3">
        <p className="label">{t("subscription.contact_title")}</p>
        <div className="surface-muted p-3 text-sm space-y-1">
          <p><span className="text-slate-500">{t("subscription.contact_name")}:</span> {settings?.admin_contact_name || t("subscription.default_admin")}</p>
          <p><span className="text-slate-500">{t("subscription.contact_telegram")}:</span> {settings?.admin_contact_telegram || "-"}</p>
          <p><span className="text-slate-500">{t("subscription.contact_phone")}:</span> {settings?.admin_contact_phone || "-"}</p>
          {settings?.admin_contact_note ? <p className="text-slate-600 dark:text-slate-300">{settings.admin_contact_note}</p> : null}
        </div>
      </Card>
    </div>
  );
}
