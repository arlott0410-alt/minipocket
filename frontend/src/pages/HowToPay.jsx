import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";

export default function HowToPay() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings || {}));
  }, []);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-xl font-bold">{t("payment.title")}</h1>
      {!settings ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-2">
          <p><span className="font-semibold">{t("payment.bank")}:</span> {settings.payment_bank_name || "-"}</p>
          <p><span className="font-semibold">{t("payment.account_number")}:</span> {settings.payment_account_number || "-"}</p>
          <p><span className="font-semibold">{t("payment.account_name")}:</span> {settings.payment_account_name || "-"}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{settings.payment_instructions || "-"}</p>
        </div>
      )}
    </div>
  );
}
