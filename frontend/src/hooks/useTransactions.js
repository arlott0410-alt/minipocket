import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useTransactions(params = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = async (nextParams = params) => {
    setLoading(true);
    const d = await api.getTransactions(nextParams);
    setTransactions(d.transactions || []);
    setLoading(false);
  };
  useEffect(() => {
    reload(params);
  }, []);
  return { transactions, loading, reload };
}
