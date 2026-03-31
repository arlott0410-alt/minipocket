import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useReports(month, walletId = "") {
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, c, by] = await Promise.all([
        api.getSummary(month, walletId),
        api.getChart(6, walletId),
        api.getByCategory(month, "expense", walletId),
      ]);
      setSummary(s);
      setChart(c.chart || []);
      setCategories(by.categories || []);
      setLoading(false);
    };
    load();
  }, [month, walletId]);
  return { summary, chart, categories, loading };
}
