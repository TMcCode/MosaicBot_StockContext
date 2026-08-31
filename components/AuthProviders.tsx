"use client";

import { useMemo, type ReactNode } from "react";

import { SupabaseAuthProvider, useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { AuthUserProvider, type AuthUserState } from "@/lib/auth/AuthUserContext";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function AuthUserBridge({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useOptionalSupabaseAuth();
  const value = useMemo<AuthUserState>(
    () => ({
      configured,
      loading,
      userId: user?.id ?? null,
    }),
    [configured, loading, user?.id],
  );
  return <AuthUserProvider value={value}>{children}</AuthUserProvider>;
}

/** Supabase SDK + auth session — load via `DynamicAuthRoot`, not root layout. */
export function AuthProviders({ children }: { children: ReactNode }) {
  const configured = useMemo(() => Boolean(getSupabasePublicConfig()), []);
  if (!configured) {
    return <AuthUserProvider value={{ configured: false, loading: false, userId: null }}>{children}</AuthUserProvider>;
  }
  return (
    <SupabaseAuthProvider>
      <AuthUserBridge>{children}</AuthUserBridge>
    </SupabaseAuthProvider>
  );
}
