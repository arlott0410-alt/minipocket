import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const d = await api.getTransfers();
    setTransfers(d.transfers || []);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);
  return { transfers, loading, reload };
}
