"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { resolveAuthNextPath } from "@/lib/authRedirect";
import { href } from "@/lib/links";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";
import { exchangePkceCodeOnce } from "@/lib/supabase/exchangePkceCodeOnce";

import styles from "../auth.module.css";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function run() {
      try {
        const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const code = url?.searchParams.get("code");
        const next = resolveAuthNextPath(url?.searchParams.get("next") ?? null);

        if (code) {
          const { data: before } = await client.auth.getSession();
          if (before.session) {
            if (!cancelled) {
              router.replace(next);
            }
            return;
          }

          const { error: ex } = await exchangePkceCodeOnce(client, code);
          if (ex) {
            if (!cancelled) setError(ex.message);
            return;
          }
        } else {
          const { error: sessErr } = await client.auth.getSession();
          if (sessErr && !cancelled) {
            setError(sessErr.message || "Unable to restore session.");
            return;
          }
        }

        if (!cancelled) {
          router.replace(next);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="card">
      <div className={styles.wrap}>
        {!error ? (
          <>
            <h1 className={styles.title}>Finishing sign-in…</h1>
            <p className={styles.copy}>You&apos;ll be redirected in a moment.</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Sign-in issue</h1>
            <p className={styles.messageErr}>{error}</p>
            <p className={styles.footer}>
              <Link href={href("/sign-in")}>Try again</Link>
              {" · "}
              <Link href={href("/")}>Home</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
