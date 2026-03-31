import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { api } from "../lib/api";

export default function Settings() {
  const { i18n, t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings || {}));
  }, []);

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
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
      <Card className="space-y-3">
        <p className="label">{t("settings.app_logo")}</p>
        {settings?.app_logo_url ? (
          <div className="flex items-center gap-3">
            <img src={settings.app_logo_url} alt="App logo" className="h-12 w-12 rounded-xl object-cover border border-amber-500/30" />
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">{settings.app_logo_url}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.app_logo_empty")}</p>
        )}
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
