import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { getMe } from "@/api/auth";

export function useCurrentUser() {
  const { token, user, setUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      getMe().then(setUser).catch(() => {});
    }
  }, [token, user, setUser]);

  return user;
}
