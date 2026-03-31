import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useReports(month) {
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, c, by] = await Promise.all([api.getSummary(month), api.getChart(6), api.getByCategory(month, "expense")]);
      setSummary(s);
      setChart(c.chart || []);
      setCategories(by.categories || []);
      setLoading(false);
    };
    load();
  }, [month]);
  return { summary, chart, categories, loading };
}
