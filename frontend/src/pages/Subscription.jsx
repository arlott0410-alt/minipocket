import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";
import Card from "../components/ui/Card";

export default function Subscription() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((s) => setSettings(s.settings || {}));
  }, []);

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
            <p className="label">Contact Admin for subscription upgrade</p>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              ລະບົບນີ້ປັບປຸງເປັນການຕໍ່ອາຍຸຜ່ານແອດມິນເທົ່ານັ້ນ. ກະລຸນາຕິດຕໍ່ແອດມິນຕາມຊ່ອງທາງຂ້າງລຸ່ມ.
            </p>
            <div className="surface-muted p-3 text-sm space-y-1">
              <p><span className="text-slate-500">Contact:</span> {settings.admin_contact_name || "Admin"}</p>
              <p><span className="text-slate-500">Telegram:</span> {settings.admin_contact_telegram || "-"}</p>
              <p><span className="text-slate-500">Phone:</span> {settings.admin_contact_phone || "-"}</p>
              {settings.admin_contact_note && <p className="text-slate-600 dark:text-slate-300">{settings.admin_contact_note}</p>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
