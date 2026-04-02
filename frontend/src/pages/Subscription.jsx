import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";
import Card from "../components/ui/Card";

export default function Subscription() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((s) => setSettings(s.settings || {}));
  }, []);

  return (
    <div className="page-shell">
      <h1 className="page-title">{t("subscription.title")}</h1>
      {!settings ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-2">
            <p className="text-sm text-amber-200/70">{t("subscription.monthly_price")}</p>
            <p className="text-2xl font-bold text-amber-200">{Number(settings.subscription_price_lak || 0).toLocaleString()} LAK</p>
            <p className="text-sm text-amber-100">{t("subscription.trial_days", { days: settings.free_trial_days })}</p>
            <p className="text-sm text-amber-100">{t("subscription.status")}: {user?.is_paid ? t("subscription.status_premium") : t("subscription.status_free")}</p>
            {user?.paid_until && <p className="text-sm text-amber-100">{t("subscription.paid_until")} {new Date(user.paid_until).toLocaleDateString()}</p>}
          </Card>

          <Card className="space-y-3">
            <p className="label">{t("subscription.contact_title")}</p>
            <p className="text-sm text-amber-100">
              {t("subscription.contact_desc")}
            </p>
            <div className="surface-muted p-3 text-sm space-y-1 text-amber-100">
              <p><span className="text-amber-300/70">{t("subscription.contact_name")}:</span> {settings.admin_contact_name || t("subscription.default_admin")}</p>
              <p><span className="text-amber-300/70">{t("subscription.contact_telegram")}:</span> {settings.admin_contact_telegram || "-"}</p>
              <p><span className="text-amber-300/70">{t("subscription.contact_phone")}:</span> {settings.admin_contact_phone || "-"}</p>
              {settings.admin_contact_note && <p className="text-amber-200/80">{settings.admin_contact_note}</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
