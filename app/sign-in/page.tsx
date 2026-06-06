"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { authCallbackAbsoluteUrl, AUTH_DEFAULT_NEXT_PATH, sanitizeAuthNextPath } from "@/lib/authRedirect";
import { href } from "@/lib/links";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

import styles from "../auth/auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const { configured, loading, user } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState(AUTH_DEFAULT_NEXT_PATH);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = sanitizeAuthNextPath(new URLSearchParams(window.location.search).get("next"));
    if (next) {
      setReturnPath(next);
    }
  }, []);

  useEffect(() => {
    if (!configured || loading) return;
    if (user) {
      router.replace(returnPath);
    }
  }, [configured, loading, user, router, returnPath]);

  if (!configured) {
    return (
      <section className="card">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Account</p>
          <h1 className={styles.title}>Sign in unavailable</h1>
          <p className={styles.copy}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            (same project as stockthemes.ai).
          </p>
          <p className={styles.footer}>
            <Link href={href("/")}>← Home</Link>
          </p>
        </div>
      </section>
    );
  }

  if (loading || user) {
    return (
      <section className="card">
        <p className={styles.copy}>{user ? "Redirecting…" : "Loading…"}</p>
      </section>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const redirectTo = authCallbackAbsoluteUrl(returnPath);
    if (!redirectTo) {
      setError("Could not determine callback URL.");
      return;
    }
    setBusy(true);
    try {
      const trimmed = email.trim();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setMessage("Check your inbox — open the link to sign in (same account as stockthemes.ai).");
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Sign in</p>
        <h1 className={styles.title}>Stock Context</h1>
        <p className={styles.copy}>
          Use the same email as <strong>stockthemes.ai</strong>. We&apos;ll send a one-time magic link — no
          password. Read state syncs across your devices.
        </p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label htmlFor="sign-in-email">
            <span className={styles.copy} style={{ display: "block", marginBottom: 6 }}>
              Email
            </span>
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              disabled={busy}
              className={styles.input}
            />
          </label>
          <button type="submit" disabled={busy} className={styles.submit}>
            {busy ? "Sending…" : "Email me a secure link"}
          </button>
        </form>

        {message ? <p className={styles.messageOk}>{message}</p> : null}
        {error ? <p className={styles.messageErr}>{error}</p> : null}

        <p className={`${styles.footer} muted`}>
          <Link href={href("/")}>Home</Link>
        </p>
      </div>
    </section>
  );
}
