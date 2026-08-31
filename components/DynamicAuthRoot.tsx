"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { AuthUserProvider, DEFAULT_AUTH_USER } from "@/lib/auth/AuthUserContext";
import { hasSupabaseSessionHint } from "@/lib/supabase/sessionHint";

type AuthProvidersComponent = ComponentType<{ children: ReactNode }>;

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.replace(/\/$/, "") || "/";
  return p === "/sign-in" || p === "/account" || p.startsWith("/auth");
}

type Props = {
  children: ReactNode;
};

/**
 * Loads `@supabase/supabase-js` only when needed:
 * - immediately on sign-in / account / auth callback routes
 * - on idle when a persisted session exists (returning signed-in users)
 * Anonymous browse pages skip the SDK entirely.
 */
export function DynamicAuthRoot({ children }: Props) {
  const pathname = usePathname();
  const authRoute = isAuthRoute(pathname);
  const [Providers, setProviders] = useState<AuthProvidersComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const mod = await import("@/components/AuthProviders");
      if (!cancelled) {
        setProviders(() => mod.AuthProviders);
      }
    };

    if (authRoute || hasSupabaseSessionHint()) {
      void load();
      return () => {
        cancelled = true;
      };
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(
        () => {
          if (hasSupabaseSessionHint()) void load();
        },
        { timeout: 8000 },
      );
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(() => {
      if (hasSupabaseSessionHint()) void load();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authRoute, pathname]);

  if (Providers) {
    return <Providers>{children}</Providers>;
  }

  const fallback = authRoute
    ? { ...DEFAULT_AUTH_USER, loading: true }
    : DEFAULT_AUTH_USER;

  return <AuthUserProvider value={fallback}>{children}</AuthUserProvider>;
}
