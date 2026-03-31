import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useWallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const d = await api.getWallets();
    setWallets([...(d.owned || []), ...(d.shared || [])]);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);
  return { wallets, loading, reload };
}
