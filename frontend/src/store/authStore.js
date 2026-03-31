import { create } from "zustand";
import { api } from "../lib/api";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  login: async () => {
    try {
      set({ loading: true, error: null });
      const { user } = await api.login();
      set({ user, loading: false });
    } catch (e) {
      set({ error: e.error || "Login failed", loading: false });
    }
  },
}));
