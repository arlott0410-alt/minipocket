import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import Skeleton from "../components/ui/Skeleton";
import { api } from "../lib/api";

export default function Subscription() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then((d) => setSettings(d.settings || {}));
  }, []);

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <h1 className="text-xl font-bold">Subscription</h1>
      {!settings ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-gray-500">Monthly Price</p>
          <p className="text-2xl font-bold text-indigo-600">{Number(settings.subscription_price_lak || 0).toLocaleString()} LAK</p>
          <p className="text-sm">Trial: {settings.free_trial_days} days</p>
          <p className="text-sm">Status: {user?.is_paid ? "Premium" : "Free"}</p>
          {user?.paid_until && <p className="text-sm">Paid until: {new Date(user.paid_until).toLocaleDateString()}</p>}
        </div>
      )}
    </div>
  );
}
