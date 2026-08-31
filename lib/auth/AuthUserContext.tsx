"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type AuthUserState = {
  /** Supabase env vars present (SDK may not be loaded yet). */
  configured: boolean;
  loading: boolean;
  userId: string | null;
};

export const DEFAULT_AUTH_USER: AuthUserState = {
  configured: Boolean(getSupabasePublicConfig()),
  loading: false,
  userId: null,
};

const AuthUserContext = createContext<AuthUserState>(DEFAULT_AUTH_USER);

export function AuthUserProvider({
  value,
  children,
}: {
  value: AuthUserState;
  children: ReactNode;
}) {
  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): AuthUserState {
  return useContext(AuthUserContext);
}
