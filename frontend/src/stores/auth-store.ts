import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  token: string | null;
  isLoggedIn: boolean;
};

type Action = {
  signIn: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<State & Action>()(
  persist(
    (set) => ({
      token: null,
      isLoggedIn: false,
      signIn: (token: string) => {
        set({ token, isLoggedIn: true });
      },
      logout: () => {
        set({ token: null, isLoggedIn: false });
      },
    }),
    { name: "session" },
  ),
);
