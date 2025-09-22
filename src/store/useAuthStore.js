import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create()(
  persist(
    (set) => ({
      user: {},
      token: null,
      setUser: (user) => set({ user: user }),
      setToken: (token) => set({ token }),
    }),
    {
      name: "auth",
    }
  )
);
