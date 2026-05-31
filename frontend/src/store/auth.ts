import { create } from "zustand";
import type { UserOut } from "@/api/auth";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  setToken: (token: string) => void;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserOut) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  user: null,
  setToken: (token) => {
    localStorage.setItem("access_token", token);
    set({ token });
  },
  setTokens: (access, refresh) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    set({ token: access, refreshToken: refresh });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ token: null, refreshToken: null, user: null });
  },
}));
