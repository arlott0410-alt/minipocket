import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";

import Card from "../components/ui/Card";

export default function HowToPay() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings || {}));
  }, []);

  return (
    <div className="page-shell">
      <h1 className="page-title">{t("payment.title")}</h1>
      {!settings ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <Card className="space-y-2 lg:max-w-2xl">
          <p><span className="font-semibold">{t("payment.bank")}:</span> {settings.payment_bank_name || "-"}</p>
          <p><span className="font-semibold">{t("payment.account_number")}:</span> {settings.payment_account_number || "-"}</p>
          <p><span className="font-semibold">{t("payment.account_name")}:</span> {settings.payment_account_name || "-"}</p>
          <p className="mt-2 text-sm text-amber-200/80">{settings.payment_instructions || "-"}</p>
        </Card>
      )}
    </div>
  );
}
