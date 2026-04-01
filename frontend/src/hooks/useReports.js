import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useReports({ period = "month", date, walletId = "" }) {
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [chartByCurrency, setChartByCurrency] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoriesByCurrency, setCategoriesByCurrency] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const bundle = await api.getReportsBundle({ period, date, type: "expense", wallet_id: walletId });
      setSummary(bundle.summary || null);
      setChart(bundle.chart?.chart || []);
      setChartByCurrency(bundle.chart?.chart_by_currency || {});
      setCategories(bundle.by_category?.categories || []);
      setCategoriesByCurrency(bundle.by_category?.categories_by_currency || {});
      setLoading(false);
    };
    load();
  }, [period, date, walletId]);
  return { summary, chart, chartByCurrency, categories, categoriesByCurrency, loading };
}
