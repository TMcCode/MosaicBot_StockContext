"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

type SupabaseAuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}

export function useOptionalSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    return {
      configured: false,
      loading: false,
      session: null,
      user: null,
      signOut: async () => {},
    };
  }
  return ctx;
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const configured = useMemo(() => Boolean(getSupabasePublicConfig()), []);
  const client = useMemo(() => getBrowserSupabase(), [configured]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let unsub: { subscription: { unsubscribe: () => void } } | undefined;

    void client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    unsub = data;

    return () => unsub?.subscription.unsubscribe();
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    setSession(null);
  }, [client]);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      signOut,
    }),
    [configured, loading, session, signOut],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}
