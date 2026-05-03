import { Role } from "@/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  token: string | null;
  role: Role | null;
  userId: number | null;
  username: string | null;
  isLoggedIn: boolean;
};

type Action = {
  signIn: (token: string, role: Role, userId: number, username: string) => void;
  logout: () => void;
};

export const useAuthStore = create<State & Action>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      userId: null,
      username: null,
      isLoggedIn: false,
      signIn: (token: string, role: Role, userId: number, username: string) => {
        set({ token, role, userId, username, isLoggedIn: true });
      },
      logout: () => {
        set({ token: null, role: null, userId: null, username: null, isLoggedIn: false });
      },
    }),
    { name: "session" },
  ),
);
