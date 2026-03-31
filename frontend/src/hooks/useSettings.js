import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getSettings().then((d) => {
      setSettings(Object.fromEntries((d.settings || []).map((s) => [s.key, s.value])));
      setLoading(false);
    });
  }, []);
  return { settings, loading };
}
