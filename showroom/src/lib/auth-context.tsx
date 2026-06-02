import { createContext, useContext } from "react";

type AuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  authState: AuthState;
  setAuthState: (state: "authenticated" | "unauthenticated") => void;
}

export const AuthContext = createContext<AuthContextValue>({
  authState: "loading",
  setAuthState: () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}
