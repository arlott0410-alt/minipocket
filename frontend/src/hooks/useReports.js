import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useReports({ period = "month", date, walletId = "" }) {
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, c, by] = await Promise.all([
        api.getSummary({ period, date, wallet_id: walletId }),
        api.getChart({ period, date, wallet_id: walletId }),
        api.getByCategory({ period, date, type: "expense", wallet_id: walletId }),
      ]);
      setSummary(s);
      setChart(c.chart || []);
      setCategories(by.categories || []);
      setLoading(false);
    };
    load();
  }, [period, date, walletId]);
  return { summary, chart, categories, loading };
}
